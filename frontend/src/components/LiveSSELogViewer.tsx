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
    <div className="card-panel" style={{ padding: '12px' }}>
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Terminal size={14} color="#38BDF8" />
          <span style={{ fontSize: '12px', fontWeight: '700', color: '#F8FAFC' }}>
            Real-Time Agent Execution Stream
          </span>
          {isRunning && (
            <span className="badge badge-medium animate-pulse" style={{ fontSize: '9px' }}>
              <Activity size={10} /> Live Stream Active
            </span>
          )}
        </div>
        {isExpanded ? <ChevronUp size={16} color="#94A3B8" /> : <ChevronDown size={16} color="#94A3B8" />}
      </div>

      {isExpanded && (
        <div
          ref={scrollRef}
          style={{
            marginTop: '10px',
            background: '#090D16',
            border: '1px solid #1E293B',
            borderRadius: '4px',
            padding: '10px',
            maxHeight: '200px',
            overflowY: 'auto',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '11px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px'
          }}
        >
          {logs.length === 0 ? (
            <div style={{ color: '#64748B' }}>No execution events recorded yet.</div>
          ) : (
            logs.map((log, idx) => (
              <div key={log.id || idx} style={{ display: 'flex', gap: '8px', lineHeight: 1.4 }}>
                <span style={{ color: '#64748B', flexShrink: 0 }}>
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
                <span style={{ color: getEventTypeColor(log.event_type), fontWeight: '600', flexShrink: 0 }}>
                  [{log.event_type}]
                </span>
                <span style={{ color: '#F8FAFC', wordBreak: 'break-word' }}>
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
  if (type.includes('FAILED') || type.includes('REJECTED')) return '#EF4444';
  if (type.includes('CONTRADICTION')) return '#F59E0B';
  return '#38BDF8';
}
