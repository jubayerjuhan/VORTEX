import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Meeting from '@/models/Meeting';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  console.log('[API] GET /api/meetings/', id);

  try {
    await connectToDatabase();

    const meeting = await Meeting.findOne({ meetingId: id }).lean();

    if (!meeting) {
      return NextResponse.json(
        { error: 'Meeting not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ meeting });
  } catch (error) {
    console.error('[API] Error fetching meeting:', error);
    return NextResponse.json(
      { error: 'Failed to fetch meeting' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  console.log('[API] PUT /api/meetings/', id);

  try {
    const body = await request.json();
    const { title, tags, notes, speakerNames } = body;

    if (title !== undefined && (typeof title !== 'string' || !title.trim())) {
      return NextResponse.json({ error: 'Title must be a non-empty string' }, { status: 400 });
    }

    const update: Record<string, unknown> = {};
    if (title !== undefined) update.title = title.trim();
    if (tags !== undefined) update.tags = Array.isArray(tags) ? tags.map(String) : [];
    if (notes !== undefined) update.notes = typeof notes === 'string' ? notes : '';
    if (speakerNames !== undefined && typeof speakerNames === 'object') update.speakerNames = speakerNames;

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    await connectToDatabase();

    const meeting = await Meeting.findOneAndUpdate(
      { meetingId: id },
      update,
      { new: true }
    ).lean();

    if (!meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, meeting });
  } catch (error) {
    console.error('[API] Error updating meeting:', error);
    return NextResponse.json({ error: 'Failed to update meeting' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  console.log('[API] DELETE /api/meetings/', id);

  try {
    await connectToDatabase();

    const meeting = await Meeting.findOneAndDelete({ meetingId: id });

    if (!meeting) {
      return NextResponse.json(
        { error: 'Meeting not found' },
        { status: 404 }
      );
    }

    console.log('[API] Meeting deleted:', id);
    return NextResponse.json({ success: true, message: 'Meeting deleted' });
  } catch (error) {
    console.error('[API] Error deleting meeting:', error);
    return NextResponse.json(
      { error: 'Failed to delete meeting' },
      { status: 500 }
    );
  }
}
