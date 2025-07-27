import { NextResponse } from 'next/server';
import { readSessionFromDrive } from '@/lib/storage/drive';

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(req: Request, { params }: PageProps) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Load session from Google Drive
    const session = await readSessionFromDrive(id);

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(session);

  } catch (error) {
    console.error('Error fetching session:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 