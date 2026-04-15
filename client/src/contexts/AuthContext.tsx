import { createContext, useContext, useState, ReactNode } from 'react';
import { getCurrentUser, setCurrentUser, getUserProfile, UserProfile } from '@/lib/store';

interface AuthContextType {
  user: string | null;
  profile: UserProfile | null;
  login: (username: string) => void;
  logout: () => void;
  refreshProfile: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  login: () => {},
  logout: () => {},
  refreshProfile: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  // Synchronous initialization to avoid flash/redirect on page refresh
  const [user, setUser] = useState<string | null>(() => {
    return getCurrentUser();
  });
  const [profile, setProfile] = useState<UserProfile | null>(() => {
    const saved = getCurrentUser();
    return saved ? getUserProfile(saved) : null;
  });

  const login = (username: string) => {
    setCurrentUser(username);
    setUser(username);
    setProfile(getUserProfile(username));
  };

  const logout = () => {
    setCurrentUser(null);
    setUser(null);
    setProfile(null);
  };

  const refreshProfile = () => {
    if (user) {
      setProfile(getUserProfile(user));
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, login, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
