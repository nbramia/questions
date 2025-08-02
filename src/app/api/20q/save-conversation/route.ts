import { NextResponse } from 'next/server';
import { Octokit } from '@octokit/rest';

interface ExecutionMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface ConversationData {
  sessionId: string;
  goal: string;
  context?: string;
  messages: ExecutionMessage[];
  createdAt: string;
  updatedAt: string;
}

const GITHUB_TOKEN = process.env.GITHUB_TOKEN!;
const GITHUB_REPO = 'nbramia/questions';
const GITHUB_BRANCH = 'main';
const CONVERSATIONS_PATH = 'docs/conversations';

const octokit = new Octokit({ auth: GITHUB_TOKEN });

export async function POST(req: Request) {
  try {
    if (!GITHUB_TOKEN) {
      return NextResponse.json(
        { error: 'GitHub token not configured' },
        { status: 500 }
      );
    }

    const conversationData: ConversationData = await req.json();
    const { sessionId, goal, context, messages, createdAt, updatedAt } = conversationData;

    // Validate required fields
    if (!sessionId || !goal || !messages) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
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
    // const baseTree = commitData.tree.sha;

    // Create the conversation file content
    const conversationContent = {
      sessionId,
      goal,
      context,
      messages,
      createdAt,
      updatedAt
    };

    const fileContent = JSON.stringify(conversationContent, null, 2);
    const filePath = `${CONVERSATIONS_PATH}/${sessionId}.json`;

    // Check if file already exists
    let existingFileSha: string | undefined;
    try {
      const { data: existingFile } = await octokit.repos.getContent({
        owner,
        repo,
        path: filePath,
        ref: GITHUB_BRANCH,
      });
      if ('sha' in existingFile) {
        existingFileSha = existingFile.sha;
      }
    } catch {
      // File doesn't exist, which is fine for new conversations
    }

    // Create or update the file
    const { data: fileData } = await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: filePath,
      message: `Update conversation for session ${sessionId}`,
      content: Buffer.from(fileContent).toString('base64'),
      sha: existingFileSha,
      branch: GITHUB_BRANCH,
    });

    console.log('Conversation saved to GitHub:', sessionId);

    return NextResponse.json({
      success: true,
      sessionId,
      fileSha: fileData.content?.sha,
      message: 'Conversation saved successfully'
    });

  } catch (error) {
    console.error('Error saving conversation:', error);
    return NextResponse.json(
      { error: 'Failed to save conversation' },
      { status: 500 }
    );
  }
} 