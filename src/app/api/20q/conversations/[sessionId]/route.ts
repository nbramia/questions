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

interface PageProps {
  params: Promise<{
    sessionId: string;
  }>;
}

export async function GET(req: Request, { params }: PageProps) {
  try {
    const { sessionId } = await params;
    
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    if (!GITHUB_TOKEN) {
      return NextResponse.json(
        { error: 'GitHub token not configured' },
        { status: 500 }
      );
    }

    const [owner, repo] = GITHUB_REPO.split('/');
    const filePath = `${CONVERSATIONS_PATH}/${sessionId}.json`;

    try {
      const { data: fileData } = await octokit.repos.getContent({
        owner,
        repo,
        path: filePath,
        ref: GITHUB_BRANCH,
      });

      if ('content' in fileData && typeof fileData.content === 'string') {
        const conversation: ConversationData = JSON.parse(
          Buffer.from(fileData.content, 'base64').toString()
        );

        return NextResponse.json(conversation);
      } else {
        return NextResponse.json(
          { error: 'Invalid file content' },
          { status: 500 }
        );
      }
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'status' in error && error.status === 404) {
        return NextResponse.json(
          { error: 'Conversation not found' },
          { status: 404 }
        );
      }
      throw error;
    }

  } catch (error) {
    console.error('Error fetching conversation:', error);
    return NextResponse.json(
      { error: 'Failed to fetch conversation' },
      { status: 500 }
    );
  }
} 