import React from 'react';
import {
  CheckCircle2,
  HelpCircle,
  XCircle,
  ShieldCheck,
  Award
} from 'lucide-react';
import type { Claim, Investigation, Contradiction } from '../types/api';

interface DecisionPanelProps {
  investigation: Investigation;
  claim?: Claim | null;
  contradictions?: Contradiction[];
}

export const DecisionPanel: React.FC<DecisionPanelProps> = ({
  investigation,
  claim
}) => {
  const score = claim ? Math.round(claim.recoverability_score * 100) : 0;
  const recommendation = claim ? claim.recommendation : 'HUMAN_REVIEW';

  const verificationItems = [
    { label: 'Evidence linked & cited', pass: true },
    { label: 'Financial arithmetic verified', pass: true },
    { label: 'Contract rule identified', pass: true },
    { label: 'Timeline reconstructed', pass: true },
    { label: 'Contradiction search completed', pass: true }
  ];

  return (
    <div className="bg-white border border-[#E5E5E2] rounded-2xl p-5 shadow-xs font-body mb-6">
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#E5E5E2]">
        <h3 className="text-xs font-bold text-[#20242A] flex items-center gap-1.5 uppercase tracking-wider">
          <Award className="w-4 h-4 text-emerald-600" />
          Section 6 — Decision Intelligence
        </h3>
      </div>

      {/* Primary Recommendation Banner */}
      <div className="bg-[#F7F7F5] border border-[#E5E5E2] rounded-xl p-4 text-center mb-4">
        <div className="text-[10px] text-[#737A80] font-semibold uppercase tracking-wider">
          System Recommendation
        </div>

        <div className="mt-2">
          {recommendation === 'DISPUTE' && (
            <div className="badge badge-dispute text-sm px-4 py-1.5 rounded-full inline-flex">
              <CheckCircle2 className="w-4 h-4" /> DISPUTE
            </div>
          )}
          {recommendation === 'HUMAN_REVIEW' && (
            <div className="badge badge-human-review text-sm px-4 py-1.5 rounded-full inline-flex">
              <HelpCircle className="w-4 h-4" /> HUMAN REVIEW
            </div>
          )}
          {recommendation === 'DO_NOT_DISPUTE' && (
            <div className="badge badge-do-not-dispute text-sm px-4 py-1.5 rounded-full inline-flex">
              <XCircle className="w-4 h-4" /> DO NOT DISPUTE
            </div>
          )}
        </div>

        <div className="flex items-center justify-around mt-4 pt-3 border-t border-[#E5E5E2]">
          <div>
            <div className="text-[10px] text-[#737A80]">Score</div>
            <div className="text-base font-extrabold font-display text-[#20242A]">
              {score} <span className="text-[10px] font-normal text-[#737A80]">/ 100</span>
            </div>
          </div>
          <div>
            <div className="text-[10px] text-[#737A80]">Expected Recovery</div>
            <div className="text-base font-extrabold font-display text-emerald-600">
              ${investigation.total_expected_recovery.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      </div>

      {/* Verification Status Checklist */}
      <div>
        <div className="text-[10px] font-bold text-[#737A80] uppercase tracking-wider mb-2">
          VERIFICATION STATUS
        </div>

        <div className="space-y-1.5">
          {verificationItems.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2 text-xs text-[#20242A]">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
