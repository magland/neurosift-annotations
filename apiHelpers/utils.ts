/* eslint-disable @typescript-eslint/no-explicit-any */
export const parseRepoUri = (repo: string) => {
  const parts = repo.split("/");
  if (repo.startsWith('https://github.com/')) {
    if (parts.length !== 5) {
      throw new Error(`Invalid repo uri: ${repo}`);
    }
    const username = parts[3];
    const repoName = parts[4];
    return { username, repoName };
  }
  else {
    if (parts.length !== 2) {
      throw new Error(`Invalid repo uri: ${repo}`);
    }
    const username = parts[0];
    const repoName = parts[1];
    return { username, repoName };
  }
};

export const getFilePathForAssetAnnotations = (instanceName: string, dandisetId: string, assetPath: string, assetId: string) => {
  return `${instanceName}/dandisets/${dandisetId}/assets/${assetPath}/${assetId}/annotations.jsonl`;
};

// Thanks: https://stackoverflow.com/questions/16167581/sort-object-properties-and-json-stringify
export const JSONStringifyDeterministic = (obj: any, space: string | number | undefined = undefined) => {
  const allKeys: string[] = [];
  JSON.stringify(obj, function (key, value) {
    allKeys.push(key);
    return value;
  });
  allKeys.sort();
  return JSON.stringify(obj, allKeys, space);
};
