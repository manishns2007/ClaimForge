import React, { useState, useEffect } from 'react';
import { HeroSection } from './components/HeroSection';
import { ExecutiveDashboard } from './components/ExecutiveDashboard';
import { InvestigationWorkspace } from './components/InvestigationWorkspace';
import { NewInvestigationModal } from './components/NewInvestigationModal';
import { AuthModal } from './components/AuthModal';
import { Navbar as AppNavbar } from './components/Navbar';
import { AuthProvider, useAuth } from './context/AuthContext';
import { fetchDashboardStats, fetchInvestigations } from './services/api';
import type { DashboardStats, Investigation } from './types/api';

const AppContent: React.FC = () => {
  const { isAuthenticated, openAuthModal } = useAuth();
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

  const handleNavigate = (view: 'hero' | 'dashboard' | 'investigation', invId?: string) => {
    if ((view === 'dashboard' || view === 'investigation') && !isAuthenticated) {
      openAuthModal('signin');
      return;
    }
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

  const handleAuthSuccess = () => {
    setActiveView('dashboard');
  };

  return (
    <div className="min-h-screen bg-[#F7F7F5] text-[#20242A]">
      {activeView === 'hero' ? (
        <HeroSection 
          onLaunchPlatform={() => {
            if (isAuthenticated) {
              setActiveView('dashboard');
            } else {
              openAuthModal('signup');
            }
          }} 
        />
      ) : (
        <>
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

          {/* Main Content Area */}
          <main className="w-full bg-[#F7F7F5]">
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
              <div className="py-20 text-center text-[#737A80] font-body">
                No investigation selected. Click Executive Overview to view portfolio.
              </div>
            )}
          </main>
        </>
      )}

      {/* Upload Modal */}
      {isUploadModalOpen && (
        <NewInvestigationModal
          onClose={() => setIsUploadModalOpen(false)}
          onSuccess={handleNewInvestigationSuccess}
        />
      )}

      {/* Global Auth Modal */}
      <AuthModal onSuccess={handleAuthSuccess} />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
