import React, { useState, useEffect } from 'react';
import type { DashboardStats, Investigation } from './types/api';
import { fetchDashboardStats, fetchInvestigations } from './services/api';
import { Navbar } from './components/Navbar';
import { ExecutiveDashboard } from './components/ExecutiveDashboard';
import { InvestigationWorkspace } from './components/InvestigationWorkspace';
import { NewInvestigationModal } from './components/NewInvestigationModal';

export const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<'dashboard' | 'investigation'>('dashboard');
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

      // Auto-select first investigation if none selected
      if (!selectedInvestigationId && invs.length > 0) {
        setSelectedInvestigationId(invs[0].id);
      }
    } catch (err) {
      console.error('Error loading app data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleNavigate = (view: 'dashboard' | 'investigation', invId?: string) => {
    setCurrentView(view);
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

  return (
    <div style={{ minHeight: '100vh', background: '#090D16' }}>
      {/* Top Header Navbar */}
      <Navbar
        currentView={currentView}
        onNavigate={handleNavigate}
        investigations={investigations}
        selectedInvestigationId={selectedInvestigationId}
        onOpenUploadModal={() => setIsUploadModalOpen(true)}
        onSeedDemoCases={handleSeedDemoCases}
        isSeeding={isSeeding}
      />

      {/* Main Content Area */}
      <main>
        {currentView === 'dashboard' ? (
          <ExecutiveDashboard
            stats={stats}
            investigations={investigations}
            onSelectInvestigation={(id) => handleNavigate('investigation', id)}
            onOpenUploadModal={() => setIsUploadModalOpen(true)}
          />
        ) : selectedInvestigationId ? (
          <InvestigationWorkspace
            investigationId={selectedInvestigationId}
            onBackToDashboard={() => setCurrentView('dashboard')}
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
