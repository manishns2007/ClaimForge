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
  const [allLogs, setAllLogs] = useState<InvestigationEventLog[]>([]);
  const [visibleCount, setVisibleCount] = useState<number>(0);
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initial fetch of persisted events
    fetchEvents(investigationId)
      .then((data) => {
        setAllLogs(data);
        setVisibleCount(0);
      })
      .catch((err) => console.error('Error fetching initial events:', err));

    // Connect to real-time SSE stream
    const eventSource = new EventSource(`/api/investigations/${investigationId}/stream`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data && data.event_type) {
          setAllLogs((prev) => {
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

  // Sequential line-by-line reveal timer
  useEffect(() => {
    if (visibleCount < allLogs.length) {
      const timer = setTimeout(() => {
        setVisibleCount((prev) => prev + 1);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [visibleCount, allLogs]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [visibleCount]);

  return (
    <div className="bg-white border border-[#E5E5E2] rounded-2xl p-4 shadow-xs font-body mb-6">
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
        <div className="mt-3 rounded-xl border border-[#0F3830] bg-[#061110] shadow-xl overflow-hidden font-mono text-xs">
          {/* macOS Terminal Window Header */}
          <div className="bg-[#040D0C] border-b border-[#0E2421] px-3.5 py-2 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F56] inline-block" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E] inline-block" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#27C93F] inline-block" />
            </div>
            <span className="text-[10px] text-[#4E7570] font-medium">
              nexops@protocol:~$
            </span>
          </div>

          {/* Terminal Console Body */}
          <div
            ref={scrollRef}
            className="p-4 bg-[#061110] text-[#D1EBE7] max-h-56 overflow-y-auto space-y-2 leading-relaxed"
          >
            <div className="flex items-center gap-1.5 text-[11px] pb-1">
              <span className="text-[#00F2FE] font-bold">$</span>
              <span className="text-[#00F2FE] font-bold">nexops compile escrow.intent --network bch</span>
            </div>
            <div className="text-[#4E7570] text-[10px] mb-2 font-semibold">
              NexOps Protocol v1.2.4
            </div>

            {allLogs.length === 0 ? (
              <div className="text-[#4E7570] text-[11px]">
                <span className="text-[#4E7570] font-bold">[→]</span> Initializing agent event stream...
              </div>
            ) : (
              allLogs.slice(0, visibleCount).map((log, idx) => {
                const isSuccess = log.event_type.includes('COMPLETED') || log.event_type.includes('CREATED') || log.event_type.includes('CALCULATED');
                const isWarn = log.event_type.includes('CONTRADICTION') || log.event_type.includes('REJECTED');
                return (
                  <div key={log.id || idx} className="flex items-start gap-2 text-[11px] animate-fadeIn">
                    {isSuccess ? (
                      <span className="text-[#00E676] font-bold flex-shrink-0">[✓]</span>
                    ) : isWarn ? (
                      <span className="text-[#FFC107] font-bold flex-shrink-0">[⚠]</span>
                    ) : (
                      <span className="text-[#4E7570] font-bold flex-shrink-0">[→]</span>
                    )}
                    <div>
                      <span className="text-[#00F2FE] font-semibold mr-1.5">
                        [{log.event_type}]
                      </span>
                      <span>{log.message}</span>
                    </div>
                  </div>
                );
              })
            )}


          </div>
        </div>
      )}
    </div>
  );
};
