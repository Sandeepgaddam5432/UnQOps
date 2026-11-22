import { type ActionFunctionArgs, type LoaderFunctionArgs, json as baseJson } from '@remix-run/cloudflare';
import type { VercelProjectInfo } from '~/types/vercel';
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

// Function to detect framework from project files
const detectFramework = (files: Record<string, string>): string => {
  // Check for package.json first
  const packageJson = files['package.json'];

  if (packageJson) {
    try {
      const pkg = JSON.parse(packageJson);
      const dependencies = { ...pkg.dependencies, ...pkg.devDependencies };

      // Check for specific frameworks
      if (dependencies.next) {
        return 'nextjs';
      }

      if (dependencies.react && dependencies['@remix-run/react']) {
        return 'remix';
      }

      if (dependencies.react && dependencies.vite) {
        return 'vite';
      }

      if (dependencies.react && dependencies['@vitejs/plugin-react']) {
        return 'vite';
      }

      if (dependencies.react && dependencies['@nuxt/react']) {
        return 'nuxt';
      }

      if (dependencies.react && dependencies['@qwik-city/qwik']) {
        return 'qwik';
      }

      if (dependencies.react && dependencies['@sveltejs/kit']) {
        return 'sveltekit';
      }

      if (dependencies.react && dependencies.astro) {
        return 'astro';
      }

      if (dependencies.react && dependencies['@angular/core']) {
        return 'angular';
      }

      if (dependencies.react && dependencies.vue) {
        return 'vue';
      }

      if (dependencies.react && dependencies['@expo/react-native']) {
        return 'expo';
      }

      if (dependencies.react && dependencies['react-native']) {
        return 'react-native';
      }

      // Generic React app
      if (dependencies.react) {
        return 'react';
      }

      // Check for other frameworks
      if (dependencies['@angular/core']) {
        return 'angular';
      }

      if (dependencies.vue) {
        return 'vue';
      }

      if (dependencies['@sveltejs/kit']) {
        return 'sveltekit';
      }

      if (dependencies.astro) {
        return 'astro';
      }

      if (dependencies['@nuxt/core']) {
        return 'nuxt';
      }

      if (dependencies['@qwik-city/qwik']) {
        return 'qwik';
      }

      if (dependencies['@expo/react-native']) {
        return 'expo';
      }

      if (dependencies['react-native']) {
        return 'react-native';
      }

      // Check for build tools
      if (dependencies.vite) {
        return 'vite';
      }

      if (dependencies.webpack) {
        return 'webpack';
      }

      if (dependencies.parcel) {
        return 'parcel';
      }

      if (dependencies.rollup) {
        return 'rollup';
      }

      // Default to Node.js if package.json exists
      return 'nodejs';
    } catch {
      // Fall back to configuration-file detection when package.json is malformed.
    }
  }

  // Check for other framework indicators
  if (files['next.config.js'] || files['next.config.ts']) {
    return 'nextjs';
  }

  if (files['remix.config.js'] || files['remix.config.ts']) {
    return 'remix';
  }

  if (files['vite.config.js'] || files['vite.config.ts']) {
    return 'vite';
  }

  if (files['nuxt.config.js'] || files['nuxt.config.ts']) {
    return 'nuxt';
  }

  if (files['svelte.config.js'] || files['svelte.config.ts']) {
    return 'sveltekit';
  }

  if (files['astro.config.js'] || files['astro.config.ts']) {
    return 'astro';
  }

  if (files['angular.json']) {
    return 'angular';
  }

  if (files['vue.config.js'] || files['vue.config.ts']) {
    return 'vue';
  }

  if (files['app.json'] && files['app.json'].includes('expo')) {
    return 'expo';
  }

  if (files['app.json'] && files['app.json'].includes('react-native')) {
    return 'react-native';
  }

  // Check for static site indicators
  if (files['index.html']) {
    return 'static';
  }

  // Default to unknown
  return 'other';
};

// Tokens must stay in the request body; this route intentionally does not accept them in query strings.
export async function loader(_args: LoaderFunctionArgs) {
  return json({ error: 'Use POST to request Vercel deployment data' }, { status: 405, headers: { Allow: 'POST' } });
}

interface DeployRequestBody {
  mode?: 'deploy' | 'status';
  projectId?: string;
  files?: Record<string, string>;
  sourceFiles?: Record<string, string>;
  chatId?: string;
  framework?: string;
  token?: string;
}

