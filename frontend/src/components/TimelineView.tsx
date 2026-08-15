import React from 'react';
import {
  Clock,
  ExternalLink
} from 'lucide-react';
import type { TimelineEvent, Document } from '../types/api';

interface TimelineViewProps {
  timeline: TimelineEvent[];
  documents: Document[];
  onOpenDocument: (doc: Document) => void;
}

export const TimelineView: React.FC<TimelineViewProps> = ({
  timeline,
  documents,
  onOpenDocument
}) => {
  return (
    <div className="card-panel" style={{ marginBottom: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#F8FAFC', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Clock size={16} color="#38BDF8" />
          SECTION 4 — RECONSTRUCTED INVESTIGATION TIMELINE
        </h3>
        <span style={{ fontSize: '10px', color: '#94A3B8' }}>{timeline.length} Chronological Event(s)</span>
      </div>

      <div style={{ position: 'relative', paddingLeft: '20px' }}>
        {/* Timeline Line */}
        <div style={{
          position: 'absolute',
          left: '7px',
          top: '8px',
          bottom: '8px',
          width: '2px',
          background: '#1E293B'
        }} />

        {timeline.length === 0 ? (
          <div style={{ padding: '20px', color: '#64748B', fontSize: '12px' }}>
            No operational timeline events synthesized yet.
          </div>
        ) : (
          timeline.map((evt, idx) => {
            const doc = documents.find(d => d.id === evt.source_document_id);
            const tsDisplay = evt.timestamp
              ? new Date(evt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : `Event #${idx + 1}`;

            return (
              <div key={evt.id || idx} style={{ position: 'relative', marginBottom: '18px', paddingLeft: '12px' }}>
                {/* Node Bullet */}
                <div style={{
                  position: 'absolute',
                  left: '-17px',
                  top: '4px',
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: getEventColor(evt.event_type),
                  boxShadow: `0 0 8px ${getEventColor(evt.event_type)}`
                }} />

                <div style={{ background: '#0B1120', border: '1px solid #1E293B', borderRadius: '6px', padding: '10px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontFamily: 'monospace', fontSize: '11px', fontWeight: '700', color: '#38BDF8' }}>
                        {tsDisplay}
                      </span>
                      <span className="badge badge-medium" style={{ fontSize: '9px', background: 'rgba(56, 189, 248, 0.1)', color: '#38BDF8' }}>
                        {evt.event_type}
                      </span>
                    </div>

                    {doc && (
                      <button
                        onClick={() => onOpenDocument(doc)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#64748B',
                          cursor: 'pointer',
                          fontSize: '10px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px'
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = '#38BDF8')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = '#64748B')}
                      >
                        <ExternalLink size={10} /> {doc.filename}
                      </button>
                    )}
                  </div>

                  <div style={{ fontSize: '12px', color: '#F8FAFC', marginTop: '4px', fontWeight: '500' }}>
                    {evt.description}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

function getEventColor(type: string) {
  if (type.includes('OFF_RENT') || type.includes('NOTICE')) return '#F59E0B';
  if (type.includes('STOP') || type.includes('SHUTDOWN')) return '#EF4444';
  if (type.includes('MOVE') || type.includes('PICKUP') || type.includes('DEPARTURE')) return '#8B5CF6';
  return '#10B981';
}
