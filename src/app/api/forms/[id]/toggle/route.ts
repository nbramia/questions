import { NextResponse } from "next/server";
import { Octokit } from "@octokit/rest";

const GITHUB_TOKEN = process.env.GITHUB_TOKEN!;
const GITHUB_REPO = "nbramia/questions";
const GITHUB_BRANCH = "main";
const FORMS_PATH = "docs/question";

const octokit = new Octokit({ auth: GITHUB_TOKEN });

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!GITHUB_TOKEN) {
      return NextResponse.json({ error: "GitHub token not configured" }, { status: 500 });
    }

    const { id: formId } = await params;
    const { action } = await request.json(); // 'disable' or 'enable'
    const [owner, repo] = GITHUB_REPO.split("/");

    // Get the current commit SHA
    const { data: refData } = await octokit.git.getRef({ 
      owner, 
      repo, 
      ref: `heads/${GITHUB_BRANCH}` 
    });
    const latestCommitSha = refData.object.sha;

    // Get the current tree
    const { data: commitData } = await octokit.git.getCommit({ 
      owner, 
      repo, 
      commit_sha: latestCommitSha 
    });
    const baseTree = commitData.tree.sha;

    // Get the current config file
    const { data: configData } = await octokit.repos.getContent({
      owner,
      repo,
      path: `${FORMS_PATH}/${formId}/config.json`,
      ref: GITHUB_BRANCH,
    });

    if (!('content' in configData) || typeof configData.content !== 'string') {
      return NextResponse.json({ error: "Form config not found" }, { status: 404 });
    }

    const config = JSON.parse(Buffer.from(configData.content, 'base64').toString());

    // Update the expiration based on action
    if (action === 'disable') {
      // Set expiration to now (immediately disable)
      config.expires_at = new Date().toISOString();
    } else if (action === 'enable') {
      // Remove expiration (enable)
      delete config.expires_at;
    }

    // Create the updated config content
    const updatedConfigContent = JSON.stringify(config, null, 2);

    // Create blob for updated config
    const blob = await octokit.git.createBlob({
      owner,
      repo,
      content: updatedConfigContent,
      encoding: "utf-8",
    });

    // Create the new tree with just the updated config file
    const { data: newTree } = await octokit.git.createTree({
      owner,
      repo,
      base_tree: baseTree,
      tree: [{
        path: `${FORMS_PATH}/${formId}/config.json`,
        mode: "100644" as const,
        type: "blob" as const,
        sha: blob.data.sha,
      }],
    });

    // Create the commit
    const { data: commit } = await octokit.git.createCommit({
      owner,
      repo,
      message: `${action === 'disable' ? 'Disable' : 'Enable'} form ${formId}`,
      tree: newTree.sha,
      parents: [latestCommitSha],
    });

    // Update the branch
    await octokit.git.updateRef({
      owner,
      repo,
      ref: `heads/${GITHUB_BRANCH}`,
      sha: commit.sha,
    });

    return NextResponse.json({ 
      success: true, 
      status: action === 'disable' ? 'disabled' : 'active' 
    });
  } catch (error) {
    console.error("Error toggling form status:", error);
    return NextResponse.json({ error: "Failed to toggle form status" }, { status: 500 });
  }
} 