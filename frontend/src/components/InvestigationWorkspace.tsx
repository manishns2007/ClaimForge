import React, { useState, useEffect } from 'react';
import {
  AlertCircle,
  RefreshCw,
  ArrowLeft
} from 'lucide-react';
import { InvestigationDetails, Document } from '../types/api';
import { fetchInvestigationDetails, runInvestigation } from '../services/api';
import { InvestigationHeader } from './InvestigationHeader';
import { ClaimSummary } from './ClaimSummary';
import { EvidenceVault } from './EvidenceVault';
import { EvidenceViewerModal } from './EvidenceViewerModal';
import { AIFindingsPanels } from './AIFindingsPanels';
import { TimelineView } from './TimelineView';
import { ContradictionHunter } from './ContradictionHunter';
import { DecisionPanel } from './DecisionPanel';
import { AITransparencyPanel } from './AITransparencyPanel';
import { LiveSSELogViewer } from './LiveSSELogViewer';

interface InvestigationWorkspaceProps {
  investigationId: string;
  onBackToDashboard: () => void;
}

export const InvestigationWorkspace: React.FC<InvestigationWorkspaceProps> = ({
  investigationId,
  onBackToDashboard
}) => {
  const [details, setDetails] = useState<InvestigationDetails | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState<boolean>(false);

  // Evidence Viewer Modal state
  const [inspectingDoc, setInspectingDoc] = useState<Document | null>(null);
  const [highlightPage, setHighlightPage] = useState<number | undefined>(undefined);

  const loadDetails = () => {
    setLoading(true);
    setError(null);
    fetchInvestigationDetails(investigationId)
      .then((data) => {
        setDetails(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching investigation details:', err);
        setError(err.message || 'Failed to load investigation details');
        setLoading(false);
      });
  };

  useEffect(() => {
    loadDetails();
  }, [investigationId]);

  const handleRunPipeline = async () => {
    setIsRunning(true);
    try {
      await runInvestigation(investigationId);
      await loadDetails();
    } catch (err: any) {
      console.error('Error running pipeline:', err);
    } finally {
      setIsRunning(false);
    }
  };

  const handleOpenDocument = (doc: Document, page?: number) => {
    setInspectingDoc(doc);
    setHighlightPage(page);
  };

  if (loading) {
    return (
      <div style={{ padding: '60px', textAlign: 'center', color: '#94A3B8' }}>
        <RefreshCw size={32} className="animate-spin" style={{ margin: '0 auto 12px', color: '#38BDF8' }} />
        <div style={{ fontSize: '15px', fontWeight: '600', color: '#F8FAFC' }}>Loading Investigation Workspace...</div>
        <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px' }}>Reconstructing evidence, timeline, and contradiction records</div>
      </div>
    );
  }

  if (error || !details) {
    return (
      <div style={{ padding: '60px', textAlign: 'center', color: '#EF4444' }}>
        <AlertCircle size={32} style={{ margin: '0 auto 12px' }} />
        <div style={{ fontSize: '16px', fontWeight: '700' }}>Unable to load investigation workspace</div>
        <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '4px', marginBottom: '16px' }}>{error}</div>
        <button onClick={onBackToDashboard} className="btn-secondary">
          <ArrowLeft size={14} /> Return to Executive Overview
        </button>
      </div>
    );
  }

  const { investigation, claim, agent_findings, contradictions, evidence, timeline, contract_rules, charges } = details;

  return (
    <div style={{ padding: '24px', maxWidth: '1800px', margin: '0 auto' }}>
      {/* Back Button */}
      <div style={{ marginBottom: '16px' }}>
        <button
          onClick={onBackToDashboard}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#94A3B8',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: '600',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px'
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#38BDF8')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#94A3B8')}
        >
          <ArrowLeft size={14} /> Back to Executive Dashboard
        </button>
      </div>

      {/* Main Header Banner */}
      <InvestigationHeader
        details={details}
        onRunPipeline={handleRunPipeline}
        isRunning={isRunning}
      />

      {/* 3-Column Analyst Workstation Layout */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '280px 1fr 340px',
        gap: '20px',
        alignItems: 'start'
      }}>
        {/* LEFT COLUMN: Evidence Vault */}
        <div>
          <EvidenceVault
            documents={investigation.documents || []}
            evidenceFacts={evidence}
            onInspectDocument={(doc) => handleOpenDocument(doc)}
          />
        </div>

        {/* CENTER COLUMN: Core Analysis Workspace */}
        <div>
          {/* Section 1: Claim & Financial Reconciliation Summary */}
          <ClaimSummary
            investigation={investigation}
            claim={claim}
          />

          {/* Section 3: AI Investigation Findings */}
          <AIFindingsPanels
            findings={agent_findings}
            contractRules={contract_rules}
            charges={charges}
            documents={investigation.documents || []}
            onOpenDocument={handleOpenDocument}
          />

          {/* Section 4: Reconstructed Investigation Timeline */}
          <TimelineView
            timeline={timeline}
            documents={investigation.documents || []}
            onOpenDocument={handleOpenDocument}
          />

          {/* Section 5: Adversarial Evidence & Contradiction Hunter */}
          <ContradictionHunter
            contradictions={contradictions}
            documents={investigation.documents || []}
            onOpenDocument={handleOpenDocument}
          />
        </div>

        {/* RIGHT COLUMN: Decision Intelligence & Transparency */}
        <div>
          {/* Section 6: Decision Intelligence */}
          <DecisionPanel
            investigation={investigation}
            claim={claim}
            contradictions={contradictions}
          />

          {/* Section 7: AI vs Deterministic Transparency */}
          <AITransparencyPanel />

          {/* Real-time SSE Execution Logger */}
          <LiveSSELogViewer
            investigationId={investigation.id}
            isRunning={isRunning}
          />
        </div>
      </div>

      {/* Interactive Evidence Document Viewer Modal */}
      {inspectingDoc && (
        <EvidenceViewerModal
          investigationId={investigation.id}
          document={inspectingDoc}
          highlightPageNumber={highlightPage}
          onClose={() => setInspectingDoc(null)}
        />
      )}
    </div>
  );
};
