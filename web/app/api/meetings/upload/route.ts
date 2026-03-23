import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import connectToDatabase from '@/lib/mongodb';
import Meeting from '@/models/Meeting';
import { runMeetingPipeline } from '@/lib/pipeline';

export async function POST(request: NextRequest) {
  console.log('[API] POST /api/meetings/upload');

  try {
    const body = await request.json();
    const { audio, title, date, duration, participants } = body;

    if (!audio) {
      return NextResponse.json(
        { error: 'Audio data is required' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const meetingId = uuidv4();
    const meeting = await Meeting.create({
      meetingId,
      title: title || 'Untitled Meeting',
      date: date ? new Date(date) : new Date(),
      duration: duration || 0,
      participants: participants || [],
      status: 'processing',
      processingStep: 'transcribing',
    });

    console.log('[API] Meeting created with ID:', meetingId);

    // Convert base64 audio to buffer and run pipeline async
    const audioBuffer = Buffer.from(audio, 'base64');

    // Run pipeline without awaiting (fire and forget)
    runMeetingPipeline(meetingId, audioBuffer).catch((error) => {
      console.error('[API] Pipeline error for meeting', meetingId, ':', error);
    });

    return NextResponse.json(
      {
        success: true,
        meetingId,
        message: 'Meeting upload received. Processing started.'
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[API] Upload error:', error);
    return NextResponse.json(
      { error: 'Failed to process upload' },
      { status: 500 }
    );
  }
}
