'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import MeetingCard from '@/components/MeetingCard';
import LoadingSkeleton from '@/components/LoadingSkeleton';

interface Meeting {
  meetingId: string;
  title: string;
  date: string;
  duration: number;
  status: 'recording' | 'processing' | 'completed' | 'failed';
  summary?: { tldr?: string; actionItems?: string[] };
  participants?: string[];
}

type FilterType = 'all' | 'completed' | 'processing' | 'recording' | 'failed';

function StatCard({ label, value, icon, sub }: { label: string; value: string | number; icon: React.ReactNode; sub?: string }) {
  return (
    <div className="bg-gray-900 border border-gray-800/80 rounded-2xl p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="w-9 h-9 rounded-xl bg-gray-800 flex items-center justify-center text-gray-400">
          {icon}
        </div>
      </div>
      <div className="text-2xl font-bold text-white tracking-tight">{value}</div>
      <div className="text-gray-500 text-sm mt-0.5">{label}</div>
      {sub && <div className="text-gray-600 text-xs mt-1">{sub}</div>}
    </div>
  );
}

export default function HomePage() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rawQuery, setRawQuery] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const searchRef = useRef<HTMLInputElement>(null);
  const meetingsRef = useRef<Meeting[]>([]);

  const fetchMeetings = useCallback(async (q?: string) => {
    try {
      const url = q && q.trim() ? `/api/meetings?q=${encodeURIComponent(q.trim())}` : '/api/meetings';
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setMeetings(data.meetings);
      meetingsRef.current = data.meetings;
      setError(null);
    } catch {
      setError('Failed to load meetings. Make sure the server is running.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchMeetings();
  }, [fetchMeetings]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setSearchQuery(rawQuery);
      fetchMeetings(rawQuery);
    }, 300);
    return () => clearTimeout(t);
  }, [rawQuery, fetchMeetings]);

  // Auto-refresh while processing (avoids stale closure)
  useEffect(() => {
    const interval = setInterval(() => {
      if (meetingsRef.current.some((m) => m.status === 'processing')) {
        fetchMeetings(searchQuery);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchMeetings, searchQuery]);

  // Cmd+K to focus search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  // Stats
  const totalHours = (() => {
    const secs = meetings.reduce((a, m) => a + (m.duration || 0), 0);
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  })();

  const totalActions = meetings.reduce((a, m) => a + (m.summary?.actionItems?.length ?? 0), 0);

  const thisWeek = meetings.filter((m) => {
    const d = new Date(m.date);
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 86400000);
    return d > weekAgo;
  }).length;

  const counts: Record<FilterType, number> = {
    all: meetings.length,
    completed: meetings.filter((m) => m.status === 'completed').length,
    processing: meetings.filter((m) => m.status === 'processing').length,
    recording: meetings.filter((m) => m.status === 'recording').length,
    failed: meetings.filter((m) => m.status === 'failed').length,
  };

  const filtered = meetings.filter((m) => filter === 'all' || m.status === filter);

  const filters: { id: FilterType; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'completed', label: 'Completed' },
    { id: 'processing', label: 'Processing' },
    { id: 'failed', label: 'Failed' },
  ];

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-bold text-white">Your Meetings</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {loading ? 'Loading...' : `${counts.all} meeting${counts.all !== 1 ? 's' : ''} recorded`}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              ref={searchRef}
              type="text"
              value={rawQuery}
              onChange={(e) => setRawQuery(e.target.value)}
              placeholder="Search meetings..."
              className="w-64 bg-gray-900 border border-gray-800 rounded-xl pl-9 pr-10 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-600/60 focus:ring-1 focus:ring-blue-600/30 transition-all"
            />
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-600 bg-gray-800 px-1.5 py-0.5 rounded font-mono border border-gray-700">
              ⌘K
            </kbd>
          </div>

          <button
            onClick={() => fetchMeetings(searchQuery)}
            className="flex items-center gap-2 px-3 py-2 bg-gray-900 hover:bg-gray-800 text-gray-400 hover:text-gray-200 border border-gray-800 rounded-xl text-sm transition-all"
            title="Refresh"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* Stats bar */}
      {!loading && meetings.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            label="Total recordings"
            value={counts.all}
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>}
          />
          <StatCard
            label="Total recorded"
            value={totalHours}
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          />
          <StatCard
            label="Action items"
            value={totalActions}
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>}
            sub="across all meetings"
          />
          <StatCard
            label="This week"
            value={thisWeek}
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
            sub="meetings recorded"
          />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-500/8 border border-red-500/20 text-red-400 rounded-2xl p-4 mb-6 flex items-center gap-3 text-sm">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </div>
      )}

      {/* Filter tabs */}
      {!loading && meetings.length > 0 && (
        <div className="flex items-center gap-1 mb-6 bg-gray-900/50 rounded-xl p-1 border border-gray-800/60 w-fit">
          {filters.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filter === f.id
                  ? 'bg-gray-800 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {f.label}
              {counts[f.id] > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                  filter === f.id ? 'bg-gray-700 text-gray-300' : 'bg-gray-800 text-gray-500'
                }`}>
                  {counts[f.id]}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <LoadingSkeleton />
      ) : meetings.length === 0 ? (
        <EmptyState hasSearch={rawQuery.length > 0} />
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-gray-400 mb-2">No {filter} meetings</p>
          <button onClick={() => setFilter('all')} className="text-blue-400 text-sm hover:text-blue-300">
            Show all meetings
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((meeting) => (
            <MeetingCard key={meeting.meetingId} meeting={meeting} />
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState({ hasSearch }: { hasSearch: boolean }) {
  if (hasSearch) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-14 h-14 bg-gray-900 border border-gray-800 rounded-2xl flex items-center justify-center mb-4">
          <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <h3 className="text-gray-300 font-semibold mb-2">No results found</h3>
        <p className="text-gray-500 text-sm">Try a different search term</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6 bg-gradient-to-br from-blue-600/15 to-purple-600/10 border border-blue-600/15">
        <svg className="w-9 h-9 text-blue-400/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
        </svg>
      </div>
      <h3 className="text-white font-semibold text-lg mb-2">No meetings recorded yet</h3>
      <p className="text-gray-500 text-sm max-w-xs mb-8 leading-relaxed">
        Install the Chrome extension, join a Google Meet, and your meetings will appear here automatically.
      </p>
      <div className="flex flex-col items-center gap-3">
        <div className="flex items-center gap-2 text-xs text-gray-600 bg-gray-900 border border-gray-800 rounded-xl px-4 py-3">
          <span className="w-5 h-5 bg-blue-600 rounded-md flex items-center justify-center flex-shrink-0">
            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </span>
          <span className="text-gray-400">Load the <span className="text-gray-300 font-medium">extension/</span> folder in <span className="text-gray-300 font-medium">chrome://extensions</span></span>
        </div>
      </div>
    </div>
  );
}
