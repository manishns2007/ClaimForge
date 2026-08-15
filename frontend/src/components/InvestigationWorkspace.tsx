import React, { useState, useEffect } from 'react';
import {
  AlertCircle,
  RefreshCw,
  ArrowLeft
} from 'lucide-react';
import type { InvestigationDetails, Document } from '../types/api';
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
      <div className="py-20 text-center text-[#737A80] space-y-3 font-body">
        <RefreshCw size={32} className="animate-spin mx-auto text-[#6C63E6]" />
        <div className="text-base font-bold text-[#20242A]">Loading Investigation Workspace...</div>
        <div className="text-xs text-[#737A80]">Reconstructing evidence, timeline, and contradiction records</div>
      </div>
    );
  }

  if (error || !details) {
    return (
      <div className="py-20 text-center text-rose-600 space-y-3 font-body">
        <AlertCircle size={32} className="mx-auto" />
        <div className="text-lg font-bold text-[#20242A]">Unable to load investigation workspace</div>
        <div className="text-xs text-[#737A80] max-w-sm mx-auto">{error}</div>
        <button onClick={onBackToDashboard} className="btn-secondary text-xs py-2 px-4 rounded-full">
          <ArrowLeft size={14} /> Return to Executive Overview
        </button>
      </div>
    );
  }

  const { investigation, claim, agent_findings, contradictions, evidence, timeline, contract_rules, charges } = details;

  return (
    <div className="p-6 md:p-8 max-w-[1800px] mx-auto font-body bg-[#F7F7F5] space-y-6">
      {/* Back Button */}
      <div>
        <button
          onClick={onBackToDashboard}
          className="text-xs font-semibold text-[#737A80] hover:text-[#6C63E6] transition-colors inline-flex items-center gap-1.5 bg-transparent border-none cursor-pointer"
        >
          <ArrowLeft size={14} /> Back to Executive Overview
        </button>
      </div>

      {/* Main Header Banner */}
      <InvestigationHeader
        details={details}
        onRunPipeline={handleRunPipeline}
        isRunning={isRunning}
      />

      {/* 3-Column Analyst Workstation Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_340px] gap-6 items-start">
        {/* LEFT COLUMN: Evidence Vault */}
        <div>
          <EvidenceVault
            documents={investigation.documents || []}
            evidenceFacts={evidence}
            onInspectDocument={(doc) => handleOpenDocument(doc)}
          />
        </div>

        {/* CENTER COLUMN: Core Analysis Workspace */}
        <div className="space-y-6">
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
        <div className="space-y-6">
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
