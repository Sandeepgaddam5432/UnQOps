import { type ActionFunctionArgs, json as baseJson } from '@remix-run/cloudflare';
import crypto from 'crypto';
import type { NetlifySiteInfo } from '~/types/netlify';
import {
  createDeploymentName,
  isSameOriginRequest,
  readJsonBody,
  RequestBodyTooLargeError,
  isValidProviderResourceId,
  isValidProviderToken,
  sanitizeDeploymentFiles,
} from '~/lib/api/deployment-security';

function json(data: unknown, init?: ResponseInit): Response {
  const headers = new Headers(init?.headers);
  headers.set('Cache-Control', 'private, no-store');
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Vary', 'Origin');

  return baseJson(data, { ...init, headers });
}

interface DeployRequestBody {
  siteId?: string;
  files?: Record<string, string>;
  chatId?: string;
  token?: string;
}

const MAX_DEPLOY_BODY_BYTES = 20_000_000;

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405, headers: { Allow: 'POST' } });
  }

  if (!isSameOriginRequest(request)) {
    return json({ error: 'Same-origin requests are required' }, { status: 403 });
  }

  if (request.headers.get('Content-Type')?.split(';', 1)[0].trim().toLowerCase() !== 'application/json') {
    return json({ error: 'Content-Type must be application/json' }, { status: 415 });
  }

  let parsedBody: unknown;

  try {
    parsedBody = await readJsonBody(request, MAX_DEPLOY_BODY_BYTES);
  } catch (error) {
    const isTooLarge = error instanceof RequestBodyTooLargeError;
    return json(
      { error: isTooLarge ? 'Deployment request is too large' : 'Invalid deployment request body' },
      { status: isTooLarge ? 413 : 400 },
    );
  }

  try {
    if (typeof parsedBody !== 'object' || parsedBody === null || Array.isArray(parsedBody)) {
      return json({ error: 'Invalid deployment request' }, { status: 400 });
    }

    const body = parsedBody as DeployRequestBody;
    const { siteId, token, chatId } = body;
    const files = sanitizeDeploymentFiles(body.files);

    if (!isValidProviderToken(token)) {
      return json({ error: 'Not connected to Netlify' }, { status: 401 });
    }

    if (
      !files ||
      (siteId !== undefined && !isValidProviderResourceId(siteId)) ||
      typeof chatId !== 'string' ||
      chatId.length === 0 ||
      chatId.length > 128
    ) {
      return json({ error: 'Invalid deployment files or metadata' }, { status: 400 });
    }

    let targetSiteId = siteId;
    let siteInfo: NetlifySiteInfo | undefined;

    // If no siteId provided, create a new site
    if (!targetSiteId) {
      const siteName = createDeploymentName(chatId);
      const createSiteResponse = await fetch('https://api.netlify.com/api/v1/sites', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: siteName,
          custom_domain: null,
        }),
      });

      if (!createSiteResponse.ok) {
        return json({ error: 'Failed to create site' }, { status: 400 });
      }

      const newSite = (await createSiteResponse.json()) as any;
      targetSiteId = newSite.id;
      siteInfo = {
        id: newSite.id,
        name: newSite.name,
        url: newSite.url,
        chatId,
      };
    } else {
      // Get existing site info
      if (targetSiteId) {
        const siteResponse = await fetch(`https://api.netlify.com/api/v1/sites/${targetSiteId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (siteResponse.ok) {
          const existingSite = (await siteResponse.json()) as any;
          siteInfo = {
            id: existingSite.id,
            name: existingSite.name,
            url: existingSite.url,
            chatId,
          };
        } else {
          targetSiteId = undefined;
        }
      }

      // If no siteId provided or site doesn't exist, create a new site
      if (!targetSiteId) {
        const siteName = createDeploymentName(chatId);
        const createSiteResponse = await fetch('https://api.netlify.com/api/v1/sites', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: siteName,
            custom_domain: null,
          }),
        });

        if (!createSiteResponse.ok) {
          return json({ error: 'Failed to create site' }, { status: 400 });
        }

        const newSite = (await createSiteResponse.json()) as any;
        targetSiteId = newSite.id;
        siteInfo = {
          id: newSite.id,
          name: newSite.name,
          url: newSite.url,
          chatId,
        };
      }
    }

    // Create file digests
    const fileDigests: Record<string, string> = Object.create(null);

    for (const [filePath, content] of Object.entries(files)) {
      // Ensure file path starts with a forward slash
      const normalizedPath = `/${filePath}`;
      const hash = crypto.createHash('sha1').update(content).digest('hex');
      fileDigests[normalizedPath] = hash;
    }

    // Create a new deploy with digests
    const deployResponse = await fetch(`https://api.netlify.com/api/v1/sites/${targetSiteId}/deploys`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        files: fileDigests,
        async: true,
        skip_processing: false,
        draft: false, // Change this to false for production deployments
        function_schedules: [],
        required: Object.keys(fileDigests), // Add this line
        framework: null,
      }),
    });

    if (!deployResponse.ok) {
      return json({ error: 'Failed to create deployment' }, { status: 400 });
    }

    const deploy = (await deployResponse.json()) as any;
    let retryCount = 0;
    const maxRetries = 60;

    // Poll until deploy is ready for file uploads
    while (retryCount < maxRetries) {
      const statusResponse = await fetch(`https://api.netlify.com/api/v1/sites/${targetSiteId}/deploys/${deploy.id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const status = (await statusResponse.json()) as any;

      if (status.state === 'prepared' || status.state === 'uploaded') {
        // Upload all files regardless of required array
        for (const [filePath, content] of Object.entries(files)) {
          const encodedPath = `/${filePath.split('/').map(encodeURIComponent).join('/')}`;

          let uploadSuccess = false;
          let uploadRetries = 0;

          while (!uploadSuccess && uploadRetries < 3) {
            try {
              const uploadResponse = await fetch(
                `https://api.netlify.com/api/v1/deploys/${deploy.id}/files${encodedPath}`,
                {
                  method: 'PUT',
                  headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/octet-stream',
                  },
                  body: content,
                },
              );

              uploadSuccess = uploadResponse.ok;

              if (!uploadSuccess) {
                console.error('Netlify file upload failed with status:', uploadResponse.status);
                uploadRetries++;
                await new Promise((resolve) => setTimeout(resolve, 2000));
              }
            } catch {
              console.error('Netlify file upload request failed');
              uploadRetries++;
              await new Promise((resolve) => setTimeout(resolve, 2000));
            }
          }

          if (!uploadSuccess) {
            return json({ error: `Failed to upload file ${filePath}` }, { status: 500 });
          }
        }
      }

      if (status.state === 'ready') {
        // Only return after files are uploaded
        if (Object.keys(files).length === 0 || status.summary?.status === 'ready') {
          return json({
            success: true,
            deploy: {
              id: status.id,
              state: status.state,
              url: status.ssl_url || status.url,
            },
            site: siteInfo,
          });
        }
      }

      if (status.state === 'error') {
        return json({ error: status.error_message || 'Deploy preparation failed' }, { status: 500 });
      }

      retryCount++;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    if (retryCount >= maxRetries) {
      return json({ error: 'Deploy preparation timed out' }, { status: 500 });
    }

    // Make sure we're returning the deploy ID and site info
    return json({
      success: true,
      deploy: {
        id: deploy.id,
        state: deploy.state,
      },
      site: siteInfo,
    });
  } catch {
    return json({ error: 'Deployment failed' }, { status: 500 });
  }
}
