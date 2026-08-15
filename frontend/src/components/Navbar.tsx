import React from 'react';
import {
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
    <header className="bg-white border-b border-[#E5E5E2] px-6 h-16 flex items-center justify-between sticky top-0 z-50 shadow-sm font-body">
      {/* Brand & Subtitle */}
      <div className="flex items-center gap-6">
        <button
          onClick={() => onNavigate('dashboard')}
          className="flex items-center gap-2 text-left group border-none bg-transparent cursor-pointer"
        >
          <span className="text-xl font-semibold tracking-tight text-[#20242A]">
            ✦ ClaimForge
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#737A80] bg-[#F7F7F5] px-2 py-0.5 rounded border border-[#E5E5E2] ml-1">
            Intelligence
          </span>
        </button>

        {/* Vertical Divider */}
        <div className="w-px h-6 bg-[#E5E5E2]" />

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('dashboard')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              currentView === 'dashboard'
                ? 'bg-[#6C63E6]/10 text-[#6C63E6] border border-[#6C63E6]/30 shadow-xs'
                : 'text-[#737A80] hover:text-[#20242A] hover:bg-[#F7F7F5] border border-transparent'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
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
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              currentView === 'investigation'
                ? 'bg-[#6C63E6]/10 text-[#6C63E6] border border-[#6C63E6]/30 shadow-xs'
                : 'text-[#737A80] hover:text-[#20242A] hover:bg-[#F7F7F5] border border-transparent'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            Investigation Workspace
          </button>
        </div>
      </div>

      {/* Quick Case Switcher & Actions */}
      <div className="flex items-center gap-3">
        {/* Case Switcher Dropdown */}
        {investigations.length > 0 && (
          <div className="flex items-center gap-2 bg-[#F7F7F5] border border-[#E5E5E2] rounded-lg px-2.5 py-1 text-xs">
            <FolderOpen className="w-3.5 h-3.5 text-[#737A80]" />
            <select
              value={selectedInvestigationId || ''}
              onChange={(e) => {
                if (e.target.value) {
                  onNavigate('investigation', e.target.value);
                }
              }}
              className="bg-transparent text-[#20242A] border-none text-xs font-medium outline-none cursor-pointer max-w-[200px] truncate"
            >
              <option value="" disabled>Select Investigation...</option>
              {investigations.map(inv => (
                <option key={inv.id} value={inv.id} className="bg-white text-[#20242A]">
                  {inv.title} ({inv.status})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Backend Connected Indicator (Subtle green status pill) */}
        <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200/80 rounded-full px-3 py-1 text-xs font-medium">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>Backend Connected</span>
        </div>

        {/* Seed Demo Cases Button */}
        <button
          onClick={onSeedDemoCases}
          disabled={isSeeding}
          title="Populate Case A, Case B, Case C demo datasets in SQLite"
          className="btn-secondary text-xs py-1.5 px-3.5 rounded-full"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSeeding ? 'animate-spin' : ''}`} />
          {isSeeding ? 'Seeding Cases...' : 'Seed Demo Cases'}
        </button>

        {/* New Investigation Button */}
        <button
          onClick={onOpenUploadModal}
          className="btn-primary text-xs py-1.5 px-4 rounded-full"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          New Investigation
        </button>

        {/* User Avatar */}
        <div className="w-8 h-8 rounded-full bg-[#E5E5E2] text-[#20242A] font-semibold text-xs flex items-center justify-center border border-[#D4D4D0] ml-1">
          JB
        </div>
      </div>
    </header>
  );
};
