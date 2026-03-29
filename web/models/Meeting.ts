import mongoose, { Document, Schema } from 'mongoose';

export interface MeetingSummary {
  tldr: string;
  actionItems: string[];
  keyDecisions: string[];
  nextSteps: string[];
}

export interface IMeeting extends Document {
  meetingId: string;
  title: string;
  date: Date;
  duration: number;
  participants: string[];
  audioUrl?: string;
  transcript: string;
  summary: MeetingSummary;
  status: 'recording' | 'processing' | 'completed' | 'failed';
  processingStep: 'uploading' | 'transcribing' | 'summarizing' | null;
  createdAt: Date;
  error?: string;
  tags: string[];
  notes: string;
  speakerNames: Map<string, string>;
}

const MeetingSchema = new Schema<IMeeting>(
  {
    meetingId: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    date: { type: Date, required: true },
    duration: { type: Number, default: 0 },
    participants: [{ type: String }],
    audioUrl: { type: String },
    transcript: { type: String, default: '' },
    summary: {
      tldr: { type: String, default: '' },
      actionItems: [{ type: String }],
      keyDecisions: [{ type: String }],
      nextSteps: [{ type: String }],
    },
    status: {
      type: String,
      enum: ['recording', 'processing', 'completed', 'failed'],
      default: 'recording',
    },
    processingStep: {
      type: String,
      enum: ['uploading', 'transcribing', 'summarizing', null],
      default: null,
    },
    error: { type: String },
    tags: [{ type: String }],
    notes: { type: String, default: '' },
    speakerNames: { type: Map, of: String, default: {} },
  },
  {
    timestamps: true,
  }
);

MeetingSchema.index({ title: 'text', transcript: 'text', 'summary.tldr': 'text' });

const Meeting = mongoose.models.Meeting || mongoose.model<IMeeting>('Meeting', MeetingSchema);

export default Meeting;
