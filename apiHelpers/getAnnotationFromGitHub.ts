/* eslint-disable @typescript-eslint/no-explicit-any */
import { Octokit } from "@octokit/rest";
import { parseRepoUri } from "../apiHelpers/utils";

const getAnnotationFromGitHub = async (
  a: {
    accessToken: string
    repo: string
    repoPath: string
  }
) => {
  const { accessToken, repo, repoPath } = a;
  const octokit = new Octokit({ auth: accessToken });

  const { username, repoName } = parseRepoUri(repo);

  try {
    const { data: fileData, headers } = await octokit.rest.repos.getContent({
      owner: username,
      repo: repoName,
      path: repoPath
    });
    const rateLimitLimit = headers["x-ratelimit-limit"];
    const rateLimitRemaining = headers["x-ratelimit-remaining"];
    const rateLimitReset = headers["x-ratelimit-reset"] || 0;
    const timeToResetSeconds =
      Number(rateLimitReset) - Math.floor(Date.now() / 1000);

    console.info(
      `Rate limit: ${rateLimitRemaining}/${rateLimitLimit}, reset in ${timeToResetSeconds} seconds`
    );

    if (!fileData) {
      return undefined;
    }

    // eslint-disable-next-line no-undef
    const content = Buffer.from((fileData as any).content, "base64").toString("utf-8");
    const annotations = content
      .split("\n")
      .filter((a) => !!a)
      .map((line) => JSON.parse(line));
    return annotations;
  } catch (error) {
    if (error.status === 404) {
      return undefined;
    }
    console.error("Failed to get file:", error);
    return undefined;
  }
};

export default getAnnotationFromGitHub;