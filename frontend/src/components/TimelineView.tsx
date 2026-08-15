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
    <div className="bg-white border border-[#E5E5E2] rounded-2xl p-5 shadow-xs font-body mb-6">
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#E5E5E2]">
        <h3 className="text-xs font-bold text-[#20242A] flex items-center gap-2 uppercase tracking-wider">
          <Clock className="w-4 h-4 text-[#6C63E6]" />
          Section 4 — Reconstructed Investigation Timeline
        </h3>
        <span className="text-[10px] text-[#737A80] font-semibold">{timeline.length} Chronological Event(s)</span>
      </div>

      <div className="relative pl-5">
        {/* Timeline Vertical Line */}
        <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-[#E5E5E2]" />

        {timeline.length === 0 ? (
          <div className="py-6 text-center text-[#737A80] text-xs">
            No operational timeline events synthesized yet.
          </div>
        ) : (
          timeline.map((evt, idx) => {
            const doc = documents.find(d => d.id === evt.source_document_id);
            const tsDisplay = evt.timestamp
              ? new Date(evt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : `Event #${idx + 1}`;

            return (
              <div key={evt.id || idx} className="relative mb-4 pl-3">
                {/* Node Bullet */}
                <div 
                  className="absolute -left-[17px] top-1.5 w-2.5 h-2.5 rounded-full border border-white"
                  style={{ backgroundColor: getEventColor(evt.event_type) }}
                />

                <div className="bg-[#F7F7F5] border border-[#E5E5E2] rounded-xl p-3.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-[#6C63E6]">
                        {tsDisplay}
                      </span>
                      <span className="badge badge-medium text-[9px] bg-[#6C63E6]/10 text-[#6C63E6] border border-[#6C63E6]/25">
                        {evt.event_type}
                      </span>
                    </div>

                    {doc && (
                      <button
                        onClick={() => onOpenDocument(doc)}
                        className="text-[10px] text-[#737A80] hover:text-[#6C63E6] font-medium flex items-center gap-1 bg-transparent border-none cursor-pointer"
                      >
                        <ExternalLink className="w-3 h-3" /> {doc.filename}
                      </button>
                    )}
                  </div>

                  <div className="text-xs font-semibold text-[#20242A] mt-1.5 leading-relaxed">
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
  if (type.includes('OFF_RENT') || type.includes('NOTICE')) return '#D97706';
  if (type.includes('STOP') || type.includes('SHUTDOWN')) return '#DC2626';
  if (type.includes('MOVE') || type.includes('PICKUP') || type.includes('DEPARTURE')) return '#6C63E6';
  return '#059669';
}
