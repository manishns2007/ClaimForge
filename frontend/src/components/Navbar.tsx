import React from 'react';
import {
  ShieldAlert,
  BarChart3,
  Search,
  PlusCircle,
  RefreshCw,
  CheckCircle2,
  FolderOpen
} from 'lucide-react';
import type { Investigation } from '../types/api';

interface NavbarProps {
  currentView: 'dashboard' | 'investigation';
  onNavigate: (view: 'dashboard' | 'investigation', investigationId?: string) => void;
  investigations: Investigation[];
  selectedInvestigationId?: string;
  onOpenUploadModal: () => void;
  onSeedDemoCases: () => void;
  isSeeding: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onNavigate,
  investigations,
  selectedInvestigationId,
  onOpenUploadModal,
  onSeedDemoCases,
  isSeeding
}) => {
  return (
    <header style={{
      background: '#0B1120',
      borderBottom: '1px solid #1E293B',
      padding: '0 24px',
      height: '60px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'sticky',
      top: 0,
      zIndex: 100
    }}>
      {/* Brand & Subtitle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <div
          onClick={() => onNavigate('dashboard')}
          style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
        >
          <div style={{
            background: 'linear-gradient(135deg, #06B6D4 0%, #3B82F6 100%)',
            borderRadius: '6px',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 12px rgba(6, 182, 212, 0.4)'
          }}>
            <ShieldAlert size={20} color="#FFFFFF" />
          </div>
          <div>
            <div style={{
              fontWeight: '700',
              fontSize: '15px',
              letterSpacing: '1px',
              color: '#F8FAFC',
              lineHeight: 1.1
            }}>
              CLAIMFORGE
            </div>
            <div style={{
              fontSize: '10px',
              fontWeight: '500',
              color: '#94A3B8',
              letterSpacing: '0.5px'
            }}>
              INVESTIGATION INTELLIGENCE
            </div>
          </div>
        </div>

        {/* Vertical Divider */}
        <div style={{ width: '1px', height: '24px', background: '#334155' }} />

        {/* View Switcher Tabs */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => onNavigate('dashboard')}
            style={{
              background: currentView === 'dashboard' ? '#1E293B' : 'transparent',
              color: currentView === 'dashboard' ? '#38BDF8' : '#94A3B8',
              border: currentView === 'dashboard' ? '1px solid #334155' : '1px solid transparent',
              borderRadius: '4px',
              padding: '6px 14px',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s ease'
            }}
          >
            <BarChart3 size={14} />
            Executive Overview
          </button>

          <button
            onClick={() => {
              if (selectedInvestigationId) {
                onNavigate('investigation', selectedInvestigationId);
              } else if (investigations.length > 0) {
                onNavigate('investigation', investigations[0].id);
              } else {
                onNavigate('dashboard');
              }
            }}
            style={{
              background: currentView === 'investigation' ? '#1E293B' : 'transparent',
              color: currentView === 'investigation' ? '#38BDF8' : '#94A3B8',
              border: currentView === 'investigation' ? '1px solid #334155' : '1px solid transparent',
              borderRadius: '4px',
              padding: '6px 14px',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s ease'
            }}
          >
            <Search size={14} />
            Investigation Workspace
          </button>
        </div>
      </div>

      {/* Case Selector & Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Quick Case Switcher Dropdown */}
        {investigations.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#0F172A', border: '1px solid #334155', borderRadius: '4px', padding: '4px 8px' }}>
            <FolderOpen size={14} color="#64748B" />
            <select
              value={selectedInvestigationId || ''}
              onChange={(e) => {
                if (e.target.value) {
                  onNavigate('investigation', e.target.value);
                }
              }}
              style={{
                background: 'transparent',
                color: '#F8FAFC',
                border: 'none',
                fontSize: '12px',
                fontWeight: '500',
                outline: 'none',
                cursor: 'pointer',
                maxWidth: '220px'
              }}
            >
              <option value="" disabled>Select Investigation...</option>
              {investigations.map(inv => (
                <option key={inv.id} value={inv.id} style={{ background: '#0F172A', color: '#F8FAFC' }}>
                  {inv.title} ({inv.status})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Backend Status Indicator */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          background: 'rgba(16, 185, 129, 0.1)',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          borderRadius: '4px',
          padding: '4px 10px',
          fontSize: '11px',
          color: '#34D399',
          fontWeight: '500'
        }}>
          <CheckCircle2 size={13} />
          <span>Backend Connected</span>
        </div>

        {/* Seed Demo Cases Button */}
        <button
          onClick={onSeedDemoCases}
          disabled={isSeeding}
          title="Populate Case A, Case B, Case C demo datasets in SQLite"
          className="btn-secondary"
          style={{ padding: '6px 12px', fontSize: '11px' }}
        >
          <RefreshCw size={13} className={isSeeding ? 'animate-spin' : ''} />
          {isSeeding ? 'Seeding Cases...' : 'Seed Demo Cases'}
        </button>

        {/* New Investigation Button */}
        <button
          onClick={onOpenUploadModal}
          className="btn-primary"
          style={{ padding: '6px 14px', fontSize: '11px' }}
        >
          <PlusCircle size={14} />
          New Investigation
        </button>
      </div>
    </header>
  );
};
