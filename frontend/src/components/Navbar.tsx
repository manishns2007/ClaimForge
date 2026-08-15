import React, { useState } from 'react';
import {
  BarChart3,
  Search,
  PlusCircle,
  RefreshCw,
  CheckCircle2,
  FolderOpen,
  LogOut,
  User,
  Shield,
  ChevronDown
} from 'lucide-react';
import type { Investigation } from '../types/api';
import { useAuth } from '../context/AuthContext';

interface NavbarProps {
  currentView: 'dashboard' | 'investigation';
  onNavigate: (view: 'hero' | 'dashboard' | 'investigation', investigationId?: string) => void;
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
  const { user, signOut, openAuthModal, isAuthenticated } = useAuth();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  const handleSignOut = () => {
    signOut();
    setIsProfileMenuOpen(false);
    onNavigate('hero');
  };

  return (
    <header className="bg-white border-b border-[#E5E5E2] px-6 h-16 flex items-center justify-between sticky top-0 z-50 shadow-sm font-body">
      {/* Brand & View Switcher */}
      <div className="flex items-center gap-6">
        <button
          onClick={() => onNavigate('hero')}
          className="flex items-center gap-2 text-left group border-none bg-transparent cursor-pointer"
          title="Return to ClaimForge Home"
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
              className="bg-transparent text-[#20242A] border-none text-xs font-medium outline-none cursor-pointer max-w-[180px] truncate"
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

        {/* Backend Connected Indicator */}
        <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200/80 rounded-full px-3 py-1 text-xs font-medium">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>Backend Connected</span>
        </div>

        {/* Seed Demo Cases Button */}
        <button
          onClick={onSeedDemoCases}
          disabled={isSeeding}
          title="Populate Case A, Case B, Case C demo datasets in SQLite"
          className="btn-secondary text-xs py-1.5 px-3.5 rounded-full cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSeeding ? 'animate-spin' : ''}`} />
          {isSeeding ? 'Seeding Cases...' : 'Seed Demo Cases'}
        </button>

        {/* New Investigation Button */}
        <button
          onClick={onOpenUploadModal}
          className="btn-primary text-xs py-1.5 px-4 rounded-full cursor-pointer"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          New Investigation
        </button>

        {/* User Profile / Auth State */}
        {isAuthenticated && user ? (
          <div className="relative">
            <button
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              className="flex items-center gap-2 p-1 pl-1.5 pr-2.5 rounded-full hover:bg-[#F7F7F5] border border-[#E5E5E2] transition-colors cursor-pointer bg-white"
            >
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-7 h-7 rounded-full object-cover border border-[#D4D4D0]"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-[#6C63E6]/10 text-[#6C63E6] font-semibold text-xs flex items-center justify-center border border-[#6C63E6]/20">
                  {user.name.charAt(0)}
                </div>
              )}
              <div className="text-left hidden sm:block">
                <p className="text-xs font-semibold text-[#20242A] leading-tight truncate max-w-[100px]">
                  {user.name}
                </p>
                <p className="text-[10px] text-[#737A80] leading-none truncate max-w-[100px]">
                  {user.role}
                </p>
              </div>
              <ChevronDown className="w-3 h-3 text-[#737A80]" />
            </button>

            {/* Profile Dropdown Menu */}
            {isProfileMenuOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white border border-[#E5E5E2] rounded-2xl shadow-xl py-2 z-50 text-xs font-body animate-fadeIn">
                <div className="px-4 py-3 border-b border-[#F0F0EE]">
                  <p className="font-semibold text-[#20242A]">{user.name}</p>
                  <p className="text-[11px] text-[#737A80] truncate">{user.email}</p>
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <span className="bg-[#6C63E6]/10 text-[#6C63E6] px-2 py-0.5 rounded-full text-[10px] font-medium border border-[#6C63E6]/20">
                      {user.role}
                    </span>
                    <span className="text-[10px] text-[#737A80]">
                      via {user.provider === 'google' ? 'Google' : 'SSO'}
                    </span>
                  </div>
                </div>

                <div className="py-1">
                  <button
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      onNavigate('dashboard');
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-[#F7F7F5] text-[#20242A] flex items-center gap-2 border-none bg-transparent cursor-pointer"
                  >
                    <BarChart3 className="w-3.5 h-3.5 text-[#737A80]" />
                    Portfolio Dashboard
                  </button>
                  <button
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      onNavigate('hero');
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-[#F7F7F5] text-[#20242A] flex items-center gap-2 border-none bg-transparent cursor-pointer"
                  >
                    <Shield className="w-3.5 h-3.5 text-[#737A80]" />
                    Landing Page
                  </button>
                </div>

                <div className="pt-1 border-t border-[#F0F0EE]">
                  <button
                    onClick={handleSignOut}
                    className="w-full text-left px-4 py-2 hover:bg-rose-50 text-rose-600 flex items-center gap-2 border-none bg-transparent cursor-pointer font-medium"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={() => openAuthModal('signin')}
            className="btn-primary text-xs py-1.5 px-4 rounded-full flex items-center gap-1.5 cursor-pointer"
          >
            <User className="w-3.5 h-3.5" />
            Sign In
          </button>
        )}
      </div>
    </header>
  );
};
