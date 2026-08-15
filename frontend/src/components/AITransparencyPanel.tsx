import React from 'react';
import {
  Cpu,
  ShieldCheck,
  Zap,
  Code
} from 'lucide-react';

export const AITransparencyPanel: React.FC = () => {
  return (
    <div className="card-panel" style={{ marginBottom: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', borderBottom: '1px solid #1E293B', paddingBottom: '8px' }}>
        <h3 style={{ fontSize: '13px', fontWeight: '700', color: '#F8FAFC', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Cpu size={16} color="#06B6D4" />
          SECTION 7 — SYSTEM ARCHITECTURE TRANSPARENCY
        </h3>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        {/* AI Column */}
        <div style={{ background: 'rgba(6, 182, 212, 0.05)', border: '1px solid rgba(6, 182, 212, 0.2)', borderRadius: '6px', padding: '10px' }}>
          <div style={{ fontSize: '10px', fontWeight: '700', color: '#22D3EE', textTransform: 'uppercase', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Cpu size={12} /> AI INVESTIGATION
          </div>
          <ul style={{ fontSize: '10px', color: '#94A3B8', paddingLeft: '14px', lineHeight: 1.6 }}>
            <li>Semantic document parsing</li>
            <li>Contract clause interpretation</li>
            <li>Timeline event synthesis</li>
            <li>Counter-evidence discovery</li>
          </ul>
        </div>

        {/* Deterministic Column */}
        <div style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '6px', padding: '10px' }}>
          <div style={{ fontSize: '10px', fontWeight: '700', color: '#34D399', textTransform: 'uppercase', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <ShieldCheck size={12} /> DETERMINISTIC CODE
          </div>
          <ul style={{ fontSize: '10px', color: '#94A3B8', paddingLeft: '14px', lineHeight: 1.6 }}>
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
