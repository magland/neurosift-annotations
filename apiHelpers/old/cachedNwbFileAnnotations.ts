/* eslint-disable @typescript-eslint/no-explicit-any */
import { getMongoClient } from "./getMongoClient.js";
import { CachedNwbFileAnnotation } from "./types.js";

export const getNwbFileAnnotationsFromCache = async (a: {
  dandiInstanceName: string;
  dandisetId: string;
  assetPath: string;
  assetId: string;
  accessToken?: string
  repo?: string
}): Promise<CachedNwbFileAnnotation[]> => {
  const client = await getMongoClient();

  const cachedNwbFileAnnotationsCollection = client.db('neurosift-annotations').collection('cachedNwbFileAnnotations');

  const query: {[key: string]: any} = {
    dandiInstanceName: a.dandiInstanceName,
    dandisetId: a.dandisetId,
    assetPath: a.assetPath,
    assetId: a.assetId
  };

  if (a.repo) {
    query['repo'] = a.repo;
  }

  if (a.accessToken) {
    query['accessToken'] = a.accessToken;
  }

  const cachedAnnotationDocs = await cachedNwbFileAnnotationsCollection.find(query).toArray();

  const cachedAnnotations: CachedNwbFileAnnotation[] = cachedAnnotationDocs.map((doc) => {
    return {
      dandiInstanceName: doc.dandiInstanceName,
      dandisetId: doc.dandisetId,
      assetPath: doc.assetPath,
      assetId: doc.assetId,
      repo: doc.repo,
      repoPath: doc.repoPath,
      annotationItems: doc.annotationItems,
      timestampCached: doc.timestampCached,
      accessToken: doc.accessToken,
    };
  });

  return cachedAnnotations;
};

export const setNwbFileAnnotationInCache = async (
  a: CachedNwbFileAnnotation
): Promise<void> => {
  const client = await getMongoClient();

  const cachedNwbFileAnnotationsCollection = client.db('neurosift-annotations').collection('cachedNwbFileAnnotations');

  // we need to replace the existing one if it exists
  await cachedNwbFileAnnotationsCollection.findOneAndReplace({
    dandiInstanceName: a.dandiInstanceName,
    dandisetId: a.dandisetId,
    assetPath: a.assetPath,
    assetId: a.assetId,
    repo: a.repo,
    repoPath: a.repoPath,
    accessToken: a.accessToken,
  }, a, {
    upsert: true,
  });
};

export const deleteNwbFileAnnotationFromCache = async (
  a: CachedNwbFileAnnotation
): Promise<void> => {
  const client = await getMongoClient();

  const cachedNwbFileAnnotationsCollection = client.db('neurosift-annotations').collection('cachedNwbFileAnnotations');

  await cachedNwbFileAnnotationsCollection.deleteOne({
    dandiInstanceName: a.dandiInstanceName,
    dandisetId: a.dandisetId,
    assetPath: a.assetPath,
    assetId: a.assetId,
    repo: a.repo,
    repoPath: a.repoPath,
    accessToken: a.accessToken,
  });
};
