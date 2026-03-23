import Link from 'next/link';

interface Meeting {
  meetingId: string;
  title: string;
  date: string;
  duration: number;
  status: 'recording' | 'processing' | 'completed' | 'failed';
  summary?: {
    tldr?: string;
    actionItems?: string[];
  };
  participants?: string[];
}

function formatDuration(seconds: number): string {
  if (!seconds) return '—';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / 86400000);

  if (days === 0) return 'Today, ' + date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  if (days === 1) return 'Yesterday, ' + date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  if (days < 7) return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const statusConfig = {
  recording: { label: 'Recording', dot: 'bg-blue-400 animate-pulse', text: 'text-blue-400', bar: 'bg-blue-500' },
  completed: { label: 'Completed', dot: 'bg-emerald-400', text: 'text-emerald-400', bar: 'bg-emerald-500' },
  processing: { label: 'Processing', dot: 'bg-amber-400 animate-pulse', text: 'text-amber-400', bar: 'bg-amber-500' },
  failed: { label: 'Failed', dot: 'bg-red-400', text: 'text-red-400', bar: 'bg-red-500' },
};

export default function MeetingCard({ meeting }: { meeting: Meeting }) {
  const config = statusConfig[meeting.status] ?? statusConfig.failed;
  const actionCount = meeting.summary?.actionItems?.length ?? 0;

  return (
    <Link href={`/meetings/${meeting.meetingId}`} className="block group">
      <div className="relative bg-gray-900 border border-gray-800/80 rounded-2xl overflow-hidden hover:border-gray-700 transition-all duration-200 hover:shadow-xl hover:shadow-black/30 hover:-translate-y-0.5">
        {/* Status stripe */}
        <div className={`absolute left-0 top-0 bottom-0 w-0.5 ${config.bar}`} />

        <div className="p-5 pl-6">
          {/* Top row */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <h3 className="text-gray-100 font-semibold text-sm leading-snug group-hover:text-white transition-colors line-clamp-2 flex-1">
              {meeting.title}
            </h3>
            <div className={`flex items-center gap-1.5 flex-shrink-0 text-xs font-medium ${config.text}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
              {config.label}
            </div>
          </div>

          {/* Meta row */}
          <div className="flex items-center gap-3 text-xs text-gray-500 mb-4">
            <span className="flex items-center gap-1.5">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {formatDate(meeting.date)}
            </span>
            <span>·</span>
            <span className="flex items-center gap-1.5">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {formatDuration(meeting.duration)}
            </span>
          </div>

          {/* Summary */}
          {meeting.status === 'completed' && meeting.summary?.tldr && (
            <p className="text-gray-400 text-xs leading-relaxed line-clamp-2 mb-4">
              {meeting.summary.tldr}
            </p>
          )}
          {meeting.status === 'recording' && (
            <div className="flex items-center gap-2 text-xs text-blue-400/80 mb-4">
              <div className="w-3 h-3 border border-blue-400/60 border-t-transparent rounded-full animate-spin flex-shrink-0" />
              Recording in progress...
            </div>
          )}
          {meeting.status === 'processing' && (
            <div className="flex items-center gap-2 text-xs text-amber-400/80 mb-4">
              <div className="w-3 h-3 border border-amber-400/60 border-t-transparent rounded-full animate-spin flex-shrink-0" />
              Transcribing your meeting...
            </div>
          )}
          {meeting.status === 'failed' && (
            <p className="text-red-400/80 text-xs mb-4">Processing failed — click to retry</p>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-800/60">
            <div className="flex items-center gap-1.5">
              {meeting.participants && meeting.participants.length > 0 ? (
                <>
                  <div className="flex -space-x-1.5">
                    {meeting.participants.slice(0, 3).map((p, i) => (
                      <div
                        key={i}
                        className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 border border-gray-900 flex items-center justify-center text-white text-[9px] font-bold"
                        title={p}
                      >
                        {p[0]?.toUpperCase()}
                      </div>
                    ))}
                  </div>
                  <span className="text-gray-500 text-xs">
                    {meeting.participants.length} {meeting.participants.length === 1 ? 'participant' : 'participants'}
                  </span>
                </>
              ) : (
                <span className="text-gray-600 text-xs">No participants</span>
              )}
            </div>
            {actionCount > 0 && (
              <span className="text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full font-medium">
                {actionCount} {actionCount === 1 ? 'action' : 'actions'}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
