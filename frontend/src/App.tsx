import React, { useState, useEffect } from 'react';
import { HeroSection } from './components/HeroSection';
import { ExecutiveDashboard } from './components/ExecutiveDashboard';
import { InvestigationWorkspace } from './components/InvestigationWorkspace';
import { NewInvestigationModal } from './components/NewInvestigationModal';
import { Navbar as AppNavbar } from './components/Navbar';
import { fetchDashboardStats, fetchInvestigations } from './services/api';
import type { DashboardStats, Investigation } from './types/api';
import { ArrowLeft } from 'lucide-react';

export const App: React.FC = () => {
  const [activeView, setActiveView] = useState<'hero' | 'dashboard' | 'investigation'>('hero');
  const [selectedInvestigationId, setSelectedInvestigationId] = useState<string | undefined>(undefined);

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [investigations, setInvestigations] = useState<Investigation[]>([]);
  const [, setLoading] = useState<boolean>(true);
  const [isSeeding, setIsSeeding] = useState<boolean>(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);

  const loadData = async () => {
    try {
      const [s, invs] = await Promise.all([
        fetchDashboardStats().catch(() => null),
        fetchInvestigations().catch(() => [])
      ]);
      setStats(s);
      setInvestigations(invs);
      if (!selectedInvestigationId && invs.length > 0) {
        setSelectedInvestigationId(invs[0].id);
      }
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleNavigate = (view: 'dashboard' | 'investigation', invId?: string) => {
    setActiveView(view);
    if (invId) {
      setSelectedInvestigationId(invId);
    }
  };

  const handleSeedDemoCases = async () => {
    setIsSeeding(true);
    try {
      await fetch('/api/investigations');
      await loadData();
    } catch (err) {
      console.error('Failed to seed demo cases:', err);
    } finally {
      setIsSeeding(false);
    }
  };

  const handleNewInvestigationSuccess = (newId: string) => {
    setIsUploadModalOpen(false);
    loadData();
    handleNavigate('investigation', newId);
  };

  if (activeView === 'hero') {
    return <HeroSection onLaunchPlatform={() => setActiveView('dashboard')} />;
  }

  return (
    <div style={{ minHeight: '100vh', background: '#090D16' }}>
      {/* Top Header Navbar */}
      <AppNavbar
        currentView={activeView === 'investigation' ? 'investigation' : 'dashboard'}
        onNavigate={handleNavigate}
        investigations={investigations}
        selectedInvestigationId={selectedInvestigationId}
        onOpenUploadModal={() => setIsUploadModalOpen(true)}
        onSeedDemoCases={handleSeedDemoCases}
        isSeeding={isSeeding}
      />

      {/* Floating Back to Hero Banner */}
      <div style={{ background: '#0F172A', borderBottom: '1px solid #1E293B', padding: '6px 24px', display: 'flex', alignItems: 'center', justifyContent: 'between' }}>
        <button
          onClick={() => setActiveView('hero')}
          style={{ background: 'transparent', border: 'none', color: '#38BDF8', cursor: 'pointer', fontSize: '11px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <ArrowLeft size={14} /> Back to Landing Page Hero
        </button>
      </div>

      {/* Main Content Area */}
      <main>
        {activeView === 'dashboard' ? (
          <ExecutiveDashboard
            stats={stats}
            investigations={investigations}
            onSelectInvestigation={(id) => handleNavigate('investigation', id)}
            onOpenUploadModal={() => setIsUploadModalOpen(true)}
          />
        ) : selectedInvestigationId ? (
          <InvestigationWorkspace
            investigationId={selectedInvestigationId}
            onBackToDashboard={() => setActiveView('dashboard')}
          />
        ) : (
          <div style={{ padding: '60px', textAlign: 'center', color: '#94A3B8' }}>
            No investigation selected. Click Executive Overview to view portfolio.
          </div>
        )}
      </main>

      {/* Upload Modal */}
      {isUploadModalOpen && (
        <NewInvestigationModal
          onClose={() => setIsUploadModalOpen(false)}
          onSuccess={handleNewInvestigationSuccess}
        />
      )}
    </div>
  );
};

export default App;
