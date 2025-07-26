import { NextResponse } from "next/server";
import { Octokit } from "@octokit/rest";

const GITHUB_TOKEN = process.env.GITHUB_TOKEN!;
const GITHUB_REPO = "nbramia/questions";
const GITHUB_BRANCH = "main";
const FORMS_PATH = "docs/question";

const octokit = new Octokit({ auth: GITHUB_TOKEN });

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Fetch the config from GitHub Pages
    const configUrl = `https://nbramia.github.io/questions/question/${id}/config.json`;
    const configResponse = await fetch(configUrl, {
      cache: 'no-store',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; FormLoader/1.0)'
      }
    });

    if (!configResponse.ok) {
      console.error('Config not found:', configResponse.status);
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }

    const config = await configResponse.json();
    
    // Fetch the template HTML from GitHub Pages
    const templateUrl = `https://nbramia.github.io/questions/question/${id}/index.html`;
    const templateResponse = await fetch(templateUrl, {
      cache: 'no-store',
      headers: {
        'Accept': 'text/html',
        'User-Agent': 'Mozilla/5.0 (compatible; FormLoader/1.0)'
      }
    });
    
    if (!templateResponse.ok) {
      console.error('Template not found:', templateResponse.status);
      return NextResponse.json({ error: "Form template not found" }, { status: 404 });
    }
    
    let templateHtml = await templateResponse.text();

    // Inject the config into the template and bypass remote fetch
    templateHtml = templateHtml.replace(
      'let config = null;',
      `let config = ${JSON.stringify(config)};`
    ).replace(
      /fetch\(configPath\)[\s\S]*?\.catch\(\(\) => \{[\s\S]*?\}\);/,
      'renderForm(config);'  // Call renderForm directly with injected config
    );

    return new NextResponse(templateHtml, {
      headers: {
        'Content-Type': 'text/html',
      },
    });
  } catch (error) {
    console.error('Error loading form:', error);
    return NextResponse.json({ error: "Form not found" }, { status: 404 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!GITHUB_TOKEN) {
      return NextResponse.json({ error: "GitHub token not configured" }, { status: 500 });
    }

    const { id: formId } = await params;
    const [owner, repo] = GITHUB_REPO.split("/");

    console.log(`Attempting to delete form ${formId}`);

    // Get the latest commit SHA on the target branch
    const { data: refData } = await octokit.git.getRef({ owner, repo, ref: `heads/${GITHUB_BRANCH}` });
    const latestCommitSha = refData.object.sha;

    // Get the tree associated with the latest commit
    const { data: commitData } = await octokit.git.getCommit({ owner, repo, commit_sha: latestCommitSha });
    const baseTreeSha = commitData.tree.sha;

    // Grab the full tree so we can identify the exact blobs to delete
    const { data: treeData } = await octokit.git.getTree({ owner, repo, tree_sha: baseTreeSha, recursive: "true" });

    // Identify blobs under the form's directory
    const blobsToDelete = treeData.tree.filter(
      (item) => item.type === "blob" && item.path?.startsWith(`${FORMS_PATH}/${formId}/`)
    );

    if (blobsToDelete.length === 0) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }

    console.log(`Found ${blobsToDelete.length} blobs to delete for form ${formId}`);

    // Build a tree that deletes each blob (sha: null)
    const deleteTree = blobsToDelete.map((blob) => ({
      path: blob.path!,
      mode: "100644" as const,
      type: "blob" as const,
      sha: null, // Setting sha to null tells GitHub to delete this file
    }));

    // Create the new tree (based off baseTree) with deletions
    const { data: newTree } = await octokit.git.createTree({
      owner,
      repo,
      base_tree: baseTreeSha,
      tree: deleteTree,
    });

    // Commit the new tree
    const { data: newCommit } = await octokit.git.createCommit({
      owner,
      repo,
      message: `Delete form ${formId}`,
      tree: newTree.sha,
      parents: [latestCommitSha],
    });

    // Update the branch ref to point to the new commit
    await octokit.git.updateRef({ owner, repo, ref: `heads/${GITHUB_BRANCH}`, sha: newCommit.sha });

    console.log(`Successfully deleted form ${formId}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting form:", error);
    return NextResponse.json({ error: "Failed to delete form" }, { status: 500 });
  }
} 