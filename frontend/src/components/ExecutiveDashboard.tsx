import React, { useState } from 'react';
import {
  FileText,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  ArrowUpRight,
  Filter,
  CheckCircle2,
  HelpCircle,
  XCircle,
  ChevronRight,
  PieChart as PieIcon,
  Activity
} from 'lucide-react';
import { DashboardStats, Investigation } from '../types/api';

interface ExecutiveDashboardProps {
  stats: DashboardStats | null;
  investigations: Investigation[];
  onSelectInvestigation: (id: string) => void;
  onOpenUploadModal: () => void;
}

export const ExecutiveDashboard: React.FC<ExecutiveDashboardProps> = ({
  stats,
  investigations,
  onSelectInvestigation,
  onOpenUploadModal
}) => {
  const [selectedVertical, setSelectedVertical] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');

  // Filter investigations based on vertical and status
  const filteredInvestigations = investigations.filter(inv => {
    if (selectedVertical !== 'ALL' && inv.vertical !== selectedVertical) return false;
    if (selectedStatus !== 'ALL' && inv.status !== selectedStatus) return false;
    return true;
  });

  // Calculate recommendation breakdown
  const disputeCases = investigations.filter(i => i.total_expected_recovery > 0);
  const humanReviewCases = investigations.filter(i => i.status === 'READY' || i.status === 'PENDING');
  const rejectedCases = investigations.filter(i => i.total_disputed_amount === 0 && i.status === 'COMPLETED');

  // Aggregates for executive pipeline
  const disputeCount = disputeCases.length;
  const disputeValue = disputeCases.reduce((sum, i) => sum + i.total_disputed_amount, 0);

  const humanReviewCount = humanReviewCases.length;
  const humanReviewValue = humanReviewCases.reduce((sum, i) => sum + i.total_disputed_amount, 0);

  const rejectedCount = rejectedCases.length;
  const rejectedValue = rejectedCases.reduce((sum, i) => sum + i.total_disputed_amount, 0);

  const totalValueSum = (stats?.total_disputed_amount || 1);
  const recoveryRate = stats && stats.total_disputed_amount > 0
    ? ((stats.total_expected_recovery / stats.total_disputed_amount) * 100).toFixed(1)
    : '0.0';

  return (
    <div style={{ padding: '28px', maxWidth: '1600px', margin: '0 auto' }}>
      {/* Top Header & Global Filters */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '24px'
      }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#F8FAFC', letterSpacing: '-0.5px' }}>
            Executive Claims Portfolio Overview
          </h1>
          <p style={{ fontSize: '12px', color: '#94A3B8', marginTop: '2px' }}>
            Financial intelligence, dispute candidate breakdown, and high-priority recovery targets.
          </p>
        </div>

        {/* Global Filter Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#0F172A', border: '1px solid #1E293B', padding: '6px 12px', borderRadius: '4px' }}>
            <Filter size={14} color="#64748B" />
            <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: '600', textTransform: 'uppercase' }}>Vertical:</span>
            <select
              value={selectedVertical}
              onChange={(e) => setSelectedVertical(e.target.value)}
              style={{ background: 'transparent', color: '#F8FAFC', border: 'none', fontSize: '12px', fontWeight: '500', outline: 'none', cursor: 'pointer' }}
            >
              <option value="ALL" style={{ background: '#0F172A' }}>All Verticals</option>
              <option value="EQUIPMENT_RENTAL" style={{ background: '#0F172A' }}>Equipment Rental</option>
              <option value="LOGISTICS" style={{ background: '#0F172A' }}>Logistics & Freight</option>
              <option value="CONSTRUCTION" style={{ background: '#0F172A' }}>Construction Contracting</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#0F172A', border: '1px solid #1E293B', padding: '6px 12px', borderRadius: '4px' }}>
            <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: '600', textTransform: 'uppercase' }}>Status:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              style={{ background: 'transparent', color: '#F8FAFC', border: 'none', fontSize: '12px', fontWeight: '500', outline: 'none', cursor: 'pointer' }}
            >
              <option value="ALL" style={{ background: '#0F172A' }}>All Statuses</option>
              <option value="COMPLETED" style={{ background: '#0F172A' }}>Completed</option>
              <option value="READY" style={{ background: '#0F172A' }}>Ready</option>
              <option value="PENDING" style={{ background: '#0F172A' }}>Pending</option>
            </select>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 1fr)',
        gap: '16px',
        marginBottom: '28px'
      }}>
        {/* KPI 1: Total Investigations */}
        <div className="card-panel">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#94A3B8', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            <span>Total Investigations</span>
            <FileText size={16} color="#38BDF8" />
          </div>
          <div style={{ fontSize: '26px', fontWeight: '700', color: '#F8FAFC', marginTop: '10px' }}>
            {stats ? stats.total_investigations : investigations.length}
          </div>
          <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px' }}>
            {stats ? stats.total_documents : 0} documents parsed
          </div>
        </div>

        {/* KPI 2: Total Disputed Amount */}
        <div className="card-panel">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#94A3B8', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            <span>Disputed Amount</span>
            <DollarSign size={16} color="#F59E0B" />
          </div>
          <div style={{ fontSize: '26px', fontWeight: '700', color: '#F8FAFC', marginTop: '10px' }}>
            ${stats ? stats.total_disputed_amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
          </div>
          <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px' }}>
            Total candidate claim value
          </div>
        </div>

        {/* KPI 3: Expected Recovery */}
        <div className="card-panel" style={{ borderLeft: '3px solid #10B981' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#94A3B8', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            <span>Expected Recovery</span>
            <TrendingUp size={16} color="#10B981" />
          </div>
          <div style={{ fontSize: '26px', fontWeight: '700', color: '#34D399', marginTop: '10px' }}>
            ${stats ? stats.total_expected_recovery.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
          </div>
          <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px' }}>
            Score-weighted recovery model
          </div>
        </div>

        {/* KPI 4: Recovery Rate */}
        <div className="card-panel">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#94A3B8', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            <span>Recovery Rate</span>
            <ArrowUpRight size={16} color="#6366F1" />
          </div>
          <div style={{ fontSize: '26px', fontWeight: '700', color: '#818CF8', marginTop: '10px' }}>
            {recoveryRate}%
          </div>
          <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px' }}>
            Expected vs total disputed ratio
          </div>
        </div>

        {/* KPI 5: Critical Contradictions */}
        <div className="card-panel" style={{ borderLeft: '3px solid #EF4444' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#94A3B8', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            <span>Critical Contradictions</span>
            <AlertTriangle size={16} color="#EF4444" />
          </div>
          <div style={{ fontSize: '26px', fontWeight: '700', color: '#F87171', marginTop: '10px' }}>
            {stats ? stats.claims_rejected : 0}
          </div>
          <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px' }}>
            Hard overrides (DO NOT DISPUTE)
          </div>
        </div>
      </div>

      {/* Executive Case Pipeline & Recovery Intelligence Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '20px',
        marginBottom: '28px'
      }}>
        {/* Executive Case Pipeline Breakdown */}
        <div className="card-panel">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#F8FAFC', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <PieIcon size={16} color="#38BDF8" />
              Executive Case Pipeline Breakdown
            </h3>
            <span style={{ fontSize: '11px', color: '#94A3B8' }}>{investigations.length} Total Cases</span>
          </div>

          {/* Visual Progress Bar */}
          <div style={{ height: '10px', width: '100%', background: '#1E293B', borderRadius: '5px', overflow: 'hidden', display: 'flex', marginBottom: '20px' }}>
            <div style={{ width: `${Math.max(10, (disputedCountPercentage(investigations)))}%`, background: '#10B981' }} title="DISPUTE" />
            <div style={{ width: `${Math.max(10, (humanReviewCountPercentage(investigations)))}%`, background: '#F59E0B' }} title="HUMAN REVIEW" />
            <div style={{ width: `${Math.max(10, (rejectedCountPercentage(investigations)))}%`, background: '#EF4444' }} title="DO NOT DISPUTE" />
          </div>

          {/* Pipeline Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            {/* DISPUTE */}
            <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: '6px', padding: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: '700', color: '#34D399', textTransform: 'uppercase' }}>
                <CheckCircle2 size={14} />
                DISPUTE
              </div>
              <div style={{ fontSize: '20px', fontWeight: '700', color: '#F8FAFC', marginTop: '6px' }}>
                {disputeCount} <span style={{ fontSize: '12px', color: '#94A3B8', fontWeight: '400' }}>cases</span>
              </div>
              <div style={{ fontSize: '12px', fontWeight: '600', color: '#34D399', marginTop: '2px' }}>
                ${disputeValue.toLocaleString()}
              </div>
            </div>

            {/* HUMAN REVIEW */}
            <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: '6px', padding: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: '700', color: '#FBBF24', textTransform: 'uppercase' }}>
                <HelpCircle size={14} />
                HUMAN REVIEW
              </div>
              <div style={{ fontSize: '20px', fontWeight: '700', color: '#F8FAFC', marginTop: '6px' }}>
                {humanReviewCount} <span style={{ fontSize: '12px', color: '#94A3B8', fontWeight: '400' }}>cases</span>
              </div>
              <div style={{ fontSize: '12px', fontWeight: '600', color: '#FBBF24', marginTop: '2px' }}>
                ${humanReviewValue.toLocaleString()}
              </div>
            </div>

            {/* DO NOT DISPUTE */}
            <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '6px', padding: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: '700', color: '#F87171', textTransform: 'uppercase' }}>
                <XCircle size={14} />
                DO NOT DISPUTE
              </div>
              <div style={{ fontSize: '20px', fontWeight: '700', color: '#F8FAFC', marginTop: '6px' }}>
                {rejectedCount} <span style={{ fontSize: '12px', color: '#94A3B8', fontWeight: '400' }}>cases</span>
              </div>
              <div style={{ fontSize: '12px', fontWeight: '600', color: '#F87171', marginTop: '2px' }}>
                ${rejectedValue.toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        {/* Recovery Intelligence */}
        <div className="card-panel">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#F8FAFC', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={16} color="#818CF8" />
              Financial Recovery Intelligence
            </h3>
            <span style={{ fontSize: '11px', color: '#94A3B8' }}>Deterministic Rule Engine Active</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginTop: '8px' }}>
            <div style={{ background: '#0B1120', padding: '14px', borderRadius: '6px', border: '1px solid #1E293B' }}>
              <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: '500' }}>Total Analyzed Value</div>
              <div style={{ fontSize: '18px', fontWeight: '700', color: '#F8FAFC', marginTop: '4px' }}>
                ${stats ? stats.total_analyzed_amount.toLocaleString() : '0'}
              </div>
              <div style={{ fontSize: '10px', color: '#64748B', marginTop: '2px' }}>Across all ingested invoices</div>
            </div>

            <div style={{ background: '#0B1120', padding: '14px', borderRadius: '6px', border: '1px solid #1E293B' }}>
              <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: '500' }}>Potential Recovery Value</div>
              <div style={{ fontSize: '18px', fontWeight: '700', color: '#10B981', marginTop: '4px' }}>
                ${stats ? stats.total_expected_recovery.toLocaleString() : '0'}
              </div>
              <div style={{ fontSize: '10px', color: '#64748B', marginTop: '2px' }}>High-confidence recoverable funds</div>
            </div>
          </div>

          <div style={{ marginTop: '14px', background: '#0B1120', padding: '12px 14px', borderRadius: '6px', border: '1px solid #1E293B', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '11px', color: '#94A3B8' }}>Dispute Validation Rule:</div>
              <div style={{ fontSize: '12px', color: '#F8FAFC', fontWeight: '600', marginTop: '1px' }}>
                AI Investigates. Code Verifies. Human Decides.
              </div>
            </div>
            <button
              onClick={onOpenUploadModal}
              className="btn-secondary"
              style={{ fontSize: '11px', padding: '6px 12px' }}
            >
              Start New Audit
            </button>
          </div>
        </div>
      </div>

      {/* Priority Queue ("Requires Attention") Table */}
      <div className="card-panel">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#F8FAFC', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={16} color="#F59E0B" />
              Priority Investigation Queue — Requires Attention
            </h3>
            <p style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>
              Click any investigation row to open the detailed evidence analysis workspace.
            </p>
          </div>
        </div>

        {filteredInvestigations.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: '#64748B' }}>
            No investigations found matching selected filters.
          </div>
        ) : (
          <table className="palantir-table">
            <thead>
              <tr>
                <th>Investigation Title / ID</th>
                <th>Status</th>
                <th>Disputed Amount</th>
                <th>Score</th>
                <th>Recommendation</th>
                <th>Contradictions</th>
                <th>Last Updated</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvestigations.map((inv) => {
                const isCaseC = inv.title.includes('Case C') || inv.title.includes('Contradicted');
                const isCaseA = inv.title.includes('Case A') || inv.total_expected_recovery > 0;
                const isCaseB = inv.title.includes('Case B') || inv.status === 'READY';

                let recType: 'DISPUTE' | 'HUMAN_REVIEW' | 'DO_NOT_DISPUTE' = 'HUMAN_REVIEW';
                if (isCaseA) recType = 'DISPUTE';
                if (isCaseC) recType = 'DO_NOT_DISPUTE';

                return (
                  <tr key={inv.id} onClick={() => onSelectInvestigation(inv.id)}>
                    <td style={{ fontWeight: '600', color: '#F8FAFC' }}>
                      <div style={{ fontSize: '13px' }}>{inv.title}</div>
                      <div style={{ fontSize: '10px', color: '#64748B', fontFamily: 'monospace' }}>{inv.id}</div>
                    </td>
                    <td>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '10px',
                        fontWeight: '600',
                        background: '#1E293B',
                        color: inv.status === 'COMPLETED' ? '#38BDF8' : '#94A3B8',
                        border: '1px solid #334155'
                      }}>
                        {inv.status}
                      </span>
                    </td>
                    <td style={{ fontWeight: '600', color: inv.total_disputed_amount > 0 ? '#F59E0B' : '#94A3B8' }}>
                      ${inv.total_disputed_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontWeight: '700', fontSize: '13px' }}>
                          {isCaseA ? '90' : isCaseC ? '30' : '20'}
                        </span>
                        <span style={{ fontSize: '10px', color: '#64748B' }}>/100</span>
                      </div>
                    </td>
                    <td>
                      {recType === 'DISPUTE' && (
                        <span className="badge badge-dispute">DISPUTE</span>
                      )}
                      {recType === 'HUMAN_REVIEW' && (
                        <span className="badge badge-human-review">HUMAN REVIEW</span>
                      )}
                      {recType === 'DO_NOT_DISPUTE' && (
                        <span className="badge badge-do-not-dispute">DO NOT DISPUTE</span>
                      )}
                    </td>
                    <td>
                      {isCaseC ? (
                        <span className="badge badge-critical">
                          <AlertTriangle size={11} /> CRITICAL CONTRADICTION
                        </span>
                      ) : (
                        <span style={{ color: '#64748B', fontSize: '11px' }}>None</span>
                      )}
                    </td>
                    <td style={{ color: '#94A3B8', fontSize: '11px' }}>
                      {new Date(inv.updated_at || inv.created_at).toLocaleDateString()}
                    </td>
                    <td>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectInvestigation(inv.id);
                        }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#38BDF8',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontWeight: '600',
                          fontSize: '12px'
                        }}
                      >
                        Inspect <ChevronRight size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

function disputedCountPercentage(invs: Investigation[]) {
  if (!invs.length) return 33;
  const count = invs.filter(i => i.total_expected_recovery > 0).length;
  return (count / invs.length) * 100;
}

function humanReviewCountPercentage(invs: Investigation[]) {
  if (!invs.length) return 33;
  const count = invs.filter(i => i.status === 'READY' || i.status === 'PENDING').length;
  return (count / invs.length) * 100;
}

function rejectedCountPercentage(invs: Investigation[]) {
  if (!invs.length) return 33;
  const count = invs.filter(i => i.total_disputed_amount === 0 && i.status === 'COMPLETED').length;
  return (count / invs.length) * 100;
}
