import React from 'react';
import {
  ShieldCheck,
  Cpu,
  Scale
} from 'lucide-react';
import type { Claim, Investigation } from '../types/api';

interface ClaimSummaryProps {
  investigation: Investigation;
  claim?: Claim | null;
}

export const ClaimSummary: React.FC<ClaimSummaryProps> = ({ investigation, claim }) => {
  // Deterministic reason summary
  const reasonText = claim?.reason || 'Calculated off-rent billing discrepancy post-notice cutoff.';

  return (
    <div className="bg-white border border-[#E5E5E2] rounded-2xl p-5 shadow-xs font-body mb-6">
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#E5E5E2]">
        <h3 className="text-xs font-bold text-[#20242A] flex items-center gap-2 uppercase tracking-wider">
          <Scale className="w-4 h-4 text-[#6C63E6]" />
          Section 1 — Claim & Financial Reconciliation Summary
        </h3>

        <div className="flex items-center gap-2">
          <span className="bg-[#6C63E6]/10 text-[#6C63E6] border border-[#6C63E6]/25 px-2.5 py-0.5 rounded-full text-[10px] font-semibold flex items-center gap-1">
            <Cpu className="w-3 h-3" /> AI ANALYSIS
          </span>
          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200/80 px-2.5 py-0.5 rounded-full text-[10px] font-semibold flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" /> VERIFIED BY RULE ENGINE
          </span>
        </div>
      </div>

      {/* Grid of Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <div className="bg-[#F7F7F5] border border-[#E5E5E2] rounded-xl p-3.5">
          <div className="text-xs text-[#737A80] font-medium">Billed Original Amount</div>
          <div className="text-lg font-bold font-display text-[#20242A] mt-1">
            ${investigation.total_analyzed_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div className="bg-[#F7F7F5] border border-[#E5E5E2] rounded-xl p-3.5">
          <div className="text-xs text-[#737A80] font-medium">Disputed Excess Amount</div>
          <div className="text-lg font-bold font-display text-amber-600 mt-1">
            ${investigation.total_disputed_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div className="bg-[#F7F7F5] border border-[#E5E5E2] rounded-xl p-3.5">
          <div className="text-xs text-[#737A80] font-medium">Expected Recovery</div>
          <div className="text-lg font-bold font-display text-emerald-600 mt-1">
            ${investigation.total_expected_recovery.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div className="bg-[#F7F7F5] border border-[#E5E5E2] rounded-xl p-3.5">
          <div className="text-xs text-[#737A80] font-medium">Recoverability Score</div>
          <div className="text-lg font-bold font-display text-[#6C63E6] mt-1">
            {claim ? Math.round(claim.recoverability_score * 100) : 0} / 100
          </div>
        </div>
      </div>

      {/* Deterministic Explanation Callout */}
      <div className="bg-[#F7F7F5] border-l-4 border-[#6C63E6] border-y border-r border-[#E5E5E2] p-4 rounded-r-xl">
        <div className="text-[10px] font-bold text-[#6C63E6] uppercase tracking-wider">
          Deterministic Engine Audit Explanation:
        </div>
        <div className="text-xs font-semibold text-[#20242A] mt-1 font-mono">
          "{reasonText}"
        </div>
        <div className="text-[11px] text-[#737A80] mt-1">
          Financial reconciliation calculated by deterministic Python engine based on normalized contract rules and telemetry timestamps.
        </div>
      </div>
    </div>
  );
};
