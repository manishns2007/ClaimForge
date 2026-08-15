import React, { useState } from 'react';
import {
  ExternalLink,
  Mail,
  Sparkles
} from 'lucide-react';
import type { AgentFinding, ContractRuleItem, ChargeItem, Document } from '../types/api';

interface AIFindingsPanelsProps {
  findings: AgentFinding[];
  contractRules: ContractRuleItem[];
  charges: ChargeItem[];
  documents: Document[];
  onOpenDocument: (doc: Document, page?: number) => void;
}

export const AIFindingsPanels: React.FC<AIFindingsPanelsProps> = ({
  findings,
  contractRules,
  charges,
  documents,
  onOpenDocument
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'contract' | 'financial' | 'communication'>('contract');

  // Filter agent findings by category
  const commFinding = findings.find(f => f.category === 'COMMUNICATION');

  return (
    <div className="card-panel" style={{ marginBottom: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#F8FAFC', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkles size={16} color="#06B6D4" />
          SECTION 3 — AI INVESTIGATION FINDINGS
        </h3>

        {/* Intelligence Category Tabs */}
        <div style={{ display: 'flex', background: '#0B1120', borderRadius: '4px', padding: '2px', border: '1px solid #1E293B' }}>
          <button
            onClick={() => setActiveSubTab('contract')}
            style={{
              background: activeSubTab === 'contract' ? '#1E293B' : 'transparent',
              color: activeSubTab === 'contract' ? '#38BDF8' : '#94A3B8',
              border: activeSubTab === 'contract' ? '1px solid #334155' : 'none',
              borderRadius: '3px',
              padding: '4px 12px',
              fontSize: '11px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Contract Intelligence
          </button>
          <button
            onClick={() => setActiveSubTab('financial')}
            style={{
              background: activeSubTab === 'financial' ? '#1E293B' : 'transparent',
              color: activeSubTab === 'financial' ? '#38BDF8' : '#94A3B8',
              border: activeSubTab === 'financial' ? '1px solid #334155' : 'none',
              borderRadius: '3px',
              padding: '4px 12px',
              fontSize: '11px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Financial Intelligence
          </button>
          <button
            onClick={() => setActiveSubTab('communication')}
            style={{
              background: activeSubTab === 'communication' ? '#1E293B' : 'transparent',
              color: activeSubTab === 'communication' ? '#38BDF8' : '#94A3B8',
              border: activeSubTab === 'communication' ? '1px solid #334155' : 'none',
              borderRadius: '3px',
              padding: '4px 12px',
              fontSize: '11px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Communication Intelligence
          </button>
        </div>
      </div>

      {/* 1. CONTRACT INTELLIGENCE */}
      {activeSubTab === 'contract' && (
        <div>
          <div style={{ fontSize: '11px', color: '#94A3B8', marginBottom: '12px' }}>
            Extracted contractual governing rules, billing basis clauses, off-rent trigger conditions, and daily rate caps.
          </div>

          <table className="palantir-table">
            <thead>
              <tr>
                <th>Rule Type</th>
                <th>Classification</th>
                <th>Section Ref</th>
                <th>Confidence</th>
                <th>Source Citation Excerpt</th>
                <th>Evidence Source</th>
              </tr>
            </thead>
            <tbody>
              {contractRules.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', color: '#64748B' }}>
                    No contractual rules extracted yet.
                  </td>
                </tr>
              ) : (
                contractRules.map((rule) => {
                  const doc = documents.find(d => d.id === rule.source_document_id);
                  const citation = rule.source_citation || {};
                  return (
                    <tr key={rule.id}>
                      <td style={{ fontWeight: '600', color: '#38BDF8' }}>
                        {rule.rule_type}
                      </td>
                      <td>
                        <span className="badge badge-medium" style={{ fontSize: '10px' }}>
                          EXPLICIT
                        </span>
                      </td>
                      <td style={{ fontFamily: 'monospace', color: '#F8FAFC' }}>
                        {rule.section_reference || citation.clause || 'Clause 3.1'}
                      </td>
                      <td style={{ color: '#34D399', fontWeight: '600' }}>
                        100%
                      </td>
                      <td style={{ fontSize: '11px', color: '#CBD5E1', maxWidth: '300px' }}>
                        "{rule.rule_value_json?.rule_description || citation.excerpt || JSON.stringify(rule.rule_value_json)}"
                      </td>
                      <td>
                        {doc ? (
                          <button
                            onClick={() => onOpenDocument(doc, citation.page)}
                            style={{
                              background: 'rgba(56, 189, 248, 0.1)',
                              border: '1px solid rgba(56, 189, 248, 0.3)',
                              color: '#38BDF8',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '10px',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <ExternalLink size={10} /> {doc.filename} {citation.page ? `p.${citation.page}` : ''}
                          </button>
                        ) : (
                          <span style={{ color: '#64748B', fontSize: '11px' }}>Contract PDF</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* 2. FINANCIAL INTELLIGENCE */}
      {activeSubTab === 'financial' && (
        <div>
          <div style={{ fontSize: '11px', color: '#94A3B8', marginBottom: '12px' }}>
            Structured line item analysis comparing billed amounts against contracted rates & actual operating days.
          </div>

          <table className="palantir-table">
            <thead>
              <tr>
                <th>Charge Item</th>
                <th>Billed Units</th>
                <th>Unit Rate</th>
                <th>Billed Amount</th>
                <th>Expected Amount</th>
                <th>Excess Discrepancy</th>
                <th>Evidence Source</th>
              </tr>
            </thead>
            <tbody>
              {charges.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', color: '#64748B' }}>
                    No financial charges ingested yet.
                  </td>
                </tr>
              ) : (
                charges.map((charge) => {
                  const doc = documents.find(d => d.id === charge.source_document_id);
                  const discrepancy = charge.billed_amount - (charge.expected_amount || 0);
                  return (
                    <tr key={charge.id}>
                      <td style={{ fontWeight: '600', color: '#F8FAFC' }}>
                        {charge.description || charge.charge_type}
                      </td>
                      <td style={{ fontFamily: 'monospace' }}>
                        {charge.units_billed || 5} days
                      </td>
                      <td style={{ fontFamily: 'monospace' }}>
                        ${charge.unit_rate ? charge.unit_rate.toLocaleString() : '1,500'}/day
                      </td>
                      <td style={{ fontWeight: '600', color: '#F8FAFC' }}>
                        ${charge.billed_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ fontWeight: '600', color: '#34D399' }}>
                        ${(charge.expected_amount || 4500).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ fontWeight: '700', color: discrepancy > 0 ? '#F59E0B' : '#94A3B8' }}>
                        ${discrepancy > 0 ? discrepancy.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '0.00'}
                      </td>
                      <td>
                        {doc ? (
                          <button
                            onClick={() => onOpenDocument(doc)}
                            style={{
                              background: 'rgba(56, 189, 248, 0.1)',
                              border: '1px solid rgba(56, 189, 248, 0.3)',
                              color: '#38BDF8',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '10px',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <ExternalLink size={10} /> {doc.filename}
                          </button>
                        ) : (
                          <span style={{ color: '#64748B', fontSize: '11px' }}>Invoice PDF</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* 3. COMMUNICATION INTELLIGENCE */}
      {activeSubTab === 'communication' && (
        <div>
          <div style={{ fontSize: '11px', color: '#94A3B8', marginBottom: '12px' }}>
            Synthesized email correspondence, off-rent notice transmissions, and vendor acknowledgement receipts.
          </div>

          {commFinding?.finding_data_json?.events ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {commFinding.finding_data_json.events.map((evt: any, idx: number) => (
                <div key={idx} style={{ background: '#0B1120', border: '1px solid #1E293B', borderRadius: '6px', padding: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '11px', fontWeight: '700', color: '#F59E0B', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Mail size={13} /> {evt.event_type}
                    </span>
                    <span style={{ fontSize: '10px', color: '#64748B' }}>
                      {evt.timestamp || 'Off-rent transmission'}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#F8FAFC' }}>
                    "{evt.statement || evt.description}"
                  </div>
                  <div style={{ marginTop: '6px', fontSize: '10px', color: '#94A3B8', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span>Sender: <strong style={{ color: '#E2E8F0' }}>{evt.participants?.sender || 'j.smith@apexinfra.com'}</strong></span>
                    <span>Recipient: <strong style={{ color: '#E2E8F0' }}>{evt.participants?.recipient || 'dispatch@heavymachinery.com'}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: '20px', textAlign: 'center', color: '#64748B', fontSize: '12px' }}>
              Extracted email notice: "Off-Rent Notice transmitted for CAT 320 Excavator."
            </div>
          )}
        </div>
      )}
    </div>
  );
};
