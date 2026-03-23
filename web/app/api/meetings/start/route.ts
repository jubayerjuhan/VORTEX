import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import connectToDatabase from '@/lib/mongodb';
import Meeting from '@/models/Meeting';

export async function POST(request: NextRequest) {
  console.log('[API] POST /api/meetings/start');

  try {
    const body = await request.json();
    const { title, date, participants } = body;

    await connectToDatabase();

    const meetingId = uuidv4();
    await Meeting.create({
      meetingId,
      title: title || 'Google Meet',
      date: date ? new Date(date) : new Date(),
      participants: participants || [],
      status: 'recording',
      processingStep: 'uploading',
    });

    console.log('[API] Meeting session started:', meetingId);
    return NextResponse.json({ success: true, meetingId }, { status: 201 });
  } catch (error) {
    console.error('[API] Start error:', error);
    return NextResponse.json({ error: 'Failed to start meeting session' }, { status: 500 });
  }
}
