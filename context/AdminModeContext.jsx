import React, { createContext, useContext, useMemo } from 'react';

const AdminModeContext = createContext({
  canMutate: true,
  isViewOnlyAdmin: false,
  isSuperAdmin: false,
});

export function AdminModeProvider({ children, currentUser }) {
  const value = useMemo(() => {
    const role = currentUser?.role;
    const isSuperAdmin = role === 'SUPER_ADMIN';
    const isViewOnlyAdmin = role === 'ADMIN';
    return {
      isSuperAdmin,
      isViewOnlyAdmin,
      /** Ma'lumotlarni o'zgartirish — faqat SUPER_ADMIN */
      canMutate: isSuperAdmin,
    };
  }, [currentUser?.role]);

  return <AdminModeContext.Provider value={value}>{children}</AdminModeContext.Provider>;
}

export function useAdminMode() {
  return useContext(AdminModeContext);
}
