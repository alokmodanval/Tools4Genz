import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { CustomerUser, platformService } from '@/services/platformService';

interface CustomerAuthValue { loading: boolean; enabled: boolean; user: CustomerUser | null; refresh: () => Promise<void>; logout: () => Promise<void> }
const CustomerAuthContext = createContext<CustomerAuthValue>({ loading: true, enabled: false, user: null, refresh: async () => {}, logout: async () => {} });

export const CustomerAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loading, setLoading] = useState(true); const [enabled, setEnabled] = useState(false); const [user, setUser] = useState<CustomerUser | null>(null);
  const refresh = useCallback(async () => { const status = await platformService.authStatus(); setEnabled(status.enabled); setUser(status.user); setLoading(false); }, []);
  useEffect(() => {
    platformService.authStatus().then((status) => {
      setEnabled(status.enabled);
      setUser(status.user);
      setLoading(false);
    });
  }, []);
  const logout = useCallback(async () => { await platformService.logout(); setUser(null); }, []);
  const value = useMemo(() => ({ loading, enabled, user, refresh, logout }), [loading, enabled, user, refresh, logout]);
  return <CustomerAuthContext.Provider value={value}>{children}</CustomerAuthContext.Provider>;
};
export const useCustomerAuth = () => useContext(CustomerAuthContext);
