import { NextResponse } from "next/server";
import { Octokit } from "@octokit/rest";

const GITHUB_TOKEN = process.env.GITHUB_TOKEN!;
const GITHUB_REPO = "nbramia/questions";
const GITHUB_BRANCH = "main";
const FORMS_PATH = "docs/question";

const octokit = new Octokit({ auth: GITHUB_TOKEN });

// Helper function to normalize title for comparison
function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '') // Remove all non-alphanumeric characters
    .trim();
}

export async function POST(request: Request) {
  try {
    if (!GITHUB_TOKEN) {
      return NextResponse.json({ error: "GitHub token not configured" }, { status: 500 });
    }

    const { title, excludeFormId } = await request.json();
    
    if (!title || typeof title !== 'string') {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const normalizedInputTitle = normalizeTitle(title);

    const [owner, repo] = GITHUB_REPO.split("/");
    
    // Get the current commit SHA first
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
    
    // Get the tree for the forms directory
    const { data: treeData } = await octokit.git.getTree({
      owner,
      repo,
      tree_sha: baseTree,
      recursive: "true",
    });

    // Find all directories in the forms path
    const formDirectories = treeData.tree.filter(item => 
      item.type === "tree" && 
      item.path?.startsWith(FORMS_PATH + "/") &&
      item.path !== FORMS_PATH
    );

    // Check each form's title
    for (const dir of formDirectories) {
      const formId = dir.path?.split("/").pop();
      if (!formId) continue;

      // Skip the form being edited (if provided)
      if (excludeFormId && formId === excludeFormId) {
        continue;
      }

      try {
        // Get the config.json file for this form
        const { data: configData } = await octokit.repos.getContent({
          owner,
          repo,
          path: `${FORMS_PATH}/${formId}/config.json`,
          ref: GITHUB_BRANCH,
        });

        if ('content' in configData && typeof configData.content === 'string') {
          const config = JSON.parse(Buffer.from(configData.content, 'base64').toString());
          const existingTitle = config.title || "Untitled Form";
          const normalizedExistingTitle = normalizeTitle(existingTitle);

          if (normalizedInputTitle === normalizedExistingTitle) {
            return NextResponse.json({ 
              isDuplicate: true, 
              existingTitle,
              message: `A form with the title "${existingTitle}" already exists.` 
            });
          }
        }
      } catch (error) {
        console.error(`Error checking title for form ${formId}:`, error);
        // Continue checking other forms
      }
    }

    return NextResponse.json({ 
      isDuplicate: false,
      message: "Title is available." 
    });

  } catch (error) {
    console.error("Error checking title uniqueness:", error);
    return NextResponse.json({ error: "Failed to check title uniqueness" }, { status: 500 });
  }
} 