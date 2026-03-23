import { rm } from 'fs/promises';
import { join } from 'path';
import os from 'os';
import connectToDatabase from './mongodb';
import Meeting from '../models/Meeting';
import { transcribeAudioLongRunning } from './transcription';
import { summarizeMeeting } from './summarize';

export async function runMeetingPipeline(meetingId: string, audioBuffer: Buffer): Promise<void> {
  console.log('[Pipeline] Starting for meeting:', meetingId, '| audio size:', audioBuffer.length, 'bytes');

  await connectToDatabase();

  // Step 1: Transcription
  let transcript = '';
  try {
    console.log('[Pipeline] Step 1/2: Transcribing...');
    await Meeting.findOneAndUpdate({ meetingId }, { processingStep: 'transcribing' });

    transcript = await transcribeAudioLongRunning(audioBuffer);

    await Meeting.findOneAndUpdate({ meetingId }, { transcript, processingStep: 'summarizing' });
    console.log('[Pipeline] Transcription done, length:', transcript.length);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Pipeline] Transcription failed:', msg);
    await Meeting.findOneAndUpdate(
      { meetingId },
      { status: 'failed', processingStep: null, error: `Transcription failed: ${msg}` }
    );
    return;
  }

  // Step 2: Summarization
  try {
    console.log('[Pipeline] Step 2/2: Summarizing...');
    const summary = await summarizeMeeting(transcript);

    await Meeting.findOneAndUpdate(
      { meetingId },
      { summary, status: 'completed', processingStep: null }
    );
    console.log('[Pipeline] Pipeline complete for meeting:', meetingId);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Pipeline] Summarization failed:', msg);
    await Meeting.findOneAndUpdate(
      { meetingId },
      { status: 'failed', processingStep: null, error: `Summarization failed: ${msg}` }
    );
  }
}

export async function cleanupChunks(meetingId: string): Promise<void> {
  const dir = join(os.tmpdir(), 'meetmind-chunks', meetingId);
  try {
    await rm(dir, { recursive: true, force: true });
    console.log('[Pipeline] Cleaned up chunks for:', meetingId);
  } catch {
    // Not critical if cleanup fails
  }
}
