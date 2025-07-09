#!/usr/bin/env deno --allow-net=api.github.com --allow-env=GITHUB_TOKEN
import { GitHubFile, GitHubPR } from "./github.ts";

// Configuration
const GITHUB_TOKEN = Deno.env.get("GITHUB_TOKEN");
const setup = {
  owner: "torgeir",
  repo: "test-octokit-from-deno",
  branch: "main",
};

if (!GITHUB_TOKEN) {
  console.error("Error: GITHUB_TOKEN environment variable is required");
  Deno.exit(1);
}

const github = new GitHubPR(GITHUB_TOKEN, setup.owner, setup.repo);

const files: Array<GitHubFile> = [
  { path: "config/file-one.txt", content: "content-one" },
  { path: "config/file-two.txt", content: "content-two" },
];

const pr = await github.createPR({
  branchName: "feature/update-files-with-octokit-from-deno",
  title: "test update files with octokit from deno",
  commitMessage: "Update config files with new settings",
  files,
});

console.log(pr);
