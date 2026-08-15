import React from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import type { Contradiction, Document } from '../types/api';

interface ContradictionHunterProps {
  contradictions: Contradiction[];
  documents?: Document[];
  onOpenDocument?: (doc: Document) => void;
}

export const ContradictionHunter: React.FC<ContradictionHunterProps> = ({
  contradictions
}) => {
  const hasCritical = contradictions.some(c => c.severity === 'CRITICAL');

  return (
    <div className={`bg-white border rounded-2xl p-5 shadow-xs font-body mb-6 ${
      hasCritical ? 'border-rose-300' : 'border-[#E5E5E2]'
    }`}>
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#E5E5E2]">
        <h3 className="text-xs font-bold text-[#20242A] flex items-center gap-2 uppercase tracking-wider">
          <ShieldAlert className={`w-4 h-4 ${hasCritical ? 'text-rose-600' : 'text-amber-500'}`} />
          Section 5 — Adversarial Evidence & Contradiction Hunter
        </h3>

        <span className="text-[10px] text-[#737A80] font-semibold">
          Active Adversarial Engine
        </span>
      </div>

      <p className="text-xs text-[#737A80] mb-4">
        The system actively searched for counter-evidence, contract amendments, or operational records that could invalidate the proposed recovery.
      </p>

      {contradictions.length === 0 ? (
        <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <div>
            <div className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
              No Contradictions Discovered
            </div>
            <div className="text-xs text-[#20242A] mt-0.5">
              Adversarial agent scanned all uploaded contract clauses, emails, and telemetry files. No counter-evidence was found to invalidate the claim.
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {contradictions.map((c) => {
            const isCritical = c.severity === 'CRITICAL';
            return (
              <div
                key={c.id}
                className={`rounded-xl p-4 border ${
                  isCritical 
                    ? 'bg-rose-50/80 border-rose-200/80' 
                    : 'bg-[#F7F7F5] border-[#E5E5E2]'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`badge ${isCritical ? 'badge-critical' : c.severity === 'HIGH' ? 'badge-high' : 'badge-medium'}`}>
                      <AlertTriangle className="w-3 h-3" /> {c.severity} SEVERITY
                    </span>
                    <span className="text-xs font-semibold text-[#20242A] font-mono">
                      {c.contradiction_type}
                    </span>
                  </div>
                </div>

                <div className="text-xs font-semibold text-[#20242A] leading-relaxed">
                  {c.description}
                </div>

                {/* Recommendation Override Notice */}
                {isCritical && (
                  <div className="mt-3 bg-white border border-rose-200 rounded-lg p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <XCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                      <div>
                        <div className="text-[10px] font-bold text-rose-700 uppercase tracking-wider">
                          Recommendation Override: DO NOT DISPUTE
                        </div>
                        <div className="text-[11px] text-[#737A80]">
                          Deterministic pipeline overrode recovery score because contract amendment invalidates claim.
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
