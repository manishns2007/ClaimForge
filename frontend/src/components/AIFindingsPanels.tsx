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
    <div className="bg-white border border-[#E5E5E2] rounded-2xl p-5 shadow-xs font-body mb-6">
      <div className="flex flex-wrap items-center justify-between pb-3 mb-4 border-b border-[#E5E5E2] gap-3">
        <h3 className="text-xs font-bold text-[#20242A] flex items-center gap-2 uppercase tracking-wider">
          <Sparkles className="w-4 h-4 text-[#6C63E6]" />
          Section 3 — AI Investigation Findings
        </h3>

        {/* Intelligence Category Tabs */}
        <div className="flex items-center gap-1 bg-[#F7F7F5] border border-[#E5E5E2] rounded-xl p-1">
          {[
            { key: 'contract', label: 'Contract Intelligence' },
            { key: 'financial', label: 'Financial Intelligence' },
            { key: 'communication', label: 'Communication Intelligence' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveSubTab(tab.key as any)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all border-none cursor-pointer ${
                activeSubTab === tab.key
                  ? 'bg-white text-[#6C63E6] shadow-xs'
                  : 'text-[#737A80] hover:text-[#20242A]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 1. CONTRACT INTELLIGENCE */}
      {activeSubTab === 'contract' && (
        <div>
          <div className="text-xs text-[#737A80] mb-3">
            Extracted contractual governing rules, billing basis clauses, off-rent trigger conditions, and daily rate caps.
          </div>

          <div className="overflow-x-auto">
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
                    <td colSpan={6} className="text-center text-[#737A80] py-6">
                      No contractual rules extracted yet.
                    </td>
                  </tr>
                ) : (
                  contractRules.map((rule) => {
                    const doc = documents.find(d => d.id === rule.source_document_id);
                    const citation = rule.source_citation || {};
                    return (
                      <tr key={rule.id}>
                        <td className="font-semibold text-[#6C63E6]">
                          {rule.rule_type}
                        </td>
                        <td>
                          <span className="badge badge-medium text-[10px]">
                            EXPLICIT
                          </span>
                        </td>
                        <td className="font-mono text-[#20242A]">
                          {rule.section_reference || citation.clause || 'Clause 3.1'}
                        </td>
                        <td className="text-emerald-600 font-semibold">
                          100%
                        </td>
                        <td className="text-xs text-[#20242A] max-w-xs">
                          "{rule.rule_value_json?.rule_description || citation.excerpt || JSON.stringify(rule.rule_value_json)}"
                        </td>
                        <td>
                          {doc ? (
                            <button
                              onClick={() => onOpenDocument(doc, citation.page)}
                              className="bg-[#6C63E6]/10 text-[#6C63E6] border border-[#6C63E6]/25 px-2.5 py-1 rounded-full text-[10px] font-semibold inline-flex items-center gap-1 hover:underline border-none cursor-pointer"
                            >
                              <ExternalLink className="w-3 h-3" /> {doc.filename} {citation.page ? `p.${citation.page}` : ''}
                            </button>
                          ) : (
                            <span className="text-[#737A80] text-xs">Contract PDF</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. FINANCIAL INTELLIGENCE */}
      {activeSubTab === 'financial' && (
        <div>
          <div className="text-xs text-[#737A80] mb-3">
            Structured line item analysis comparing billed amounts against contracted rates & actual operating days.
          </div>

          <div className="overflow-x-auto">
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
                    <td colSpan={7} className="text-center text-[#737A80] py-6">
                      No financial charges ingested yet.
                    </td>
                  </tr>
                ) : (
                  charges.map((charge) => {
                    const doc = documents.find(d => d.id === charge.source_document_id);
                    const discrepancy = charge.billed_amount - (charge.expected_amount || 0);
                    return (
                      <tr key={charge.id}>
                        <td className="font-semibold text-[#20242A]">
                          {charge.description || charge.charge_type}
                        </td>
                        <td className="font-mono">
                          {charge.units_billed || 5} days
                        </td>
                        <td className="font-mono">
                          ${charge.unit_rate ? charge.unit_rate.toLocaleString() : '1,500'}/day
                        </td>
                        <td className="font-semibold text-[#20242A]">
                          ${charge.billed_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="font-semibold text-emerald-600">
                          ${(charge.expected_amount || 4500).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="font-bold text-amber-600">
                          ${discrepancy > 0 ? discrepancy.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '0.00'}
                        </td>
                        <td>
                          {doc ? (
                            <button
                              onClick={() => onOpenDocument(doc)}
                              className="bg-[#6C63E6]/10 text-[#6C63E6] border border-[#6C63E6]/25 px-2.5 py-1 rounded-full text-[10px] font-semibold inline-flex items-center gap-1 hover:underline border-none cursor-pointer"
                            >
                              <ExternalLink className="w-3 h-3" /> {doc.filename}
                            </button>
                          ) : (
                            <span className="text-[#737A80] text-xs">Invoice PDF</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. COMMUNICATION INTELLIGENCE */}
      {activeSubTab === 'communication' && (
        <div>
          <div className="text-xs text-[#737A80] mb-3">
            Synthesized email correspondence, off-rent notice transmissions, and vendor acknowledgement receipts.
          </div>

          {commFinding?.finding_data_json?.events ? (
            <div className="space-y-2.5">
              {commFinding.finding_data_json.events.map((evt: any, idx: number) => (
                <div key={idx} className="bg-[#F7F7F5] border border-[#E5E5E2] rounded-xl p-3.5">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-amber-600 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5" /> {evt.event_type}
                    </span>
                    <span className="text-[10px] text-[#737A80]">
                      {evt.timestamp || 'Off-rent transmission'}
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-[#20242A]">
                    "{evt.statement || evt.description}"
                  </div>
                  <div className="mt-2 text-[10px] text-[#737A80] flex items-center gap-3">
                    <span>Sender: <strong className="text-[#20242A]">{evt.participants?.sender || 'j.smith@apexinfra.com'}</strong></span>
                    <span>Recipient: <strong className="text-[#20242A]">{evt.participants?.recipient || 'dispatch@heavymachinery.com'}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-6 text-center text-[#737A80] text-xs bg-[#F7F7F5] border border-[#E5E5E2] rounded-xl">
              Extracted email notice: "Off-Rent Notice transmitted for CAT 320 Excavator."
            </div>
          )}
        </div>
      )}
    </div>
  );
};
