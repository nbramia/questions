import { NextResponse } from "next/server";
import { Octokit } from "@octokit/rest";
import { nanoid } from "nanoid";
import { readFile } from "fs/promises";
import path from "path";

const GITHUB_TOKEN = process.env.GITHUB_TOKEN!;
const GITHUB_REPO = "nbramia/questions"; 
const GITHUB_BRANCH = "main";
const TEMPLATE_PATH = "public/template/index.html";
const TARGET_PATH = "docs/question";

const octokit = new Octokit({ auth: GITHUB_TOKEN });

export async function POST(req: Request) {
  try {
    console.log("API route called");
    
    if (!GITHUB_TOKEN) {
      console.error("GITHUB_TOKEN is not set");
      return NextResponse.json({ error: "GitHub token not configured" }, { status: 500 });
    }

    const body = await req.json();
    const id = nanoid(6);
    const { title, expiration, enforceUnique, questions } = body;

    console.log("Creating form with ID:", id);

    const configContent = JSON.stringify({
      id,
      title,
      expires_at: parseExpiration(expiration),
      enforceUnique,
      questions,
      googleScriptUrl: process.env.GOOGLE_SCRIPT_URL || "https://script.google.com/macros/s/YOUR_DEPLOYED_SCRIPT_ID/exec",
    }, null, 2);

    const templatePath = path.join(process.cwd(), TEMPLATE_PATH);
    const templateHtml = await readFile(templatePath, "utf-8");

    const [owner, repo] = GITHUB_REPO.split("/");
    console.log("Repository:", GITHUB_REPO, "Owner:", owner, "Repo:", repo);

    try {
      const { data: refData } = await octokit.git.getRef({ owner, repo, ref: `heads/${GITHUB_BRANCH}` });
      const latestCommitSha = refData.object.sha;
      console.log("Latest commit SHA:", latestCommitSha);

          const { data: commitData } = await octokit.git.getCommit({ owner, repo, commit_sha: latestCommitSha });
    const baseTree = commitData.tree.sha;
    console.log("Base tree SHA:", baseTree);

    const files = [
      {
        path: `${TARGET_PATH}/${id}/config.json`,
        content: configContent,
      },
      {
        path: `${TARGET_PATH}/${id}/index.html`,
        content: templateHtml,
      },
    ];

    console.log("Creating blobs...");
    const blobs = await Promise.all(files.map(async (f) => {
      const blob = await octokit.git.createBlob({
        owner,
        repo,
        content: f.content,
        encoding: "utf-8",
      });
      return { ...f, sha: blob.data.sha };
    }));

    console.log("Creating tree...");
    const tree = blobs.map((b) => ({
      path: b.path,
      mode: "100644" as const,
      type: "blob" as const,
      sha: b.sha,
    }));

    const { data: newTree } = await octokit.git.createTree({
      owner,
      repo,
      base_tree: baseTree,
      tree,
    });

    console.log("Creating commit...");
    const { data: commit } = await octokit.git.createCommit({
      owner,
      repo,
      message: `Add feedback form ${id}`,
      tree: newTree.sha,
      parents: [latestCommitSha],
    });

    console.log("Updating ref...");
    await octokit.git.updateRef({
      owner,
      repo,
      ref: `heads/${GITHUB_BRANCH}`,
      sha: commit.sha,
    });

    const link = `https://${owner}.github.io/${repo}/question/${id}/`;
    console.log("Success! Link:", link);
    return NextResponse.json({ link });
  } catch (err) {
    console.error("GitHub API error:", err);
    return NextResponse.json({ error: "GitHub API error" }, { status: 500 });
  }
  } catch (err) {
    console.error("General error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

function parseExpiration(input: string) {
  if (!input || input.trim() === "") {
    return null; // No expiration
  }
  
  if (input.endsWith("h")) {
    const hours = parseInt(input.slice(0, -1), 10);
    const d = new Date();
    d.setHours(d.getHours() + hours);
    return d.toISOString();
  }
  
  if (input.endsWith("d")) {
    const days = parseInt(input.slice(0, -1), 10);
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString();
  }
  
  // Try to parse as ISO date
  try {
    return new Date(input).toISOString();
  } catch {
    return null;
  }
}