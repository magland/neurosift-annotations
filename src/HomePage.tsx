import { FunctionComponent, useCallback } from "react";
import LoginButton from "./LoginButton";
// import { getGitHubAccessToken } from "./App";
import { Hyperlink } from "@fi-sci/misc";

type Props = {
  // none
};

const HomePage: FunctionComponent<Props> = () => {
  // const accessToken = getGitHubAccessToken();
  // const handleTest = useCallback(async () => {
  //   if (!accessToken) {
  //     console.log("Access token is not available.");
  //     return;
  //   }

  //   const repoName = "ns_annotations";
  //   const filePath = "example.txt";
  //   const fileContent = "Hello, world! This is a test file 2.";
  //   const username = "magland";

  //   try {
  //     const response = await fetch("/api/test1", {
  //       method: "POST",
  //       headers: {
  //         "Content-Type": "application/json",
  //         Authorization: `Bearer ${accessToken}`,
  //       },
  //       body: JSON.stringify({
  //         repoName,
  //         filePath,
  //         fileContent,
  //         username,
  //       }),
  //     });

  //     if (!response.ok) {
  //       throw new Error("Failed to update file in the repository");
  //     }

  //     const data = await response.json();
  //     console.log("File update successful:", data);
  //   } catch (error) {
  //     console.error("Error updating file:", error);
  //   }
  // }, [accessToken]);
  return (
    <div>
      {/* <h1>Neurosift Annotations</h1>
      <div>{accessToken ? <div>Logged in</div> : <LoginButton />}</div>
      <div>
        <Hyperlink onClick={handleTest}>Test set file 2</Hyperlink>
      </div> */}
    </div>
  );
};

export default HomePage;
