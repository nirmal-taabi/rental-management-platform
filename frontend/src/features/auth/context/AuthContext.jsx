import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { authService } from '../services/auth.service';
import { shopService } from '../../shops/services/shop.service';
import { clearActiveShopPreference, getActiveShopPreference, setActiveShopPreference } from '../../../services/activeShopPreference';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [shop, setShop] = useState(null);
  const [availableShops, setAvailableShops] = useState([]);
  const [roles, setRoles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadSession = async () => {
    try {
      let response;
      try {
        response = await authService.getCurrentUser();
      } catch (requestError) {
        if (requestError.response?.status !== 403 || !getActiveShopPreference()) throw requestError;
        clearActiveShopPreference();
        response = await authService.getCurrentUser();
      }
      const payload = response?.data?.data || {};
      setUser(payload.user || null);
      setShop(payload.shop || null);
      setAvailableShops(payload.shops || (payload.shop ? [payload.shop] : []));
      setRoles(payload.user?.roles || []);
      if (payload.shop?.id) setActiveShopPreference(payload.shop.id);
    } catch (error) {
      setUser(null);
      setShop(null);
      setAvailableShops([]);
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
      availableShops,
      roles,
      isLoading,
      isAuthenticated: Boolean(user),
      setSession: (sessionUser, sessionShop, sessionShops = []) => {
        setUser(sessionUser || null);
        setShop(sessionShop || null);
        setAvailableShops(sessionShops.length ? sessionShops : (sessionShop ? [sessionShop] : []));
        setRoles(sessionUser?.roles || []);
        if (sessionShop?.id) setActiveShopPreference(sessionShop.id);
      },
      clearSession: () => {
        setUser(null);
        setShop(null);
        setAvailableShops([]);
        setRoles([]);
        clearActiveShopPreference();
      },
      refreshShops: async () => {
        const response = await shopService.getShops();
        const shops = response?.data?.data || [];
        setAvailableShops(shops);
        return shops;
      },
      switchShop: async (shopId) => {
        const response = await shopService.switchShop(shopId);
        const currentShop = response?.data?.data?.currentShop;
        if (!currentShop?.id) throw new Error('Unable to switch shops.');
        setActiveShopPreference(currentShop.id);
        setShop(currentShop);
        setRoles(currentShop.role ? [currentShop.role] : []);
        setUser((currentUser) => currentUser ? {
          ...currentUser,
          shopId: currentShop.id,
          roles: currentShop.role ? [currentShop.role] : [],
        } : currentUser);
        return currentShop;
      },
      reloadSession: loadSession,
    }),
    [user, shop, availableShops, roles, isLoading],
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
