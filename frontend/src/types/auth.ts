export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: string;
  company: string;
  provider: 'google' | 'email' | 'demo';
}

export interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAuthModalOpen: boolean;
  authMode: 'signin' | 'signup';
  openAuthModal: (mode?: 'signin' | 'signup') => void;
  closeAuthModal: () => void;
  signInWithGoogle: () => Promise<UserProfile>;
  signInWithEmail: (email: string, pass?: string) => Promise<UserProfile>;
  signInAsDemo: () => Promise<UserProfile>;
  signOut: () => void;
}
