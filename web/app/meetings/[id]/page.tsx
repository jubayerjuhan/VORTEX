'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '@/components/Toast';

interface Meeting {
  meetingId: string;
  title: string;
  date: string;
  duration: number;
  status: 'recording' | 'processing' | 'completed' | 'failed';
  processingStep: 'uploading' | 'transcribing' | 'summarizing' | null;
  participants: string[];
  transcript: string;
  summary: {
    tldr: string;
    actionItems: string[];
    keyDecisions: string[];
    nextSteps: string[];
  };
  error?: string;
}

function formatDuration(s: number): string {
  if (!s) return '—';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

type TabId = 'tldr' | 'actionItems' | 'keyDecisions' | 'nextSteps';

const tabs: { id: TabId; label: string; icon: string }[] = [
  { id: 'tldr', label: 'Summary', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  { id: 'actionItems', label: 'Action Items', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
  { id: 'keyDecisions', label: 'Decisions', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
  { id: 'nextSteps', label: 'Next Steps', icon: 'M13 7l5 5m0 0l-5 5m5-5H6' },
];

export default function MeetingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const id = params.id as string;

  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('tldr');
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const titleInputRef = useRef<HTMLInputElement>(null);

  const fetchMeeting = async () => {
    try {
      const res = await fetch(`/api/meetings/${id}`);
      if (!res.ok) { setError(res.status === 404 ? 'Meeting not found' : 'Failed to load meeting'); return; }
      const data = await res.json();
      setMeeting(data.meeting);
      setError(null);
    } catch { setError('Failed to load meeting'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchMeeting(); }, [id]);

  useEffect(() => {
    if (meeting?.status !== 'processing' && meeting?.status !== 'recording') return;
    const t = setInterval(fetchMeeting, 5000);
    return () => clearInterval(t);
  }, [meeting?.status]);

  // Keyboard shortcuts: E = export, Cmd+Backspace = delete
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'e' && meeting?.status === 'completed') handleExport();
      if (e.key === 'Backspace' && (e.metaKey || e.ctrlKey)) handleDelete();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meeting]);

  useEffect(() => {
    if (isEditingTitle) titleInputRef.current?.focus();
  }, [isEditingTitle]);

  const handleTitleEdit = () => {
    if (!meeting) return;
    setTitleDraft(meeting.title);
    setIsEditingTitle(true);
  };

  const handleTitleSave = async () => {
    if (!meeting || !titleDraft.trim()) { setIsEditingTitle(false); return; }
    if (titleDraft.trim() === meeting.title) { setIsEditingTitle(false); return; }
    try {
      const res = await fetch(`/api/meetings/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: titleDraft.trim() }),
      });
      if (res.ok) {
        setMeeting((prev) => prev ? { ...prev, title: titleDraft.trim() } : prev);
        toast('Title updated', 'success');
      } else {
        toast('Failed to update title', 'error');
      }
    } catch { toast('Failed to update title', 'error'); }
    setIsEditingTitle(false);
  };

  const handleCopy = async (text: string, label = 'Copied to clipboard') => {
    try {
      await navigator.clipboard.writeText(text);
      toast(label, 'success');
    } catch { toast('Copy failed', 'error'); }
  };

  const handleExport = () => {
    if (!meeting) return;
    const md = [
      `# ${meeting.title}`,
      ``,
      `**Date:** ${formatDate(meeting.date)}`,
      `**Duration:** ${formatDuration(meeting.duration)}`,
      meeting.participants?.length ? `**Participants:** ${meeting.participants.join(', ')}` : '',
      ``,
      `## Summary`,
      ``,
      meeting.summary?.tldr || 'No summary available.',
      ``,
      `## Action Items`,
      ``,
      ...(meeting.summary?.actionItems?.map((i) => `- [ ] ${i}`) ?? ['None']),
      ``,
      `## Key Decisions`,
      ``,
      ...(meeting.summary?.keyDecisions?.map((i) => `- ${i}`) ?? ['None']),
      ``,
      `## Next Steps`,
      ``,
      ...(meeting.summary?.nextSteps?.map((i, n) => `${n + 1}. ${i}`) ?? ['None']),
      ``,
      `## Full Transcript`,
      ``,
      meeting.transcript || 'No transcript available.',
    ].join('\n');

    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${meeting.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast('Exported as Markdown', 'success');
  };

  const handleDelete = async () => {
    if (!confirm('Delete this meeting? This cannot be undone.')) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/meetings/${id}`, { method: 'DELETE' });
      if (res.ok) { router.push('/'); } else { toast('Failed to delete', 'error'); setDeleting(false); }
    } catch { toast('Failed to delete', 'error'); setDeleting(false); }
  };

  const handleRetry = async () => {
    try {
      const res = await fetch(`/api/meetings/${id}/retry`, { method: 'POST' });
      if (res.ok) {
        setMeeting((prev) => prev ? { ...prev, status: 'processing', error: undefined } : prev);
        toast('Meeting queued for retry', 'info');
      } else { toast('Retry failed', 'error'); }
    } catch { toast('Retry failed', 'error'); }
  };

  const getSectionCopyText = (): string => {
    if (!meeting?.summary) return '';
    if (activeTab === 'tldr') return meeting.summary.tldr || '';
    if (activeTab === 'actionItems') return (meeting.summary.actionItems || []).map((i) => `• ${i}`).join('\n');
    if (activeTab === 'keyDecisions') return (meeting.summary.keyDecisions || []).map((i) => `• ${i}`).join('\n');
    if (activeTab === 'nextSteps') return (meeting.summary.nextSteps || []).map((i, n) => `${n + 1}. ${i}`).join('\n');
    return '';
  };

  if (loading) {
    return (
      <div className="max-w-4xl animate-pulse space-y-6">
        <div className="h-5 bg-gray-800 rounded w-32" />
        <div className="h-8 bg-gray-800 rounded w-3/4" />
        <div className="h-4 bg-gray-800 rounded w-64" />
        <div className="flex gap-2 mt-6">
          {[...Array(4)].map((_, i) => <div key={i} className="h-10 bg-gray-800 rounded-xl flex-1" />)}
        </div>
        <div className="h-48 bg-gray-800 rounded-2xl" />
      </div>
    );
  }

  if (error || !meeting) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-red-400 mb-4">{error || 'Meeting not found'}</p>
        <Link href="/" className="text-blue-400 hover:text-blue-300 text-sm">← Back to meetings</Link>
      </div>
    );
  }

  const statusConfig = {
    recording: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    completed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    processing: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    failed: 'bg-red-500/10 text-red-400 border-red-500/20',
  };

  return (
    <div className="max-w-4xl">
      {/* Breadcrumb */}
      <Link href="/" className="inline-flex items-center gap-1.5 text-gray-500 hover:text-gray-300 text-sm mb-6 group transition-colors">
        <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        All Meetings
      </Link>

      {/* Header */}
      <div className="mb-8">
        {/* Title */}
        <div className="flex items-start gap-3 mb-3">
          {isEditingTitle ? (
            <input
              ref={titleInputRef}
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={handleTitleSave}
              onKeyDown={(e) => { if (e.key === 'Enter') handleTitleSave(); if (e.key === 'Escape') setIsEditingTitle(false); }}
              className="flex-1 text-2xl font-bold text-white bg-gray-900 border border-blue-600/50 rounded-xl px-4 py-2 focus:outline-none focus:ring-1 focus:ring-blue-600/40"
            />
          ) : (
            <h1
              className="text-2xl font-bold text-white flex-1 cursor-text hover:text-gray-200 transition-colors"
              onClick={handleTitleEdit}
            >
              {meeting.title}
            </h1>
          )}
          {!isEditingTitle && (
            <button
              onClick={handleTitleEdit}
              className="mt-1 p-1.5 text-gray-600 hover:text-gray-400 rounded-lg hover:bg-gray-800 transition-all"
              title="Edit title"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          )}
        </div>

        {/* Meta */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-500 mb-5">
          <span className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {formatDate(meeting.date)}
          </span>
          <span>·</span>
          <span className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {formatDuration(meeting.duration)}
          </span>
          {meeting.participants?.length > 0 && (
            <>
              <span>·</span>
              <span className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {meeting.participants.join(', ')}
              </span>
            </>
          )}
        </div>

        {/* Action bar */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${statusConfig[meeting.status]}`}>
            {meeting.status === 'processing' && <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" />}
            {meeting.status.charAt(0).toUpperCase() + meeting.status.slice(1)}
          </span>

          {meeting.status === 'completed' && (
            <button
              onClick={handleExport}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-900 hover:bg-gray-800 border border-gray-800 text-gray-400 hover:text-gray-200 rounded-full text-xs font-medium transition-all"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export Markdown
            </button>
          )}

          {meeting.status === 'completed' && (
            <button
              onClick={() => handleCopy(`${meeting.title}\n\n${meeting.summary?.tldr}\n\nAction Items:\n${meeting.summary?.actionItems?.map(i => `• ${i}`).join('\n')}`, 'Meeting notes copied')}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-900 hover:bg-gray-800 border border-gray-800 text-gray-400 hover:text-gray-200 rounded-full text-xs font-medium transition-all"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy Notes
            </button>
          )}

          {meeting.status === 'failed' && (
            <button
              onClick={handleRetry}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600/10 hover:bg-blue-600/20 border border-blue-600/20 text-blue-400 rounded-full text-xs font-medium transition-all"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Retry
            </button>
          )}

          <button
            onClick={handleDelete}
            disabled={deleting}
            className="ml-auto inline-flex items-center gap-2 px-3 py-1.5 bg-red-500/5 hover:bg-red-500/10 border border-red-500/15 text-red-500 hover:text-red-400 rounded-full text-xs font-medium transition-all disabled:opacity-50"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>

      {/* Processing / Recording banner */}
      {(meeting.status === 'processing' || meeting.status === 'recording') && (
        <div className="bg-amber-500/8 border border-amber-500/20 rounded-2xl p-5 mb-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-8 h-8 border-2 border-amber-400/50 border-t-amber-400 rounded-full animate-spin flex-shrink-0" />
            <div>
              <p className="text-amber-300 font-medium text-sm">
                {meeting.status === 'recording' ? 'Meeting is recording...' : 'Processing your meeting...'}
              </p>
              <p className="text-amber-400/50 text-xs mt-0.5">Page updates automatically every 5 seconds.</p>
            </div>
          </div>
          {/* Step progress */}
          <div className="flex items-center gap-2">
            {(['uploading', 'transcribing', 'summarizing'] as const).map((step, i) => {
              const stepLabels = { uploading: 'Uploading', transcribing: 'Transcribing', summarizing: 'Summarizing' };
              const currentIdx = ['uploading', 'transcribing', 'summarizing'].indexOf(meeting.processingStep ?? '');
              const isDone = currentIdx > i;
              const isActive = meeting.processingStep === step;
              return (
                <div key={step} className="flex items-center gap-2">
                  {i > 0 && <div className={`h-px w-8 ${isDone ? 'bg-amber-400' : 'bg-gray-700'}`} />}
                  <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border ${
                    isActive ? 'bg-amber-500/15 border-amber-500/30 text-amber-300' :
                    isDone ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                    'bg-gray-800/50 border-gray-700/50 text-gray-600'
                  }`}>
                    {isActive && <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" />}
                    {isDone && <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
                    {stepLabels[step]}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Failed banner */}
      {meeting.status === 'failed' && (
        <div className="bg-red-500/8 border border-red-500/20 rounded-2xl p-5 mb-6">
          <p className="text-red-400 font-medium text-sm mb-1">Processing failed</p>
          {meeting.error && <p className="text-red-400/60 text-xs">{meeting.error}</p>}
        </div>
      )}

      {/* Summary tabs */}
      {meeting.status === 'completed' && (
        <div className="mb-6">
          {/* Tab bar */}
          <div className="flex items-center gap-1 bg-gray-900/60 border border-gray-800/60 rounded-2xl p-1 mb-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-gray-800 text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                <svg className="w-3.5 h-3.5 hidden sm:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
                </svg>
                {tab.label}
                {tab.id === 'actionItems' && meeting.summary?.actionItems?.length > 0 && (
                  <span className="text-xs bg-blue-500/15 text-blue-400 px-1.5 py-0.5 rounded-full font-semibold">
                    {meeting.summary.actionItems.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="bg-gray-900 border border-gray-800/60 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-800/60">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                {tabs.find(t => t.id === activeTab)?.label}
              </span>
              <button
                onClick={() => handleCopy(getSectionCopyText())}
                className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-400 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy
              </button>
            </div>

            <div className="p-5">
              {activeTab === 'tldr' && (
                <p className="text-gray-200 leading-relaxed text-sm">
                  {meeting.summary?.tldr || <span className="text-gray-500">No summary available.</span>}
                </p>
              )}

              {activeTab === 'actionItems' && (
                <ul className="space-y-2.5">
                  {meeting.summary?.actionItems?.length > 0 ? (
                    meeting.summary.actionItems.map((item, i) => (
                      <li key={i} className="flex items-start gap-3 group">
                        <div className="w-4 h-4 border-2 border-gray-700 group-hover:border-blue-500/60 rounded mt-0.5 flex-shrink-0 transition-colors" />
                        <span className="text-gray-200 text-sm leading-snug">{item}</span>
                      </li>
                    ))
                  ) : <p className="text-gray-500 text-sm">No action items identified.</p>}
                </ul>
              )}

              {activeTab === 'keyDecisions' && (
                <ul className="space-y-3">
                  {meeting.summary?.keyDecisions?.length > 0 ? (
                    meeting.summary.keyDecisions.map((item, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <div className="w-1.5 h-1.5 bg-purple-400 rounded-full mt-2 flex-shrink-0" />
                        <span className="text-gray-200 text-sm leading-snug">{item}</span>
                      </li>
                    ))
                  ) : <p className="text-gray-500 text-sm">No key decisions identified.</p>}
                </ul>
              )}

              {activeTab === 'nextSteps' && (
                <ol className="space-y-3">
                  {meeting.summary?.nextSteps?.length > 0 ? (
                    meeting.summary.nextSteps.map((item, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <span className="w-5 h-5 rounded-full bg-blue-600/15 text-blue-400 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                        <span className="text-gray-200 text-sm leading-snug">{item}</span>
                      </li>
                    ))
                  ) : <p className="text-gray-500 text-sm">No next steps identified.</p>}
                </ol>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Transcript */}
      {meeting.transcript && (
        <div className="bg-gray-900 border border-gray-800/60 rounded-2xl overflow-hidden">
          <button
            onClick={() => setTranscriptOpen(!transcriptOpen)}
            className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-800/30 transition-colors"
          >
            <span className="flex items-center gap-2.5 text-sm font-medium text-gray-300">
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Full Transcript
              <span className="text-xs text-gray-600 font-normal">
                {meeting.transcript.split(' ').length} words
              </span>
            </span>
            <div className="flex items-center gap-3">
              {transcriptOpen && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleCopy(meeting.transcript, 'Transcript copied'); }}
                  className="text-xs text-gray-600 hover:text-gray-400 flex items-center gap-1 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy
                </button>
              )}
              <svg className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${transcriptOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </button>
          {transcriptOpen && (
            <div className="border-t border-gray-800/60 px-5 pb-5 pt-4">
              <pre className="text-gray-400 text-xs leading-relaxed whitespace-pre-wrap font-mono max-h-96 overflow-y-auto scrollbar-thin">
                {meeting.transcript}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
