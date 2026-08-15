import React from 'react';
import {
  Play,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  XCircle
} from 'lucide-react';
import type { InvestigationDetails } from '../types/api';

interface InvestigationHeaderProps {
  details: InvestigationDetails;
  onRunPipeline: () => void;
  isRunning: boolean;
}

export const InvestigationHeader: React.FC<InvestigationHeaderProps> = ({
  details,
  onRunPipeline,
  isRunning
}) => {
  const { investigation, claim, contradictions } = details;

  // Determine recommendation and score
  const score = claim ? Math.round(claim.recoverability_score * 100) : 0;
  const recommendation = claim ? claim.recommendation : 'HUMAN_REVIEW';

  const isCriticalContradiction = contradictions.some(c => c.severity === 'CRITICAL');

  return (
    <div className="bg-white border border-[#E5E5E2] rounded-2xl p-6 shadow-xs font-body mb-6">
      <div className="flex flex-wrap items-center justify-between gap-6">
        {/* Title & Case Metadata */}
        <div>
          <div className="flex items-center gap-2.5">
            <span className="text-[10px] font-semibold text-[#6C63E6] bg-[#6C63E6]/10 px-2.5 py-0.5 rounded-full border border-[#6C63E6]/25">
              {investigation.vertical || 'EQUIPMENT_RENTAL'}
            </span>
            <span className="text-xs text-[#737A80] font-mono">
              ID: {investigation.id}
            </span>
          </div>

          <h1 className="font-display text-2xl md:text-3xl font-bold text-[#20242A] mt-2 tracking-tight">
            {investigation.title}
          </h1>

          <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-[#737A80]">
            <span>Status: <strong className="text-[#20242A]">{investigation.status}</strong></span>
            <span>•</span>
            <span>Documents: <strong className="text-[#20242A]">{investigation.documents?.length || 0}</strong></span>
            <span>•</span>
            <span>Created: {new Date(investigation.created_at).toLocaleString()}</span>
          </div>
        </div>

        {/* Financial Metrics & Score */}
        <div className="flex flex-wrap items-center gap-6">
          {/* Disputed Amount */}
          <div className="text-right">
            <div className="text-xs text-[#737A80] font-medium">Disputed Amount</div>
            <div className="text-xl font-bold font-display text-[#20242A] mt-0.5">
              ${investigation.total_disputed_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
          </div>

          {/* Expected Recovery */}
          <div className="text-right">
            <div className="text-xs text-[#737A80] font-medium">Expected Recovery</div>
            <div className="text-xl font-bold font-display text-emerald-600 mt-0.5">
              ${investigation.total_expected_recovery.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
          </div>

          {/* Score Badge */}
          <div className="bg-[#F7F7F5] border border-[#E5E5E2] rounded-xl px-4 py-2 text-center">
            <div className="text-[10px] text-[#737A80] font-semibold uppercase tracking-wider">
              Recoverability Score
            </div>
            <div className={`text-2xl font-extrabold font-display mt-0.5 ${
              score >= 70 ? 'text-emerald-600' : score <= 30 ? 'text-rose-600' : 'text-amber-600'
            }`}>
              {score} <span className="text-xs font-normal text-[#737A80]">/ 100</span>
            </div>
          </div>

          {/* System Recommendation Badge */}
          <div className="text-center">
            <div className="text-[10px] text-[#737A80] font-semibold uppercase tracking-wider mb-1">
              System Recommendation
            </div>
            {recommendation === 'DISPUTE' && (
              <div className="badge badge-dispute text-xs px-3.5 py-1.5 rounded-full">
                <CheckCircle2 className="w-4 h-4" /> DISPUTE
              </div>
            )}
            {recommendation === 'HUMAN_REVIEW' && (
              <div className="badge badge-human-review text-xs px-3.5 py-1.5 rounded-full">
                <HelpCircle className="w-4 h-4" /> HUMAN REVIEW
              </div>
            )}
            {recommendation === 'DO_NOT_DISPUTE' && (
              <div className="badge badge-do-not-dispute text-xs px-3.5 py-1.5 rounded-full">
                <XCircle className="w-4 h-4" /> DO NOT DISPUTE
              </div>
            )}
          </div>

          {/* Trigger Pipeline Action */}
          <button
            onClick={onRunPipeline}
            disabled={isRunning}
            className="btn-primary text-xs py-2 px-5 rounded-full shadow-xs"
          >
            <Play className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : ''}`} />
            {isRunning ? 'Running Multi-Agent AI...' : 'Re-Run Pipeline'}
          </button>
        </div>
      </div>

      {/* Critical Contradiction Override Warning Banner */}
      {isCriticalContradiction && (
        <div className="mt-4 bg-rose-500/10 border border-rose-500/25 rounded-xl p-3.5 flex items-center gap-3 text-xs">
          <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          <div>
            <div className="font-bold text-rose-700 uppercase tracking-wider text-[11px]">
              Critical Contradiction Detected — System Override Active
            </div>
            <div className="text-[#20242A] mt-0.5">
              Adversarial evidence discovered counter-arguments invalidating recovery. Deterministic engine has overridden recommendation to <strong>DO NOT DISPUTE</strong>.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
