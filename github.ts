import { Octokit } from "https://esm.sh/@octokit/rest@22.0.0";

export type GitHubFile = {
  path: string;
  content: string;
  encoding?: string;
};

const baseBranch: string = "main";

export class GitHubPR {
  octokit: Octokit;
  owner: string;
  repo: string;

  constructor(token: string, owner: string, repo: string) {
    this.octokit = new Octokit({ auth: token });
    this.owner = owner;
    this.repo = repo;
  }

  async createPR(opts: {
    branchName: string;
    title: string;
    body?: string;
    files: Array<GitHubFile>;
    commitMessage: string;
  }) {
    const {
      branchName,
      title,
      body = "",
      files,
      commitMessage,
    } = opts;

    // Create branch from base, expects content in repo
    const { data: baseRef } = await this.octokit.rest.git.getRef({
      owner: this.owner,
      repo: this.repo,
      ref: `heads/${baseBranch}`,
    });

    await this.octokit.rest.git.createRef({
      owner: this.owner,
      repo: this.repo,
      ref: `refs/heads/${branchName}`,
      sha: baseRef.object.sha,
    });

    // Create blobs for all files
    const tree: Array<{
      path: string;
      type: "blob" | "tree" | "commit" | undefined;
      mode:
        | "100644"
        | "100755"
        | "040000"
        | "160000"
        | "120000"
        | undefined;
      sha: string;
    }> = [];
    for (const file of files) {
      const { data: blob } = await this.octokit.rest.git.createBlob({
        owner: this.owner,
        repo: this.repo,
        content: file.content,
        encoding: file.encoding ?? "utf-8",
      });

      tree.push({
        path: file.path,
        mode: "100644",
        type: "blob",
        sha: blob.sha,
      });
    }

    // Get base tree
    const { data: baseCommit } = await this.octokit.rest.git.getCommit({
      owner: this.owner,
      repo: this.repo,
      commit_sha: baseRef.object.sha,
    });

    // Create new tree
    const { data: newTree } = await this.octokit.rest.git.createTree({
      owner: this.owner,
      repo: this.repo,
      base_tree: baseCommit.tree.sha,
      tree,
    });

    // Create commit
    const { data: newCommit } = await this.octokit.rest.git.createCommit({
      owner: this.owner,
      repo: this.repo,
      message: commitMessage,
      tree: newTree.sha,
      parents: [baseRef.object.sha],
    });

    // Update branch reference
    await this.octokit.rest.git.updateRef({
      owner: this.owner,
      repo: this.repo,
      ref: `heads/${branchName}`,
      sha: newCommit.sha,
    });

    // Create PR
    const { data: pr } = await this.octokit.rest.pulls.create({
      owner: this.owner,
      repo: this.repo,
      title,
      body,
      head: branchName,
      base: baseBranch,
    });

    return pr;
  }
}
