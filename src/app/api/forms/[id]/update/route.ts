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
    const body = await request.json();
    const { title, description, expiration, enforceUnique, questions } = body;

    console.log(`Updating form ${formId}`);

    const [owner, repo] = GITHUB_REPO.split("/");

    // Parse expiration
    let expires_at = undefined;
    if (expiration && expiration.trim() !== "") {
      if (expiration.endsWith("m")) {
        const minutes = parseInt(expiration.slice(0, -1), 10);
        const d = new Date();
        d.setMinutes(d.getMinutes() + minutes);
        expires_at = d.toISOString();
      } else if (expiration.endsWith("h")) {
        const hours = parseInt(expiration.slice(0, -1), 10);
        const d = new Date();
        d.setHours(d.getHours() + hours);
        expires_at = d.toISOString();
      } else if (expiration.endsWith("d")) {
        const days = parseInt(expiration.slice(0, -1), 10);
        const d = new Date();
        d.setDate(d.getDate() + days);
        expires_at = d.toISOString();
      }
    }

    // Create updated config
    const config = {
      id: formId,
      title,
      description,
      enforceUnique,
      questions,
      googleScriptUrl: process.env.GOOGLE_SCRIPT_URL!,
      expires_at,
    };

    const configContent = JSON.stringify(config, null, 2);

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

    // Create blob for updated config
    const { data: configBlob } = await octokit.git.createBlob({
      owner,
      repo,
      content: configContent,
      encoding: "utf-8",
    });

    // Create the new tree with updated config
    const { data: newTree } = await octokit.git.createTree({
      owner,
      repo,
      base_tree: baseTree,
      tree: [{
        path: `${FORMS_PATH}/${formId}/config.json`,
        mode: "100644" as const,
        type: "blob" as const,
        sha: configBlob.sha,
      }],
    });

    // Create the commit
    const { data: commit } = await octokit.git.createCommit({
      owner,
      repo,
      message: `Update form ${formId}`,
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

    const formUrl = `https://ramia.us/questions/${formId}/`;
    console.log(`Successfully updated form ${formId}`);
    console.log(`Form URL: ${formUrl}`);

    return NextResponse.json({ 
      success: true, 
      formId,
      formUrl,
      message: `Form updated successfully!`
    });
  } catch (error) {
    console.error("Error updating form:", error);
    return NextResponse.json({ error: "Failed to update form" }, { status: 500 });
  }
} 