const MAX_DEPLOY_BODY_BYTES = 20_000_000;
const ALLOWED_FRAMEWORKS = new Set([
  'nextjs',
  'remix',
  'vite',
  'nuxt',
  'qwik',
  'sveltekit',
  'astro',
  'angular',
  'vue',
  'expo',
  'react-native',
  'react',
  'nodejs',
  'webpack',
  'parcel',
  'rollup',
  'static',
  'other',
]);

async function fetchVercelProjectStatus(projectId: string, token: string): Promise<Response> {
  const projectResponse = await fetch(`https://api.vercel.com/v9/projects/${encodeURIComponent(projectId)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!projectResponse.ok) {
    return json({ error: 'Failed to fetch project' }, { status: 400 });
  }

  const projectData = (await projectResponse.json()) as any;
  const deploymentsResponse = await fetch(
    `https://api.vercel.com/v6/deployments?projectId=${encodeURIComponent(projectId)}&limit=1`,
    { headers: { Authorization: `Bearer ${token}` } },
  );

  if (!deploymentsResponse.ok) {
    return json({ error: 'Failed to fetch deployments' }, { status: 400 });
  }

  const deploymentsData = (await deploymentsResponse.json()) as any;
  const latestDeployment = deploymentsData.deployments?.[0];
  const projectUrl = `https://${projectData.name}.vercel.app`;

  return json({
    project: {
      id: projectData.id,
      name: projectData.name,
      url: projectUrl,
    },
    deploy: latestDeployment
      ? {
          id: latestDeployment.id,
          state: latestDeployment.state,
          url: latestDeployment.url ? `https://${latestDeployment.url}` : projectUrl,
        }
      : null,
  });
}

