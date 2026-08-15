import React from 'react';
import {
  Cpu,
  ShieldCheck
} from 'lucide-react';

export const AITransparencyPanel: React.FC = () => {
  return (
    <div className="bg-white border border-[#E5E5E2] rounded-2xl p-5 shadow-xs font-body mb-6">
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#E5E5E2]">
        <h3 className="text-xs font-bold text-[#20242A] flex items-center gap-1.5 uppercase tracking-wider">
          <Cpu className="w-4 h-4 text-[#6C63E6]" />
          Section 7 — System Architecture Transparency
        </h3>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* AI Column */}
        <div className="bg-[#6C63E6]/10 border border-[#6C63E6]/25 rounded-xl p-3">
          <div className="text-[10px] font-bold text-[#6C63E6] uppercase tracking-wider mb-1.5 flex items-center gap-1">
            <Cpu className="w-3 h-3" /> AI Investigation
          </div>
          <ul className="text-[11px] text-[#737A80] space-y-1 pl-3.5 list-disc leading-relaxed">
            <li>Semantic document parsing</li>
            <li>Contract clause interpretation</li>
            <li>Timeline event synthesis</li>
            <li>Counter-evidence discovery</li>
          </ul>
        </div>

        {/* Deterministic Column */}
        <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-xl p-3">
          <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" /> Deterministic Code
          </div>
          <ul className="text-[11px] text-[#737A80] space-y-1 pl-3.5 list-disc leading-relaxed">
            <li>Financial discrepancy math</li>
            <li>Scoring & recovery model</li>
            <li>Hard contradiction overrides</li>
            <li>Evidence ID validation</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
