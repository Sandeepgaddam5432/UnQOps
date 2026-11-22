import { json, type LoaderFunction, type LoaderFunctionArgs } from '@remix-run/cloudflare';
import { parseCookies } from '~/lib/api/cookies';

interface GitInfo {
  local: {
    commitHash: string;
    branch: string;
    commitTime: string;
    repoName: string;
  };
  timestamp: string;
}

interface GitHubRepo {
  stargazers_count?: number;
  forks_count?: number;
  language?: string | null;
}

interface GitHubGist {
  id: string;
}

class GitHubApiError extends Error {
  constructor(readonly status: number) {
    super('GitHub API request failed');
  }
}

function privateJson(data: unknown, init?: ResponseInit): Response {
  const headers = new Headers(init?.headers);
  headers.set('Cache-Control', 'private, no-store');
  headers.set('Vary', 'Authorization, Cookie');
  headers.set('X-Content-Type-Options', 'nosniff');

  return json(data, { ...init, headers });
}

async function githubGet(path: string, token: string): Promise<Response> {
  const response = await fetch(`https://api.github.com${path}`, {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'User-Agent': 'UnQOps-app',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });

  if (!response.ok) {
    throw new GitHubApiError(response.status);
  }

  return response;
}

async function loadPersonalGitHubData(request: Request, action: string): Promise<Response> {
  const authorization = request.headers.get('Authorization') ?? '';
  const token = /^Bearer\s+([^\s]+)$/i.exec(authorization)?.[1];

  if (!token) {
    return privateJson({ error: 'A GitHub access token is required' }, { status: 401 });
  }

  try {
    if (action === 'getUser') {
      const user = await (await githubGet('/user', token)).json();
      return privateJson({ user });
    }

    if (action === 'getRepos') {
      const repos = (await (
        await githubGet('/user/repos?per_page=100&sort=updated&type=all', token)
      ).json()) as GitHubRepo[];
      const gistsResponse = await fetch('https://api.github.com/gists', {
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${token}`,
          'User-Agent': 'UnQOps-app',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      });
      const gists = gistsResponse.ok ? ((await gistsResponse.json()) as GitHubGist[]) : [];
      const stats = { totalStars: 0, totalForks: 0, languages: {} as Record<string, number>, totalGists: gists.length };

      for (const repo of Array.isArray(repos) ? repos : []) {
        stats.totalStars += repo.stargazers_count ?? 0;
        stats.totalForks += repo.forks_count ?? 0;

        if (repo.language) {
          stats.languages[repo.language] = (stats.languages[repo.language] ?? 0) + 1;
        }
      }

      return privateJson({ repos, stats });
    }

    if (action === 'getOrgs') {
      const organizations = await (await githubGet('/user/orgs', token)).json();
      return privateJson({ organizations });
    }

    if (action === 'getActivity') {
      const username = parseCookies(request.headers.get('Cookie')).githubUsername;

      if (!username || !/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/.test(username)) {
        return privateJson({ error: 'A valid GitHub username is required' }, { status: 400 });
      }

      const recentActivity = await (
        await githubGet(`/users/${encodeURIComponent(username)}/events?per_page=30`, token)
      ).json();

      return privateJson({ recentActivity });
    }
  } catch (error) {
    const status = error instanceof GitHubApiError && [401, 403].includes(error.status) ? error.status : 502;
    return privateJson({ error: 'GitHub could not complete this request' }, { status });
  }

  return privateJson({ error: 'Unknown GitHub action' }, { status: 400 });
}

// These values may be replaced at build time in the desktop build.
declare const __COMMIT_HASH: string;
declare const __GIT_BRANCH: string;
declare const __GIT_COMMIT_TIME: string;
declare const __GIT_REPO_NAME: string;

export const loader: LoaderFunction = async ({ request }: LoaderFunctionArgs) => {
  const action = new URL(request.url).searchParams.get('action');

  if (action && ['getUser', 'getRepos', 'getOrgs', 'getActivity'].includes(action)) {
    return loadPersonalGitHubData(request, action);
  }

  const gitInfo: GitInfo = {
    local: {
      commitHash: typeof __COMMIT_HASH !== 'undefined' ? __COMMIT_HASH : 'development',
      branch: typeof __GIT_BRANCH !== 'undefined' ? __GIT_BRANCH : 'unknown',
      commitTime: typeof __GIT_COMMIT_TIME !== 'undefined' ? __GIT_COMMIT_TIME : 'unknown',
      repoName: typeof __GIT_REPO_NAME !== 'undefined' ? __GIT_REPO_NAME : 'UnQOps',
    },
    timestamp: new Date().toISOString(),
  };

  return privateJson(gitInfo);
};