// Existing action function for POST requests
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
    const { mode = 'deploy', projectId, token, chatId, framework } = body;

    if (!isValidProviderToken(token)) {
      return json({ error: 'Not connected to Vercel' }, { status: 401 });
    }

    if (mode === 'status') {
      if (!isValidProviderResourceId(projectId)) {
        return json({ error: 'A valid Vercel project ID is required' }, { status: 400 });
      }

      return await fetchVercelProjectStatus(projectId, token);
    }

    if (mode !== 'deploy') {
      return json({ error: 'Unknown Vercel action' }, { status: 400 });
    }

    const files = sanitizeDeploymentFiles(body.files);
    const sourceFiles = body.sourceFiles === undefined ? undefined : sanitizeDeploymentFiles(body.sourceFiles);

    if (
      !files ||
      (body.sourceFiles !== undefined && !sourceFiles) ||
      (projectId !== undefined && !isValidProviderResourceId(projectId)) ||
      typeof chatId !== 'string' ||
      chatId.length === 0 ||
      chatId.length > 128 ||
      (framework !== undefined && (typeof framework !== 'string' || !ALLOWED_FRAMEWORKS.has(framework)))
    ) {
      return json({ error: 'Invalid deployment files or metadata' }, { status: 400 });
    }

    let targetProjectId = projectId;
    let projectInfo: VercelProjectInfo | undefined;

    // Detect framework from the source files if not provided
    let detectedFramework = framework;

    if (!detectedFramework && sourceFiles) {
      detectedFramework = detectFramework(sourceFiles);
      console.log('Detected framework from source files:', detectedFramework);
    }

    // If no projectId provided, create a new project
    if (!targetProjectId) {
      const projectName = createDeploymentName(chatId);
      const createProjectResponse = await fetch('https://api.vercel.com/v9/projects', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: projectName,
          framework: detectedFramework || null,
        }),
      });

      if (!createProjectResponse.ok) {
        return json({ error: 'Failed to create project' }, { status: 400 });
      }

      const newProject = (await createProjectResponse.json()) as any;
      targetProjectId = newProject.id;
      projectInfo = {
        id: newProject.id,
        name: newProject.name,
        url: `https://${newProject.name}.vercel.app`,
        chatId,
      };
    } else {
      // Get existing project info
      const projectResponse = await fetch(`https://api.vercel.com/v9/projects/${targetProjectId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (projectResponse.ok) {
        const existingProject = (await projectResponse.json()) as any;
        projectInfo = {
          id: existingProject.id,
          name: existingProject.name,
          url: `https://${existingProject.name}.vercel.app`,
          chatId,
        };
      } else {
        // If project doesn't exist, create a new one
        const projectName = createDeploymentName(chatId);
        const createProjectResponse = await fetch('https://api.vercel.com/v9/projects', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: projectName,
            framework: detectedFramework || null,
          }),
        });

        if (!createProjectResponse.ok) {
          return json({ error: 'Failed to create project' }, { status: 400 });
        }

        const newProject = (await createProjectResponse.json()) as any;
        targetProjectId = newProject.id;
        projectInfo = {
          id: newProject.id,
          name: newProject.name,
          url: `https://${newProject.name}.vercel.app`,
          chatId,
        };
      }
    }

    // Prepare files for deployment
    const deploymentFiles = [];

    /*
     * For frameworks that need to build on Vercel, include source files
     * For static sites, only include build output
     */
    const shouldIncludeSourceFiles =
      detectedFramework &&
      ['nextjs', 'react', 'vite', 'remix', 'nuxt', 'sveltekit', 'astro', 'vue', 'angular'].includes(detectedFramework);

    if (shouldIncludeSourceFiles && sourceFiles) {
      // Include source files for frameworks that need to build
      for (const [filePath, content] of Object.entries(sourceFiles)) {
        // Ensure file path doesn't start with a slash for Vercel
        const normalizedPath = filePath.startsWith('/') ? filePath.substring(1) : filePath;
        deploymentFiles.push({
          file: normalizedPath,
          data: content,
        });
      }
    } else {
      // For static sites, only include build output
      for (const [filePath, content] of Object.entries(files)) {
        // Ensure file path doesn't start with a slash for Vercel
        const normalizedPath = filePath.startsWith('/') ? filePath.substring(1) : filePath;
        deploymentFiles.push({
          file: normalizedPath,
          data: content,
        });
      }
    }

    // Create deployment configuration based on framework
    const deploymentConfig: any = {
      name: projectInfo.name,
      project: targetProjectId,
      target: 'production',
      files: deploymentFiles,
    };

    // Add framework-specific configuration
    if (detectedFramework === 'nextjs') {
      deploymentConfig.buildCommand = 'npm run build';
      deploymentConfig.outputDirectory = '.next';
    } else if (detectedFramework === 'react' || detectedFramework === 'vite') {
      deploymentConfig.buildCommand = 'npm run build';
      deploymentConfig.outputDirectory = 'dist';
    } else if (detectedFramework === 'remix') {
      deploymentConfig.buildCommand = 'npm run build';
      deploymentConfig.outputDirectory = 'public';
    } else if (detectedFramework === 'nuxt') {
      deploymentConfig.buildCommand = 'npm run build';
      deploymentConfig.outputDirectory = '.output';
    } else if (detectedFramework === 'sveltekit') {
      deploymentConfig.buildCommand = 'npm run build';
      deploymentConfig.outputDirectory = 'build';
    } else if (detectedFramework === 'astro') {
      deploymentConfig.buildCommand = 'npm run build';
      deploymentConfig.outputDirectory = 'dist';
    } else if (detectedFramework === 'vue') {
      deploymentConfig.buildCommand = 'npm run build';
      deploymentConfig.outputDirectory = 'dist';
    } else if (detectedFramework === 'angular') {
      deploymentConfig.buildCommand = 'npm run build';
      deploymentConfig.outputDirectory = 'dist';
    } else {
      // For static sites, no build command needed
      deploymentConfig.routes = [{ src: '/(.*)', dest: '/$1' }];
    }

    // Create a new deployment
    const deployResponse = await fetch(`https://api.vercel.com/v13/deployments`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(deploymentConfig),
    });

    if (!deployResponse.ok) {
      return json({ error: 'Failed to create deployment' }, { status: 400 });
    }

    const deployData = (await deployResponse.json()) as any;

    // Poll for deployment status
    let retryCount = 0;
    const maxRetries = 60;
    let deploymentUrl = '';
    let deploymentState = '';

    while (retryCount < maxRetries) {
      const statusResponse = await fetch(`https://api.vercel.com/v13/deployments/${deployData.id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (statusResponse.ok) {
        const status = (await statusResponse.json()) as any;
        deploymentState = status.readyState;
        deploymentUrl = status.url ? `https://${status.url}` : '';

        if (status.readyState === 'READY' || status.readyState === 'ERROR') {
          break;
        }
      }

      retryCount++;
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    if (deploymentState === 'ERROR') {
      return json({ error: 'Deployment failed' }, { status: 500 });
    }

    if (retryCount >= maxRetries) {
      return json({ error: 'Deployment timed out' }, { status: 500 });
    }

    return json({
      success: true,
      deploy: {
        id: deployData.id,
        state: deploymentState,

        // Return public domain as deploy URL and private domain as fallback.
        url: projectInfo.url || deploymentUrl,
      },
      project: projectInfo,
    });
  } catch {
    return json({ error: 'Deployment failed' }, { status: 500 });
  }
}
