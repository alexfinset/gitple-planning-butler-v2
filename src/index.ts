import "dotenv/config";
import { GitpleButler } from "./main";

// ----------------------------------------------------------------------

(async function () {
  const project = new GitpleButler({
    accessToken: process.env.TOKEN || "",
    teamName: process.env.TEAM || "",
    owner: process.env.OWNER || "",
  });

  await project.welcome();
  await project.askCheckConfig();
  await project.getIssues();
})();
