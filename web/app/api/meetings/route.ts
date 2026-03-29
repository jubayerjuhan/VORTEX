import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Meeting from '@/models/Meeting';

export async function GET(request: NextRequest) {
  console.log('[API] GET /api/meetings');

  try {
    await connectToDatabase();

    const q = request.nextUrl.searchParams.get('q');
    const tag = request.nextUrl.searchParams.get('tag');
    const page = Math.max(1, parseInt(request.nextUrl.searchParams.get('page') ?? '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(request.nextUrl.searchParams.get('limit') ?? '12', 10)));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};

    if (q && q.trim()) {
      const escaped = q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { title: { $regex: escaped, $options: 'i' } },
        { transcript: { $regex: escaped, $options: 'i' } },
        { 'summary.tldr': { $regex: escaped, $options: 'i' } },
      ];
    }

    if (tag && tag.trim()) {
      filter.tags = tag.trim();
    }

    const [meetings, total] = await Promise.all([
      Meeting.find(filter)
        .select('meetingId title date duration status summary.tldr summary.actionItems participants tags createdAt')
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Meeting.countDocuments(filter),
    ]);

    console.log('[API] Returning', meetings.length, 'of', total, 'meetings');

    return NextResponse.json({ meetings, total, page, limit, pages: Math.ceil(total / limit) });
  } catch (error) {
    console.error('[API] Error fetching meetings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch meetings' },
      { status: 500 }
    );
  }
}
