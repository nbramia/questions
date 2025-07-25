import { NextResponse } from "next/server";
import { Octokit } from "@octokit/rest";
import { nanoid } from "nanoid";
import { readFile } from "fs/promises";
import path from "path";

const GITHUB_TOKEN = process.env.GITHUB_TOKEN!;
const GITHUB_REPO = "your-org/your-repo"; // TODO: set this
const GITHUB_BRANCH = "main";
const TEMPLATE_PATH = "public/template/index.html";
const TARGET_PATH = "public/question";

const octokit = new Octokit({ auth: GITHUB_TOKEN });

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const id = nanoid(6);
    const { title, expiration, enforceUnique, questions } = body;

    const configContent = JSON.stringify({
      id,
      title,
      expires_at: parseExpiration(expiration),
      enforceUnique,
      questions,
    }, null, 2);

    const templatePath = path.join(process.cwd(), TEMPLATE_PATH);
    const templateHtml = await readFile(templatePath, "utf-8");

    const [owner, repo] = GITHUB_REPO.split("/");

    const { data: refData } = await octokit.git.getRef({ owner, repo, ref: `heads/${GITHUB_BRANCH}` });
    const latestCommitSha = refData.object.sha;

    const { data: commitData } = await octokit.git.getCommit({ owner, repo, commit_sha: latestCommitSha });
    const baseTree = commitData.tree.sha;

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

    const blobs = await Promise.all(files.map(async (f) => {
      const blob = await octokit.git.createBlob({
        owner,
        repo,
        content: f.content,
        encoding: "utf-8",
      });
      return { ...f, sha: blob.data.sha };
    }));

    const tree = blobs.map((b) => ({
      path: b.path,
      mode: "100644",
      type: "blob",
      sha: b.sha,
    }));

    const { data: newTree } = await octokit.git.createTree({
      owner,
      repo,
      base_tree: baseTree,
      tree,
    });

    const { data: commit } = await octokit.git.createCommit({
      owner,
      repo,
      message: `Add feedback form ${id}`,
      tree: newTree.sha,
      parents: [latestCommitSha],
    });

    await octokit.git.updateRef({
      owner,
      repo,
      ref: `heads/${GITHUB_BRANCH}`,
      sha: commit.sha,
    });

    const link = `https://${owner}.github.io/${repo}/question/${id}/`;
    return NextResponse.json({ link });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

function parseExpiration(input: string) {
  if (input.endsWith("h")) {
    const hours = parseInt(input.slice(0, -1), 10);
    const d = new Date();
    d.setHours(d.getHours() + hours);
    return d.toISOString();
  }
  return new Date(input).toISOString();
}