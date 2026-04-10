/**
 * SUPER_ADMIN / ADMIN — admin panel akkauntlari; «Xodimlar» ro‘yxatida chiqmaydi,
 * lekin «Davomat» va boshqa joylarda ishtirok etishi mumkin.
 */
export const ADMIN_PANEL_ROLES = ['SUPER_ADMIN', 'ADMIN'];

export function isAdminPanelRole(emp) {
  if (!emp || typeof emp !== 'object') return false;
  return ADMIN_PANEL_ROLES.includes(emp.role);
}

/** Faqat ishchi xodimlar (administratorlar chiqarilgan) */
export function filterWorkforceEmployees(employees) {
  if (!Array.isArray(employees)) return [];
  return employees.filter((e) => !isAdminPanelRole(e));
}
