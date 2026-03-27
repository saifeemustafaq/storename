"use client";

import { useState, useEffect } from "react";
import type { DbStatus } from "../actions";

function useTimeAgo(isoString: string) {
  const [, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 10_000);
    return () => clearInterval(interval);
  }, []);

  const seconds = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ago`;
}

export default function DbStatusIndicator({
  status,
  expanded,
  onToggle,
  onRefresh,
}: {
  status: DbStatus;
  expanded: boolean;
  onToggle: () => void;
  onRefresh: () => void;
}) {
  const timeAgo = useTimeAgo(status.checkedAt);

  return (
    <div className="relative">
      <button
        onClick={onToggle}
        className="inline-flex items-center gap-1.5 px-2 py-1 text-[11px] rounded-md border border-black/10 hover:border-black/25 transition-colors cursor-pointer"
        title={status.connected ? "MongoDB connected" : "MongoDB disconnected"}
      >
        <span className="relative flex h-2 w-2">
          {status.connected && (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          )}
          <span
            className={`relative inline-flex rounded-full h-2 w-2 ${
              status.connected ? "bg-emerald-500" : "bg-red-500"
            }`}
          />
        </span>
        <span className="text-black/50 hidden sm:inline">
          {status.connected ? "Live" : "Offline"}
        </span>
      </button>

      {expanded && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-black/15 rounded-lg shadow-lg z-50 overflow-hidden">
          <div className="px-3 py-2.5 border-b border-black/10 flex items-center justify-between">
            <span className="text-xs font-medium text-black/70">Database Status</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRefresh();
              }}
              className="text-black/30 hover:text-black transition-colors cursor-pointer p-0.5"
              title="Refresh status"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
          <div className="px-3 py-2.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-black/40 uppercase tracking-wider">Connection</span>
              <span className={`text-xs font-medium ${status.connected ? "text-emerald-600" : "text-red-600"}`}>
                {status.connected ? "Connected" : "Disconnected"}
              </span>
            </div>
            {status.connected && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-black/40 uppercase tracking-wider">Database</span>
                  <span className="text-xs text-black/70 font-mono">{status.dbName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-black/40 uppercase tracking-wider">Documents</span>
                  <span className="text-xs text-black/70 font-mono">{status.ingredientCount}</span>
                </div>
              </>
            )}
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-black/40 uppercase tracking-wider">Last check</span>
              <span className="text-xs text-black/50">{timeAgo}</span>
            </div>
          </div>
          <div className="px-3 py-2 border-t border-black/10 bg-black/[0.02]">
            <p className="text-[10px] text-black/30">Auto-refreshes every 30s</p>
          </div>
        </div>
      )}
    </div>
  );
}
