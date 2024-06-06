/* eslint-disable @typescript-eslint/no-explicit-any */
import { Octokit } from "@octokit/rest";
import { JSONStringifyDeterministic, parseRepoUri } from "./utils.js";

const putAnnotationToGitHub = async (a: {
  accessToken: string;
  repo: string;
  repoPath: string;
  annotationItems: any[];
}) => {
  const { accessToken, repo, repoPath, annotationItems } = a;
  const octokit = new Octokit({ auth: accessToken });

  const { username, repoName } = parseRepoUri(repo);

  const newContent = annotationItems
    .map((a) => JSONStringifyDeterministic(a))
    .join("\n");

  // Check if the file exists to get its SHA (necessary for updating)
  let sha = undefined;
  try {
    const { data: fileData } = await octokit.rest.repos.getContent({
      owner: username,
      repo: repoName,
      path: repoPath,
    });
    sha = (fileData as any).sha;
  } catch (error) {
    // If error is not because the file doesn't exist, rethrow it
    if (error.status !== 404) {
      throw error;
    }
    // File does not exist; proceed without SHA for a new file
  }
  // Create or update the file
  const response = await octokit.rest.repos.createOrUpdateFileContents({
    owner: username,
    repo: repoName,
    path: repoPath,
    message: `Updating ${repoPath}`,
    // eslint-disable-next-line no-undef
    content: Buffer.from(newContent).toString("base64"),
    sha, // This is optional and only needed for updates
  });

  if ((response.status !== 200) && (response.status !== 201)) {
    console.error("Failed to put file:", response);
    throw new Error("Failed to put file");
  }
};

export default putAnnotationToGitHub;
