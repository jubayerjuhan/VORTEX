import { NextRequest, NextResponse } from 'next/server';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import os from 'os';
import connectToDatabase from '@/lib/mongodb';
import Meeting from '@/models/Meeting';
import { runMeetingPipeline, cleanupChunks } from '@/lib/pipeline';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  console.log('[API] POST /api/meetings/', id, '/finalize');

  try {
    const body = await request.json();
    const { duration, title } = body;

    await connectToDatabase();

    const meeting = await Meeting.findOne({ meetingId: id });
    if (!meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
    }

    // Update duration and title if provided
    const updates: Record<string, unknown> = { status: 'processing', processingStep: 'transcribing' };
    if (duration) updates.duration = duration;
    if (title && title !== meeting.title) updates.title = title;
    await Meeting.findOneAndUpdate({ meetingId: id }, updates);

    // Assemble chunks from disk
    const dir = join(os.tmpdir(), 'meetmind-chunks', id);
    let audioBuffer: Buffer;

    try {
      const files = (await readdir(dir)).filter(f => f.endsWith('.webm')).sort();
      console.log('[API] Assembling', files.length, 'chunks for meeting', id);

      if (files.length === 0) {
        throw new Error('No audio chunks found');
      }

      const buffers = await Promise.all(files.map(f => readFile(join(dir, f))));
      audioBuffer = Buffer.concat(buffers);
      console.log('[API] Assembled audio buffer:', audioBuffer.length, 'bytes');
    } catch (err) {
      await Meeting.findOneAndUpdate(
        { meetingId: id },
        { status: 'failed', processingStep: null, error: `Failed to assemble audio: ${err instanceof Error ? err.message : 'Unknown error'}` }
      );
      return NextResponse.json({ error: 'Failed to assemble audio chunks' }, { status: 500 });
    }

    // Run pipeline async (fire and forget)
    runMeetingPipeline(id, audioBuffer)
      .then(() => cleanupChunks(id))
      .catch(async (error) => {
        console.error('[API] Pipeline error:', error);
        await cleanupChunks(id);
      });

    return NextResponse.json({ success: true, meetingId: id });
  } catch (error) {
    console.error('[API] Finalize error:', error);
    return NextResponse.json({ error: 'Failed to finalize meeting' }, { status: 500 });
  }
}
