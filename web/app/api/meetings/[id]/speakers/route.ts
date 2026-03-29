import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Meeting from '@/models/Meeting';

// POST /api/meetings/:id/speakers
// Body: { speakerNames: { "Speaker 1": "Alice", "Speaker 2": "Bob" } }
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const { speakerNames } = await request.json();

    if (!speakerNames || typeof speakerNames !== 'object' || Array.isArray(speakerNames)) {
      return NextResponse.json({ error: 'speakerNames must be an object' }, { status: 400 });
    }

    await connectToDatabase();

    const meeting = await Meeting.findOneAndUpdate(
      { meetingId: id },
      { speakerNames },
      { new: true }
    ).lean();

    if (!meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, speakerNames: (meeting as Record<string, unknown>).speakerNames });
  } catch (error) {
    console.error('[API] Error updating speaker names:', error);
    return NextResponse.json({ error: 'Failed to update speaker names' }, { status: 500 });
  }
}
