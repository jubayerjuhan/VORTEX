import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Meeting from '@/models/Meeting';

export async function GET(request: NextRequest) {
  console.log('[API] GET /api/meetings');

  try {
    await connectToDatabase();

    const q = request.nextUrl.searchParams.get('q');
    const filter: Record<string, unknown> = {};
    if (q && q.trim()) {
      const escaped = q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.title = { $regex: escaped, $options: 'i' };
    }

    const meetings = await Meeting.find(filter)
      .select('meetingId title date duration status summary.tldr summary.actionItems participants createdAt')
      .sort({ date: -1 })
      .lean();

    console.log('[API] Returning', meetings.length, 'meetings');

    return NextResponse.json({ meetings });
  } catch (error) {
    console.error('[API] Error fetching meetings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch meetings' },
      { status: 500 }
    );
  }
}
