import {
  GITHUB_API_BASE_URL,
  getGitHubRestApiVersions,
  githubRestHeaders,
} from "~/lib/api-config"
import { HTTPError } from "~/lib/error"

async function isUnsupportedApiVersionResponse(
  response: Response,
): Promise<boolean> {
  if (response.status !== 400) {
    return false
  }

  const text = await response
    .clone()
    .text()
    .catch(() => "")
  return (
    text.includes("X-GitHub-API-Version")
    && text.includes("not a supported version")
  )
}

export async function getGitHubUser(githubToken: string) {
  let lastResponse: Response | null = null

  for (const apiVersion of getGitHubRestApiVersions()) {
    const response = await fetch(`${GITHUB_API_BASE_URL}/user`, {
      headers: githubRestHeaders(githubToken, apiVersion),
    })

    if (response.ok) {
      return (await response.json()) as GithubUserResponse
    }

    lastResponse = response
    if (!(await isUnsupportedApiVersionResponse(response))) {
      break
    }
  }

  throw new HTTPError(
    "Failed to get GitHub user",
    lastResponse ?? new Response(null, { status: 500 }),
  )
}

// Trimmed for the sake of simplicity
export interface GithubUserResponse {
  id: number
  login: string
  avatar_url: string
}
