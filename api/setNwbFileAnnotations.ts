/* eslint-disable @typescript-eslint/no-explicit-any */
import { VercelRequest, VercelResponse } from "@vercel/node";
import { Octokit } from "@octokit/rest";
import { isString, validateObject } from "@fi-sci/misc";

type SetNwbFileAnnotationsRequest = {
  repo: string
  dandisetId: string
  assetPath: string
  assetId: string
  annotations: {[key: string]: string}[]
}

const isSetNwbFileAnnotationsRequest = (req: any): req is SetNwbFileAnnotationsRequest => {
  return validateObject(req, {
    repo: isString,
    dandisetId: isString,
    assetPath: isString,
    assetId: isString,
    annotations: () => true
  });
}

export default async (req: VercelRequest, res: VercelResponse) => {
  // check that it is a post request
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  const rr = req.body;
  if (!isSetNwbFileAnnotationsRequest(rr)) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }
  const { repo, dandisetId, assetPath, assetId, annotations } = rr;
  const accessToken = req.headers.authorization?.split(" ")[1]; // Extract the token

  if (!accessToken) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const octokit = new Octokit({ auth: accessToken });

  const {username, repoName} = parseRepo(repo);

  const filePath = getFilePathForAssetAnnotations(dandisetId, assetPath, assetId);
  const newContent = annotations.map((annotation) => jsonStringifyDeterministic(annotation)).join("\n");

  try {
    // Check if the file exists to get its SHA (necessary for updating)
    let sha: string | undefined = undefined;
    try {
      const { data: fileData } = await octokit.rest.repos.getContent({
        owner: username,
        repo: repoName,
        path: filePath,
      });
      sha = (fileData as any).sha;
    } catch (error: any) {
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
      path: filePath,
      message: `Updating file ${filePath}`,
      content: Buffer.from(newContent).toString("base64"),
      sha, // This is optional and only needed for updates
    });

    res.status(200).json(response.data);
  } catch (error: any) {
    console.error("Failed to update file:", error);
    res.status(error.status || 500).json({ error: "Failed to update file" });
  }
};

type GetNwbFileAnnotationsRequest = {
  repo: string
  dandisetId: string
  assetPath: string
  assetId: string
}

const isGetNwbFileAnnotationsRequest = (req: any): req is GetNwbFileAnnotationsRequest => {
  return validateObject(req, {
    repo: isString,
    dandisetId: isString,
    assetPath: isString,
    assetId: isString
  });
}

export async function getNwbFileAnnotations(req: VercelRequest, res: VercelResponse) {
  // check that it is a post request
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  const rr = req.body;
  if (!isGetNwbFileAnnotationsRequest(rr)) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }
  const { repo, dandisetId, assetPath, assetId } = rr;
  const accessToken = req.headers.authorization?.split(" ")[1]; // Extract the token

  if (!accessToken) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const octokit = new Octokit({ auth: accessToken });

  const {username, repoName} = parseRepo(repo);

  const filePath = getFilePathForAssetAnnotations(dandisetId, assetPath, assetId);

  try {
    const { data: fileData } = await octokit.rest.repos.getContent({
      owner: username,
      repo: repoName,
      path: filePath,
    });

    const content = Buffer.from((fileData as any).content, "base64").toString("utf-8");
    const annotations = content.split("\n").map((line: string) => JSON.parse(line));
    res.status(200).json(annotations);
  } catch (error: any) {
    if (error.status === 404) {
      res.status(200).json([]);
      return;
    }
    console.error("Failed to get file:", error);
    res.status(error.status || 500).json({ error: "Failed to get file" });
  }
}

const parseRepo = (repo: string) => {
  const [username, repoName] = repo.split("/");
  return {username, repoName};
}

const getFilePathForAssetAnnotations = (dandisetId: string, assetPath: string, assetId: string) => {
  return `dandisets/${dandisetId}/assets/${assetPath}/${assetId}/annotations.jsonl`;
}

const jsonStringifyDeterministic = (obj: any) => JSON.stringify(obj, Object.keys(obj).sort());