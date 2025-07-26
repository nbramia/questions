import { NextResponse } from "next/server";
import { Octokit } from "@octokit/rest";

const GITHUB_TOKEN = process.env.GITHUB_TOKEN!;
const GITHUB_REPO = "nbramia/questions";
const GITHUB_BRANCH = "main";
const FORMS_PATH = "docs/question";

const octokit = new Octokit({ auth: GITHUB_TOKEN });

interface FormInfo {
  id: string;
  title: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
  expires_at?: string;
  status: 'active' | 'disabled';
  isExpired: boolean;
  url: string;
}

export async function GET() {
  try {
    if (!GITHUB_TOKEN) {
      return NextResponse.json({ error: "GitHub token not configured" }, { status: 500 });
    }

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

    console.log(`Found ${formDirectories.length} form directories in tree`);
    formDirectories.forEach(dir => {
      console.log(`Directory: ${dir.path}`);
    });

    const forms: FormInfo[] = [];

    // Fetch config.json for each form directory
    for (const dir of formDirectories) {
      const formId = dir.path?.split("/").pop();
      if (!formId) continue;

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
          
          // Get commit info for creation and update dates
          const { data: commits } = await octokit.repos.listCommits({
            owner,
            repo,
            path: `${FORMS_PATH}/${formId}/config.json`,
            per_page: 2,
          });

          const created_at = commits[commits.length - 1]?.commit?.author?.date; // First commit (oldest)
          const updated_at = commits[0]?.commit?.author?.date; // Latest commit

          // Check if form is expired or manually disabled
          let status: 'active' | 'disabled' = 'active';
          let isExpired = false;
          console.log(`Form ${formId}: expires_at = ${config.expires_at}`);
          if (config.expires_at && config.expires_at !== null && config.expires_at !== "" && config.expires_at !== undefined) {
            const now = new Date();
            const expirationDate = new Date(config.expires_at);
            console.log(`Form ${formId}: now = ${now.toISOString()}, expiration = ${expirationDate.toISOString()}`);
            if (now > expirationDate) {
              status = 'disabled';
              isExpired = true;
              console.log(`Form ${formId}: EXPIRED - setting status to disabled`);
            }
          }

          forms.push({
            id: formId,
            title: config.title || "Untitled Form",
            description: config.description,
            created_at,
            updated_at,
            expires_at: config.expires_at,
            status,
            isExpired,
            url: `https://ramia.us/questions/${formId}/`,
          });
        }
      } catch (error) {
        console.error(`Error fetching config for form ${formId}:`, error);
        // Still include the form with basic info
        forms.push({
          id: formId,
          title: "Unknown Form",
          status: 'active',
          isExpired: false,
          url: `https://ramia.us/questions/${formId}/`,
        });
      }
    }

    // Sort by creation date (newest first)
    forms.sort((a, b) => {
      if (!a.created_at) return 1;
      if (!b.created_at) return -1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return NextResponse.json({ forms });
  } catch (error) {
    console.error("Error fetching forms:", error);
    return NextResponse.json({ error: "Failed to fetch forms" }, { status: 500 });
  }
} 