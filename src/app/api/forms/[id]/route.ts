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

    // Get the current tree to find files to delete
    const { data: treeData } = await octokit.git.getTree({
      owner,
      repo,
      tree_sha: baseTree,
      recursive: "true",
    });

    // Find files in the form directory to delete
    const filesToDelete = treeData.tree.filter(item => 
      item.path?.startsWith(`${FORMS_PATH}/${formId}/`) && 
      item.type === "blob"
    );

    if (filesToDelete.length === 0) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }

    console.log(`Found ${filesToDelete.length} files to delete for form ${formId}`);

    // Create a new tree by removing the form files
    // We'll create a tree with all items except the ones we want to delete
    const treeItems = treeData.tree
      .filter(item => !item.path?.startsWith(`${FORMS_PATH}/${formId}/`))
      .map(item => ({
        path: item.path!,
        mode: item.mode as "100644" | "040000",
        type: item.type as "blob" | "tree",
        sha: item.sha!,
      }));

    console.log(`Creating new tree with ${treeItems.length} items (removed ${filesToDelete.length} files)`);

    // Create the new tree
    const { data: newTree } = await octokit.git.createTree({
      owner,
      repo,
      base_tree: baseTree,
      tree: treeItems,
    });

    console.log(`Created new tree with SHA: ${newTree.sha}`);

    // Create the commit
    const { data: commit } = await octokit.git.createCommit({
      owner,
      repo,
      message: `Delete form ${formId}`,
      tree: newTree.sha,
      parents: [latestCommitSha],
    });

    console.log(`Created commit with SHA: ${commit.sha}`);

    // Update the branch
    await octokit.git.updateRef({
      owner,
      repo,
      ref: `heads/${GITHUB_BRANCH}`,
      sha: commit.sha,
    });

    console.log(`Successfully deleted form ${formId}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting form:", error);
    return NextResponse.json({ error: "Failed to delete form" }, { status: 500 });
  }
} 