import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Meeting from '@/models/Meeting';

export async function GET() {
  try {
    await connectToDatabase();

    const [totals, byStatus, recentWeeks, topParticipants, topTags] = await Promise.all([
      // Total duration + action items
      Meeting.aggregate([
        { $match: { status: 'completed' } },
        {
          $group: {
            _id: null,
            totalDuration: { $sum: '$duration' },
            totalActionItems: { $sum: { $size: { $ifNull: ['$summary.actionItems', []] } } },
            totalMeetings: { $sum: 1 },
          },
        },
      ]),

      // Count by status
      Meeting.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),

      // Meetings per week for last 8 weeks
      Meeting.aggregate([
        {
          $match: {
            date: { $gte: new Date(Date.now() - 8 * 7 * 86400000) },
          },
        },
        {
          $group: {
            _id: {
              year: { $isoWeekYear: '$date' },
              week: { $isoWeek: '$date' },
            },
            count: { $sum: 1 },
            totalDuration: { $sum: '$duration' },
            // Use the first Monday of the week for labeling
            weekStart: { $min: '$date' },
          },
        },
        { $sort: { '_id.year': 1, '_id.week': 1 } },
      ]),

      // Top participants by frequency
      Meeting.aggregate([
        { $match: { status: 'completed' } },
        { $unwind: { path: '$participants', preserveNullAndEmptyArrays: false } },
        { $group: { _id: '$participants', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),

      // Top tags
      Meeting.aggregate([
        { $unwind: { path: '$tags', preserveNullAndEmptyArrays: false } },
        { $group: { _id: '$tags', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 15 },
      ]),
    ]);

    const summary = totals[0] ?? { totalDuration: 0, totalActionItems: 0, totalMeetings: 0 };

    const statusMap: Record<string, number> = {};
    for (const s of byStatus) statusMap[s._id] = s.count;

    return NextResponse.json({
      totalMeetings: (statusMap.completed ?? 0) + (statusMap.failed ?? 0) + (statusMap.processing ?? 0) + (statusMap.recording ?? 0),
      completedMeetings: statusMap.completed ?? 0,
      totalDurationSeconds: summary.totalDuration,
      totalActionItems: summary.totalActionItems,
      byStatus: statusMap,
      meetingsPerWeek: recentWeeks.map((w: { _id: { year: number; week: number }; count: number; totalDuration: number; weekStart: string }) => ({
        label: `W${w._id.week}`,
        weekStart: w.weekStart,
        count: w.count,
        totalDuration: w.totalDuration,
      })),
      topParticipants: topParticipants.map((p: { _id: string; count: number }) => ({ name: p._id, meetings: p.count })),
      topTags: topTags.map((t: { _id: string; count: number }) => ({ tag: t._id, count: t.count })),
    });
  } catch (error) {
    console.error('[API] Analytics error:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}
