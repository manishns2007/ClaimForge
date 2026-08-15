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
    <div className="card-panel" style={{ marginBottom: '20px', background: '#0B1120', border: '1px solid #1E293B' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        {/* Title & Case Metadata */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '11px', fontWeight: '700', color: '#6366F1', background: 'rgba(99, 102, 241, 0.15)', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
              {investigation.vertical || 'EQUIPMENT_RENTAL'}
            </span>
            <span style={{ fontSize: '11px', color: '#64748B', fontFamily: 'monospace' }}>
              ID: {investigation.id}
            </span>
          </div>

          <h1 style={{ fontSize: '20px', fontWeight: '700', color: '#F8FAFC', marginTop: '4px' }}>
            {investigation.title}
          </h1>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px', fontSize: '11px', color: '#94A3B8' }}>
            <span>Status: <strong style={{ color: '#F8FAFC' }}>{investigation.status}</strong></span>
            <span>•</span>
            <span>Documents: <strong style={{ color: '#F8FAFC' }}>{investigation.documents?.length || 0}</strong></span>
            <span>•</span>
            <span>Created: {new Date(investigation.created_at).toLocaleString()}</span>
          </div>
        </div>

        {/* Financial Metrics & Score */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          {/* Disputed Amount */}
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: '500' }}>Disputed Amount</div>
            <div style={{ fontSize: '18px', fontWeight: '700', color: '#F59E0B' }}>
              ${investigation.total_disputed_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
          </div>

          {/* Expected Recovery */}
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: '500' }}>Expected Recovery</div>
            <div style={{ fontSize: '18px', fontWeight: '700', color: '#10B981' }}>
              ${investigation.total_expected_recovery.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
          </div>

          {/* Score Badge */}
          <div style={{
            background: '#0F172A',
            border: '1px solid #334155',
            borderRadius: '6px',
            padding: '8px 16px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '10px', color: '#94A3B8', fontWeight: '600', textTransform: 'uppercase' }}>
              Recoverability Score
            </div>
            <div style={{ fontSize: '22px', fontWeight: '800', color: score >= 70 ? '#10B981' : score <= 30 ? '#EF4444' : '#F59E0B' }}>
              {score} <span style={{ fontSize: '12px', color: '#64748B', fontWeight: '400' }}>/ 100</span>
            </div>
          </div>

          {/* System Recommendation Badge */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '10px', color: '#94A3B8', fontWeight: '600', textTransform: 'uppercase', marginBottom: '4px' }}>
              System Recommendation
            </div>
            {recommendation === 'DISPUTE' && (
              <div className="badge badge-dispute" style={{ padding: '6px 14px', fontSize: '13px' }}>
                <CheckCircle2 size={16} /> DISPUTE
              </div>
            )}
            {recommendation === 'HUMAN_REVIEW' && (
              <div className="badge badge-human-review" style={{ padding: '6px 14px', fontSize: '13px' }}>
                <HelpCircle size={16} /> HUMAN REVIEW
              </div>
            )}
            {recommendation === 'DO_NOT_DISPUTE' && (
              <div className="badge badge-do-not-dispute" style={{ padding: '6px 14px', fontSize: '13px' }}>
                <XCircle size={16} /> DO NOT DISPUTE
              </div>
            )}
          </div>

          {/* Trigger Pipeline Action */}
          <button
            onClick={onRunPipeline}
            disabled={isRunning}
            className="btn-primary"
            style={{ padding: '8px 16px', fontSize: '12px' }}
          >
            <Play size={14} className={isRunning ? 'animate-spin' : ''} />
            {isRunning ? 'Running Multi-Agent AI...' : 'Re-Run Pipeline'}
          </button>
        </div>
      </div>

      {/* Critical Contradiction Override Warning Banner */}
      {isCriticalContradiction && (
        <div style={{
          marginTop: '16px',
          background: 'rgba(239, 68, 68, 0.12)',
          border: '1px solid #EF4444',
          borderRadius: '6px',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <AlertTriangle size={20} color="#EF4444" style={{ flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: '12px', fontWeight: '700', color: '#EF4444', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              CRITICAL CONTRADICTION DETECTED — SYSTEM OVERRIDE ACTIVE
            </div>
            <div style={{ fontSize: '12px', color: '#F8FAFC', marginTop: '2px' }}>
              Adversarial evidence discovered counter-arguments invalidating recovery. Deterministic engine has overridden recommendation to <strong>DO NOT DISPUTE</strong>.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
