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
    <div className="card-panel" style={{ marginBottom: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#F8FAFC', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Scale size={16} color="#38BDF8" />
          SECTION 1 — CLAIM & FINANCIAL RECONCILIATION SUMMARY
        </h3>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            background: 'rgba(6, 182, 212, 0.15)',
            color: '#22D3EE',
            border: '1px solid rgba(6, 182, 212, 0.3)',
            padding: '2px 8px',
            borderRadius: '4px',
            fontSize: '10px',
            fontWeight: '700',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <Cpu size={12} /> AI ANALYSIS
          </span>
          <span style={{
            background: 'rgba(16, 185, 129, 0.15)',
            color: '#34D399',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            padding: '2px 8px',
            borderRadius: '4px',
            fontSize: '10px',
            fontWeight: '700',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <ShieldCheck size={12} /> VERIFIED BY RULE ENGINE
          </span>
        </div>
      </div>

      {/* Grid of Key Metrics */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '12px',
        marginBottom: '16px'
      }}>
        <div style={{ background: '#0B1120', padding: '12px', borderRadius: '4px', border: '1px solid #1E293B' }}>
          <div style={{ fontSize: '11px', color: '#94A3B8' }}>Billed Original Amount</div>
          <div style={{ fontSize: '16px', fontWeight: '700', color: '#F8FAFC', marginTop: '2px' }}>
            ${investigation.total_analyzed_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div style={{ background: '#0B1120', padding: '12px', borderRadius: '4px', border: '1px solid #1E293B' }}>
          <div style={{ fontSize: '11px', color: '#94A3B8' }}>Disputed Excess Amount</div>
          <div style={{ fontSize: '16px', fontWeight: '700', color: '#F59E0B', marginTop: '2px' }}>
            ${investigation.total_disputed_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div style={{ background: '#0B1120', padding: '12px', borderRadius: '4px', border: '1px solid #1E293B' }}>
          <div style={{ fontSize: '11px', color: '#94A3B8' }}>Expected Recovery</div>
          <div style={{ fontSize: '16px', fontWeight: '700', color: '#10B981', marginTop: '2px' }}>
            ${investigation.total_expected_recovery.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div style={{ background: '#0B1120', padding: '12px', borderRadius: '4px', border: '1px solid #1E293B' }}>
          <div style={{ fontSize: '11px', color: '#94A3B8' }}>Recoverability Score</div>
          <div style={{ fontSize: '16px', fontWeight: '700', color: '#38BDF8', marginTop: '2px' }}>
            {claim ? Math.round(claim.recoverability_score * 100) : 0} / 100
          </div>
        </div>
      </div>

      {/* Deterministic Explanation Callout */}
      <div style={{
        background: '#0B1120',
        borderLeft: '4px solid #38BDF8',
        padding: '12px 16px',
        borderRadius: '0 4px 4px 0'
      }}>
        <div style={{ fontSize: '11px', fontWeight: '700', color: '#38BDF8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Deterministic Engine Audit Explanation:
        </div>
        <div style={{ fontSize: '13px', color: '#F8FAFC', marginTop: '4px', fontFamily: 'monospace' }}>
          "{reasonText}"
        </div>
        <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px' }}>
          Financial reconciliation calculated by deterministic Python engine based on normalized contract rules and telemetry timestamps.
        </div>
      </div>
    </div>
  );
};
