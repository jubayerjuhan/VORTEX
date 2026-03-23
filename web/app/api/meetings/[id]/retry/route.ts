import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Meeting from '@/models/Meeting';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  console.log('[API] POST /api/meetings/', id, '/retry');

  try {
    await connectToDatabase();

    const meeting = await Meeting.findOne({ meetingId: id });

    if (!meeting) {
      return NextResponse.json(
        { error: 'Meeting not found' },
        { status: 404 }
      );
    }

    if (meeting.status !== 'failed') {
      return NextResponse.json(
        { error: 'Can only retry failed meetings' },
        { status: 400 }
      );
    }

    // Reset to processing state
    await Meeting.findOneAndUpdate(
      { meetingId: id },
      { status: 'processing', error: undefined }
    );

    return NextResponse.json({
      success: true,
      message: 'Meeting queued for retry. Note: Audio is required to re-run transcription.'
    });
  } catch (error) {
    console.error('[API] Error retrying meeting:', error);
    return NextResponse.json(
      { error: 'Failed to retry meeting' },
      { status: 500 }
    );
  }
}
