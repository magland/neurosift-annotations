/* eslint-disable @typescript-eslint/no-explicit-any */
import allowCors from "../apiHelpers/allowCors.js";
import { getMongoClient } from "../apiHelpers/getMongoClient.js";
import { AddAnnotationResponse, GetAnnotationsResponse, NeurosiftAnnotation, isAddAnnotationRequest, isDeleteAnnotationRequest, isGetAnnotationsRequest, isNeurosiftAnnotation } from "../apiHelpers/types.js";

export default allowCors(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  const rr = req.body;
  if (!isGetAnnotationsRequest(rr)) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }

  const {
    annotationId,
    userId,
    annotationType,
    dandiInstanceName,
    dandisetId,
    assetPath,
    assetId,
    assetUrl
  } = rr;

  try {
    const client = await getMongoClient();

    const collection = client.db('neurosift-annotations').collection('annotations');

    const query: { [key: string]: any } = {}
    let enoughInfoProvided = false;
    if (annotationId) {
      query['annotationId'] = annotationId;
      enoughInfoProvided = true;
    }
    if (userId) {
      query['userId'] = userId;
      enoughInfoProvided = true;
    }
    if (annotationType) {
      query['annotationType'] = annotationType;
    }
    if (dandiInstanceName) {
      query['dandiInstanceName'] = dandiInstanceName;
    }
    if (dandisetId) {
      if (!dandiInstanceName) {
        throw Error("dandiInstanceName must be provided if dandisetId is provided");
      }
      query['dandisetId'] = dandisetId;
      enoughInfoProvided = true;
    }
    if (assetPath) {
      query['assetPath'] = assetPath;
    }
    if (assetId) {
      query['assetId'] = assetId;
      enoughInfoProvided = true;
    }
    if (assetUrl) {
      query['assetUrl'] = assetUrl;
      enoughInfoProvided = true;
    }
    if (!enoughInfoProvided) {
      throw Error("Not enough info provided in request for query.");
    }

    const a = await collection.find(query).toArray();
    const annotations: NeurosiftAnnotation[] = []
    for (const x of a) {
      removeMongoIdField(x)
      if (!isNeurosiftAnnotation(x)) {
        throw Error("Invalid annotation found in database");
      }
      annotations.push(x);
    }

    const resp: GetAnnotationsResponse = {
      annotations: annotations as any as NeurosiftAnnotation[]
    };

    res.status(200).json(resp);
  }
  catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

export const addAnnotationHandler = allowCors(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  const rr = req.body;
  if (!isAddAnnotationRequest(rr)) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }

  const gitHubAccessToken = req.headers.authorization?.split(" ")[1]; // Extract the token
  if (!gitHubAccessToken) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  let userId: string
  try {
      userId = await getUserIdForGitHubAccessToken(gitHubAccessToken);
  }
  catch (e) {
      res.status(401).json({ error: "Unauthorized" });
      return;
  }

  if (userId !== rr.userId) {
      res.status(401).json({ error: "Unauthorized (wrong user)" });
      return;
  }

  const {
    annotationType,
    annotation,
    dandiInstanceName,
    dandisetId,
    assetPath,
    assetId,
    assetUrl
  } = rr;

  try {
    const client = await getMongoClient();

    const collection = client.db('neurosift-annotations').collection('annotations');

    const annotationId = generateRandomString(32);

    const annotationDoc = {
      annotationId,
      userId,
      annotationType,
      annotation,
      dandiInstanceName,
      dandisetId,
      assetPath,
      assetId,
      assetUrl,
      timestamp: Date.now()
    };

    await collection.insertOne(annotationDoc);

    const resp: AddAnnotationResponse = {
      annotationId
    };

    res.status(200).json(resp);
  }
  catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

export const deleteAnnotationHandler = allowCors(async (req, resp) => {
  if (req.method !== "POST") {
    resp.status(405).json({ error: "Method not allowed" });
    return;
  }

  const rr = req.body;
  if (!isDeleteAnnotationRequest(rr)) {
    resp.status(400).json({ error: "Invalid request" });
    return;
  }

  const gitHubAccessToken = req.headers.authorization?.split(" ")[1]; // Extract the token
  if (!gitHubAccessToken) {
    resp.status(401).json({ error: "Unauthorized" });
    return;
  }

  let userId: string
  try {
      userId = await getUserIdForGitHubAccessToken(gitHubAccessToken);
  }
  catch (e) {
      resp.status(401).json({ error: "Unauthorized" });
      return;
  }

  const annotationId = rr.annotationId;

  try {
    const client = await getMongoClient();

    const collection = client.db('neurosift-annotations').collection('annotations');

    const query = {
      annotationId,
      userId
    };

    const result = await collection.deleteOne(query);

    if (result.deletedCount === 0) {
      resp.status(404).json({ error: "Annotation not found" });
      return;
    }

    resp.status(200).json({});
  }
  catch (e) {
    console.error(e);
    resp.status(500).json({ error: e.message });
  }
});

const gitHubUserIdCache: { [accessToken: string]: string } = {};
const getUserIdForGitHubAccessToken = async (gitHubAccessToken: string) => {
    if (gitHubUserIdCache[gitHubAccessToken]) {
        return gitHubUserIdCache[gitHubAccessToken];
    }

    const response = await fetch('https://api.github.com/user', {
        headers: {
            Authorization: `token ${gitHubAccessToken}`
        }
    });

    if (!response.ok) {
        throw new Error('Failed to get user id');
    }

    const data = await response.json();
    const userId = 'github|' + data.login;
    gitHubUserIdCache[gitHubAccessToken] = userId;
    return userId;
}

const removeMongoIdField = (x: any) => {
  delete x['_id'];
}

const generateRandomString = (length: number) => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}