import React, { useState, useEffect, useRef } from 'react';
import {
  Terminal,
  Activity,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import type { InvestigationEventLog } from '../types/api';
import { fetchEvents } from '../services/api';

interface LiveSSELogViewerProps {
  investigationId: string;
  isRunning: boolean;
}

export const LiveSSELogViewer: React.FC<LiveSSELogViewerProps> = ({
  investigationId,
  isRunning
}) => {
  const [logs, setLogs] = useState<InvestigationEventLog[]>([]);
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initial fetch of persisted events
    fetchEvents(investigationId)
      .then(setLogs)
      .catch((err) => console.error('Error fetching initial events:', err));

    // Connect to real-time SSE stream
    const eventSource = new EventSource(`/api/investigations/${investigationId}/stream`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data && data.event_type) {
          setLogs((prev) => {
            if (prev.some((e) => e.id === data.id)) return prev;
            return [...prev, data];
          });
        }
      } catch (err) {
        // Heartbeat or ping frame
      }
    };

    eventSource.onerror = (err) => {
      console.warn('SSE stream connection closed or error:', err);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [investigationId, isRunning]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="bg-white border border-[#E5E5E2] rounded-2xl p-4 shadow-xs font-body">
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-[#6C63E6]" />
          <span className="text-xs font-bold text-[#20242A]">
            Real-Time Agent Execution Stream
          </span>
          {isRunning && (
            <span className="badge badge-medium animate-pulse text-[9px]">
              <Activity size={10} /> Live Stream Active
            </span>
          )}
        </div>
        {isExpanded ? <ChevronUp className="w-4 h-4 text-[#737A80]" /> : <ChevronDown className="w-4 h-4 text-[#737A80]" />}
      </div>

      {isExpanded && (
        <div
          ref={scrollRef}
          className="mt-3 bg-[#1E242B] border border-[#333942] rounded-xl p-3 max-h-52 overflow-y-auto font-mono text-[11px] space-y-1.5"
        >
          {logs.length === 0 ? (
            <div className="text-slate-400">No execution events recorded yet.</div>
          ) : (
            logs.map((log, idx) => (
              <div key={log.id || idx} className="flex items-start gap-2 leading-relaxed">
                <span className="text-slate-500 text-[10px] flex-shrink-0">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
                <span style={{ color: getEventTypeColor(log.event_type) }} className="font-semibold flex-shrink-0">
                  [{log.event_type}]
                </span>
                <span className="text-slate-200 word-break-all">
                  {log.message}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

function getEventTypeColor(type: string) {
  if (type.includes('COMPLETED') || type.includes('CREATED')) return '#34D399';
  if (type.includes('FAILED') || type.includes('REJECTED')) return '#F87171';
  if (type.includes('CONTRADICTION')) return '#FBBF24';
  return '#818CF8';
}
