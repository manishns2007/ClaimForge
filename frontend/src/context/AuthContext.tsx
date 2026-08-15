import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { UserProfile, AuthContextType } from '../types/auth';

const STORAGE_KEY = 'claimforge_auth_user';

const DEFAULT_DEMO_USER: UserProfile = {
  id: 'usr_google_108291',
  name: 'Alex Morgan',
  email: 'alex.morgan@claimforge.ai',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  role: 'Lead Claims Investigator',
  company: 'Apex Infrastructure Group',
  provider: 'google'
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');

  useEffect(() => {
    if (user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [user]);

  const openAuthModal = (mode: 'signin' | 'signup' = 'signin') => {
    setAuthMode(mode);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  const signInWithGoogle = async (): Promise<UserProfile> => {
    setIsLoading(true);
    // Simulate realistic Google OAuth network handshake
    await new Promise((resolve) => setTimeout(resolve, 800));

    const googleUser: UserProfile = {
      id: `usr_g_${Date.now()}`,
      name: 'Alex Morgan',
      email: 'alex.morgan@gmail.com',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      role: 'Senior Financial Auditor',
      company: 'Enterprise Portfolio Partners',
      provider: 'google'
    };

    setUser(googleUser);
    setIsLoading(false);
    setIsAuthModalOpen(false);
    return googleUser;
  };

  const signInWithEmail = async (email: string): Promise<UserProfile> => {
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 700));

    const namePart = email.split('@')[0].replace('.', ' ');
    const formattedName = namePart.charAt(0).toUpperCase() + namePart.slice(1);

    const emailUser: UserProfile = {
      id: `usr_e_${Date.now()}`,
      name: formattedName || 'Enterprise User',
      email: email,
      avatar: undefined,
      role: 'Claims Analyst',
      company: email.split('@')[1]?.split('.')[0]?.toUpperCase() || 'Global Corp',
      provider: 'email'
    };

    setUser(emailUser);
    setIsLoading(false);
    setIsAuthModalOpen(false);
    return emailUser;
  };

  const signInAsDemo = async (): Promise<UserProfile> => {
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 500));
    setUser(DEFAULT_DEMO_USER);
    setIsLoading(false);
    setIsAuthModalOpen(false);
    return DEFAULT_DEMO_USER;
  };

  const signOut = () => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        isAuthModalOpen,
        authMode,
        openAuthModal,
        closeAuthModal,
        signInWithGoogle,
        signInWithEmail,
        signInAsDemo,
        signOut
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
