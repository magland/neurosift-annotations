/* eslint-disable @typescript-eslint/no-explicit-any */
import { isString, validateObject } from "@fi-sci/misc";
import { Octokit } from "@octokit/rest";


const allowCors = (fn) => async (req, res) => {
  const allowedOrigins = ['http://localhost:4200', 'https://flatironinstitute.github.io', 'https://neurosift.app']
  const origin = req.headers.origin || '';
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  return await fn(req, res);
};

// type SetNwbFileAnnotationsRequest = {
//   repo: string
//   dandisetId: string
//   assetPath: string
//   assetId: string
//   annotations: {[key: string]: string}[]
// }

// const isSetNwbFileAnnotationsRequest = (req: any): req is SetNwbFileAnnotationsRequest => {
//   return validateObject(req, {
//     repo: isString,
//     dandisetId: isString,
//     assetPath: isString,
//     assetId: isString,
//     annotations: () => true
//   });
// }

const isSetNwbFileAnnotationsRequest = (req) => {
  return validateObject(req, {
    repo: isString,
    dandisetId: isString,
    assetPath: isString,
    assetId: isString,
    annotations: () => true
  });
}

export default allowCors(async (req, res) => {
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
  const newContent = annotations.map((annotation) => JSONStringifyDeterministic(annotation)).join("\n");

  try {
    // Check if the file exists to get its SHA (necessary for updating)
    let sha = undefined;
    try {
      const { data: fileData } = await octokit.rest.repos.getContent({
        owner: username,
        repo: repoName,
        path: filePath,
      });
      sha = (fileData).sha;
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
      path: filePath,
      message: `Updating file ${filePath}`,
      // eslint-disable-next-line no-undef
      content: Buffer.from(newContent).toString("base64"),
      sha, // This is optional and only needed for updates
    });

    res.status(200).json(response.data);
  } catch (error) {
    console.error("Failed to update file:", error);
    res.status(error.status || 500).json({ error: "Failed to update file" });
  }
});

// type GetNwbFileAnnotationsRequest = {
//   repo: string
//   dandisetId: string
//   assetPath: string
//   assetId: string
// }

// const isGetNwbFileAnnotationsRequest = (req: any): req is GetNwbFileAnnotationsRequest => {
//   return validateObject(req, {
//     repo: isString,
//     dandisetId: isString,
//     assetPath: isString,
//     assetId: isString
//   });
// }

const isGetNwbFileAnnotationsRequest = (req) => {
  return validateObject(req, {
    repo: isString,
    dandisetId: isString,
    assetPath: isString,
    assetId: isString
  });
}

export const getNwbFileAnnotations = allowCors(async (req, res) => {
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
    const { data: fileData, headers } = await octokit.rest.repos.getContent({
      owner: username,
      repo: repoName,
      path: filePath,
    });

    const rateLimitLimit = headers['x-ratelimit-limit']
    const rateLimitRemaining = headers['x-ratelimit-remaining']
    const rateLimitReset = headers['x-ratelimit-reset'] || 0
    const timeToResetSeconds = Number(rateLimitReset) - Math.floor(Date.now() / 1000)

    console.info(`Rate limit: ${rateLimitRemaining}/${rateLimitLimit} (reset in ${timeToResetSeconds} seconds)`)

    // eslint-disable-next-line no-undef
    const content = Buffer.from((fileData).content, "base64").toString("utf-8");
    const annotations = content.split("\n").filter(a => !!a).map((line) => JSON.parse(line));
    res.status(200).json(annotations);
  } catch (error) {
    if (error.status === 404) {
      res.status(200).json([]);
      return;
    }
    console.error("Failed to get file:", error);
    res.status(error.status || 500).json({ error: "Failed to get file" });
  }
});

const parseRepo = (repo) => {
  const [username, repoName] = repo.split("/");
  return {username, repoName};
}

const getFilePathForAssetAnnotations = (dandisetId, assetPath, assetId) => {
  return `dandisets/${dandisetId}/assets/${assetPath}/${assetId}/annotations.jsonl`;
}

// Thanks: https://stackoverflow.com/questions/16167581/sort-object-properties-and-json-stringify
export const JSONStringifyDeterministic = (obj, space = undefined) => {
  const allKeys = [];
  JSON.stringify(obj, function (key, value) {
    allKeys.push(key);
    return value;
  });
  allKeys.sort();
  return JSON.stringify(obj, allKeys, space);
};
