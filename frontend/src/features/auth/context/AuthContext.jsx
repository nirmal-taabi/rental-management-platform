import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { authService } from '../services/auth.service';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [shop, setShop] = useState(null);
  const [roles, setRoles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadSession = async () => {
    try {
      const response = await authService.getCurrentUser();
      const payload = response?.data?.data || {};
      setUser(payload.user || null);
      setShop(payload.shop || null);
      setRoles(payload.user?.roles || []);
    } catch (error) {
      setUser(null);
      setShop(null);
      setRoles([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSession();
  }, []);

  const value = useMemo(
    () => ({
      user,
      shop,
      roles,
      isLoading,
      isAuthenticated: Boolean(user),
      setSession: (sessionUser, sessionShop) => {
        setUser(sessionUser || null);
        setShop(sessionShop || null);
        setRoles(sessionUser?.roles || []);
      },
      clearSession: () => {
        setUser(null);
        setShop(null);
        setRoles([]);
      },
      reloadSession: loadSession,
    }),
    [user, shop, roles, isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
};
