import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import os from 'os';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const chunk = formData.get('chunk') as File | null;
    const meetingId = formData.get('meetingId') as string | null;
    const chunkIndex = formData.get('chunkIndex') as string | null;

    if (!chunk || !meetingId || chunkIndex === null) {
      return NextResponse.json({ error: 'Missing chunk, meetingId, or chunkIndex' }, { status: 400 });
    }

    const dir = join(os.tmpdir(), 'meetmind-chunks', meetingId);
    await mkdir(dir, { recursive: true });

    const arrayBuffer = await chunk.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const paddedIndex = String(chunkIndex).padStart(6, '0');
    const filePath = join(dir, `chunk-${paddedIndex}.webm`);

    await writeFile(filePath, buffer);

    console.log(`[API] Chunk ${chunkIndex} saved for meeting ${meetingId} (${buffer.length} bytes)`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] Chunk save error:', error);
    return NextResponse.json({ error: 'Failed to save chunk' }, { status: 500 });
  }
}
