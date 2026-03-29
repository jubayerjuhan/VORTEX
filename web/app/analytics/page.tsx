'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface AnalyticsData {
  totalMeetings: number;
  completedMeetings: number;
  totalDurationSeconds: number;
  totalActionItems: number;
  byStatus: Record<string, number>;
  meetingsPerWeek: { label: string; weekStart: string; count: number; totalDuration: number }[];
  topParticipants: { name: string; meetings: number }[];
  topTags: { tag: string; count: number }[];
}

function formatDuration(s: number): string {
  if (!s) return '0m';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function StatCard({ label, value, sub, color = 'blue' }: { label: string; value: string | number; sub?: string; color?: string }) {
  const colors: Record<string, string> = {
    blue: 'from-blue-600/20 to-blue-600/5 border-blue-600/20',
    emerald: 'from-emerald-600/20 to-emerald-600/5 border-emerald-600/20',
    amber: 'from-amber-600/20 to-amber-600/5 border-amber-600/20',
    purple: 'from-purple-600/20 to-purple-600/5 border-purple-600/20',
  };
  return (
    <div className={`rounded-2xl border bg-gradient-to-br p-5 ${colors[color] ?? colors.blue}`}>
      <div className="text-3xl font-bold text-white tracking-tight mb-1">{value}</div>
      <div className="text-sm text-gray-400">{label}</div>
      {sub && <div className="text-xs text-gray-600 mt-1">{sub}</div>}
    </div>
  );
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/analytics')
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => { setError('Failed to load analytics'); setLoading(false); });
  }, []);

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-6 bg-gray-800 rounded w-40" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-gray-800 rounded-2xl" />)}
        </div>
        <div className="h-64 bg-gray-800 rounded-2xl" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-red-400 mb-4">{error ?? 'No data'}</p>
        <Link href="/" className="text-blue-400 hover:text-blue-300 text-sm">← Back to meetings</Link>
      </div>
    );
  }

  const maxWeekCount = Math.max(...data.meetingsPerWeek.map((w) => w.count), 1);

  return (
    <div className="max-w-5xl">
      <div className="mb-8">
        <h1 className="text-xl font-bold text-white">Analytics</h1>
        <p className="text-gray-500 text-sm mt-0.5">Overview of your meeting activity</p>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total meetings" value={data.totalMeetings} color="blue" />
        <StatCard
          label="Total recorded"
          value={formatDuration(data.totalDurationSeconds)}
          sub={`across ${data.completedMeetings} completed`}
          color="emerald"
        />
        <StatCard label="Action items" value={data.totalActionItems} sub="from completed meetings" color="amber" />
        <StatCard
          label="Avg meeting"
          value={data.completedMeetings ? formatDuration(Math.round(data.totalDurationSeconds / data.completedMeetings)) : '—'}
          sub="per session"
          color="purple"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Meetings per week bar chart */}
        <div className="lg:col-span-2 bg-gray-900 border border-gray-800/60 rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-gray-300 mb-5">Meetings per week (last 8 weeks)</h2>
          {data.meetingsPerWeek.length === 0 ? (
            <p className="text-gray-600 text-sm text-center py-8">No data yet</p>
          ) : (
            <div className="flex items-end gap-3 h-40">
              {data.meetingsPerWeek.map((w) => (
                <div key={w.label} className="flex-1 flex flex-col items-center gap-1.5">
                  <span className="text-xs text-gray-500 font-medium">{w.count}</span>
                  <div className="w-full relative" style={{ height: '100px' }}>
                    <div
                      className="absolute bottom-0 w-full bg-blue-600/70 hover:bg-blue-500/80 rounded-t-md transition-all"
                      style={{ height: `${(w.count / maxWeekCount) * 100}%` }}
                      title={`${w.count} meetings, ${formatDuration(w.totalDuration)}`}
                    />
                  </div>
                  <span className="text-[10px] text-gray-600">{w.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Status breakdown */}
        <div className="bg-gray-900 border border-gray-800/60 rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-gray-300 mb-5">By status</h2>
          <div className="space-y-3">
            {[
              { key: 'completed', label: 'Completed', color: 'bg-emerald-500' },
              { key: 'processing', label: 'Processing', color: 'bg-amber-500' },
              { key: 'recording', label: 'Recording', color: 'bg-blue-500' },
              { key: 'failed', label: 'Failed', color: 'bg-red-500' },
            ].map(({ key, label, color }) => {
              const count = data.byStatus[key] ?? 0;
              const pct = data.totalMeetings > 0 ? Math.round((count / data.totalMeetings) * 100) : 0;
              return (
                <div key={key}>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-gray-400">{label}</span>
                    <span className="text-gray-500">{count}</span>
                  </div>
                  <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                    <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top participants */}
        <div className="bg-gray-900 border border-gray-800/60 rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-gray-300 mb-5">Top participants</h2>
          {data.topParticipants.length === 0 ? (
            <p className="text-gray-600 text-sm text-center py-4">No participant data yet</p>
          ) : (
            <div className="space-y-2.5">
              {data.topParticipants.map((p, i) => (
                <div key={p.name} className="flex items-center gap-3">
                  <span className="text-xs text-gray-600 w-4 text-right">{i + 1}</span>
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0">
                    {p.name[0]?.toUpperCase()}
                  </div>
                  <span className="text-sm text-gray-300 flex-1 truncate">{p.name}</span>
                  <span className="text-xs text-gray-500">{p.meetings} {p.meetings === 1 ? 'meeting' : 'meetings'}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top tags */}
        <div className="bg-gray-900 border border-gray-800/60 rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-gray-300 mb-5">Top tags</h2>
          {data.topTags.length === 0 ? (
            <p className="text-gray-600 text-sm text-center py-4">No tags yet — add tags to your meetings</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {data.topTags.map((t) => (
                <Link
                  key={t.tag}
                  href={`/?tag=${encodeURIComponent(t.tag)}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/10 hover:bg-blue-600/20 border border-blue-600/20 text-blue-400 text-xs rounded-full transition-colors"
                >
                  {t.tag}
                  <span className="text-blue-500/60">{t.count}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
