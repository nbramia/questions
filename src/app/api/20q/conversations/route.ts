import { NextResponse } from 'next/server';
import { Octokit } from '@octokit/rest';

interface ConversationInfo {
  sessionId: string;
  goal: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
}

const GITHUB_TOKEN = process.env.GITHUB_TOKEN!;
const GITHUB_REPO = 'nbramia/questions';
const GITHUB_BRANCH = 'main';
const CONVERSATIONS_PATH = 'docs/conversations';

const octokit = new Octokit({ auth: GITHUB_TOKEN });

export async function GET() {
  try {
    if (!GITHUB_TOKEN) {
      return NextResponse.json(
        { error: 'GitHub token not configured' },
        { status: 500 }
      );
    }

    const [owner, repo] = GITHUB_REPO.split('/');

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

    // Get the tree for the conversations directory
    const { data: treeData } = await octokit.git.getTree({
      owner,
      repo,
      tree_sha: baseTree,
      recursive: 'true',
    });

    // Find all conversation files
    const conversationFiles = treeData.tree.filter(item =>
      item.type === 'blob' &&
      item.path?.startsWith(CONVERSATIONS_PATH + '/') &&
      item.path?.endsWith('.json')
    );

    console.log(`Found ${conversationFiles.length} conversation files`);

    const conversations: ConversationInfo[] = [];

    // Fetch conversation data for each file
    for (const file of conversationFiles) {
      if (!file.path) continue;

      try {
        const { data: fileData } = await octokit.repos.getContent({
          owner,
          repo,
          path: file.path,
          ref: GITHUB_BRANCH,
        });

        if ('content' in fileData && typeof fileData.content === 'string') {
          const conversation = JSON.parse(Buffer.from(fileData.content, 'base64').toString());
          
          conversations.push({
            sessionId: conversation.sessionId,
            goal: conversation.goal,
            createdAt: conversation.createdAt,
            updatedAt: conversation.updatedAt,
            messageCount: conversation.messages?.length || 0
          });
        }
      } catch (error) {
        console.error(`Error reading conversation file ${file.path}:`, error);
      }
    }

    // Sort by updated date (newest first)
    conversations.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    return NextResponse.json({
      success: true,
      conversations
    });

  } catch (error) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch conversations' },
      { status: 500 }
    );
  }
} 