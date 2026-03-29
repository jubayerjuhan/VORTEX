'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';

function SidebarInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTag = searchParams.get('tag');

  const [tags, setTags] = useState<string[]>([]);

  useEffect(() => {
    fetch('/api/analytics')
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.topTags)) {
          setTags(d.topTags.map((t: { tag: string }) => t.tag));
        }
      })
      .catch(() => {});
  }, []);

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-gray-900/80 backdrop-blur border-r border-gray-800/60 flex flex-col z-40">
      {/* Logo */}
      <div className="p-5 border-b border-gray-800/60">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg shadow-blue-900/40">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </div>
          <div>
            <h1 className="text-white font-bold text-base leading-none tracking-tight">MeetMind</h1>
            <p className="text-gray-500 text-xs mt-0.5">AI Meeting Assistant</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 overflow-y-auto">
        <div className="mb-1">
          <p className="text-gray-600 text-xs font-semibold uppercase tracking-wider px-3 mb-2">Workspace</p>
          <NavItem
            href="/"
            active={pathname === '/' && !activeTag}
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            }
            label="All Meetings"
          />
        </div>

        <div className="mt-6">
          <p className="text-gray-600 text-xs font-semibold uppercase tracking-wider px-3 mb-2">Tools</p>
          <div className="space-y-0.5">
            <NavItem
              href="/analytics"
              active={pathname === '/analytics'}
              icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              }
              label="Analytics"
            />
          </div>
        </div>

        {/* Tags section */}
        <div className="mt-6">
          <p className="text-gray-600 text-xs font-semibold uppercase tracking-wider px-3 mb-2">Tags</p>
          {tags.length === 0 ? (
            <p className="text-gray-700 text-xs px-3 py-1">No tags yet</p>
          ) : (
            <div className="space-y-0.5">
              {tags.map((tag) => (
                <Link
                  key={tag}
                  href={`/?tag=${encodeURIComponent(tag)}`}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all ${
                    activeTag === tag
                      ? 'bg-blue-600/15 text-blue-400 border border-blue-600/20'
                      : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/60'
                  }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  <span className="truncate">{tag}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-800/60 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-600">Personal Edition</span>
          <span className="text-xs text-gray-700 bg-gray-800/60 px-2 py-0.5 rounded-full">v1.0</span>
        </div>
        <div className="w-full h-1 bg-gray-800 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full" style={{ width: '100%' }} />
        </div>
      </div>
    </aside>
  );
}

export default function Sidebar() {
  return (
    <Suspense fallback={null}>
      <SidebarInner />
    </Suspense>
  );
}

function NavItem({ href, active, icon, label }: { href: string; active: boolean; icon: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
        active
          ? 'bg-blue-600/15 text-blue-400 border border-blue-600/20'
          : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/60'
      }`}
    >
      {icon}
      {label}
    </Link>
  );
}
