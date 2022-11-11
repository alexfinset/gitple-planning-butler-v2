import { Octokit } from "@octokit/core";
import _ from "lodash";
import { marked } from "marked";
import { Pdf, ICreateOptions } from "./libs/pdf";
import fs from "fs";
import chalk from "chalk";
import inquirer from "inquirer";
import chalkAnimation from "chalk-animation";
import { createSpinner } from "nanospinner";
import cp from "child_process";

// ----------------------------------------------------------------------

export interface Issue {
  id: number;
  repo: string;
}

export interface ProjConfig {
  accessToken: string;
  teamName: string;
  owner: string;
}

export interface GithubIssue {
  id: number;
  number: number;
  title: string;
  body: string;
  labels?: {
    id: number;
    name: string;
    color: string;
    description: string;
  }[];
}

export class GitpleButler {
  private readonly githubClient: Octokit;
  private readonly pdf = new Pdf();
  private readonly log = console.log;

  private issues = [] as Issue[];
  private teamName: string = "";
  private owner: string = "";

  constructor(config: ProjConfig) {
    const { accessToken, teamName, owner } = config;
    this.teamName = _.toLower(teamName);
    this.owner = owner;
    this.githubClient = new Octokit({ auth: accessToken });
  }

  async delay(ms: number = 2000) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async welcome() {
    console.clear();
    const rainbowTitle = chalkAnimation.rainbow(
      "Welcome to Gitple Project Butler! \n"
    );
    await this.delay(1500);
    rainbowTitle.stop();
  }

  async askCheckConfig() {
    try {
      const fileNames = fs.readdirSync(__dirname + "/config");
      const answer = await inquirer.prompt({
        name: "fileName",
        type: "list",
        message: "Select file from the list: \n",
        choices: fileNames,
      });

      const configFile = fs.readFileSync(
        __dirname + "/config/" + answer?.fileName,
        "utf8"
      );
      const parsedConfigFile = JSON.parse(configFile);

      if (_.isArray(parsedConfigFile.issues)) {
        this.issues = parsedConfigFile.issues;
      } else {
        this.log("you need to setup config");
        process.exit(1);
      }
    } catch (error) {
      this.log(chalk.red(`failed reading [${this.teamName}] config file`));
      process.exit(0);
    }
  }

  async getIssues() {
    if (!this.issues.length) {
      this.log(chalk.red(`couldn't find issues.`));
      process.exit(1);
    }

    try {
      const issueSpinner = createSpinner("processing issues...").start();
      let _issues = [];

      for (const _issue of this.issues) {
        const issue = (await this.fetchIssue(_issue)) as GithubIssue;
        // console.dir(_issue, { depth: null });
        // console.dir(issue?.id, { depth: null });
        if (!_.isEmpty(issue) && issue?.id) {
          // this.log(chalk.blue(`issue number: ${issue.id}`));
          _issues.push({
            id: issue.id,
            number: issue.number,
            title: issue.title,
            body: this.handleIssueBodyStr(issue.body as string),
            labels: _.map(issue?.labels, (label) => ({
              name: label?.name,
              style: this.getLabelStyles(label?.color),
            })),
            teamName: `${_.toUpper(this.teamName)} Team`,
          });
        }
      }

      if (!_issues.length) {
        this.log(chalk.yellow(`no issues found!`));
        process.exit(1);
      }

      const document = {
        html: fs.readFileSync(__dirname + "/libs/template.html", "utf8"),
        data: {
          cards: _issues,
        },
        path: __dirname + `/files/${this.teamName}.pdf`,
      };
      const options: ICreateOptions = {
        format: "A4",
        orientation: "portrait",
        border: "10mm",
      };
      issueSpinner.stop();
      const pdfSpinner = createSpinner("generating pdf files...").start();
      await this.pdf.generate(document, options);
      pdfSpinner.success({ text: "complete" });
      this.openFiles();
    } catch (error) {
      this.log(
        chalk.red(`error occurred while fetching issues...`) + " " + error
      );
      process.exit(0);
    }
  }

  private async fetchIssue(issue: Issue) {
    try {
      const result = await this.githubClient.request(
        "GET /repos/{owner}/{repo}/issues/{issue_number}",
        {
          owner: this.owner,
          repo: issue.repo,
          issue_number: _.toNumber(issue.id),
        }
      );
      return result.data;
    } catch (error) {
      this.log("error finding issue ", error);
      return {};
    }
  }

  private handleIssueBodyStr(body: string, maxLen: number = 400) {
    try {
      const html = marked.parse(body);
      return html; // html.length > maxLen ? html.substring(0, maxLen) : html;
    } catch (error) {
      return "";
    }
  }

  async openFiles() {
    const path = __dirname + "/files/";
    const file = this.teamName + ".pdf";

    cp.exec(`open ${path}`, (err) => {
      if (err) this.log(chalk.red(`error opening folder`) + " " + err);
    });
    await this.delay(1000);
    cp.exec(`open -a Preview.app ${path}${file}`, (err) => {
      if (err) this.log(chalk.red(`error opening file`) + " " + err);
    });
  }

  private getLabelStyles(labelColor: string) {
    switch (labelColor) {
      case "3941AC":
        return `background-color: #${labelColor}; color: #FFFFFF;`;
      case "FBCA04":
        return `background-color: #${labelColor}; color: #000000;`;
      case "EBEA93":
        return `background-color: #${labelColor}; color: #000000;`;
      case "3CCD91":
        return `background-color: #${labelColor}; color: #000000;`;
      case "1F78C4":
        return `background-color: #${labelColor}; color: #FFFFFF;`;
      case "A45072":
        return `background-color: #${labelColor}; color: #FFFFFF;`;
      default:
        return `background-color: #${labelColor}; color: #FFFFFF";`;
    }
  }
}
