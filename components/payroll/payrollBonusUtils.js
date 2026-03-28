/** Faol bonus: jarima kabi faqat bekor bo'lmaganlar (active / ACTIVE / bo'sh) */
export function bonusIsActive(b) {
  const s = String(b?.status ?? 'active').toLowerCase();
  return s !== 'cancelled' && s !== 'canceled';
}

export function sumActiveBonusesForEmployee(bonuses, empId) {
  const id = String(empId);
  return (bonuses || [])
    .filter(b => bonusIsActive(b) && String(b.employeeId?._id || b.employeeId) === id)
    .reduce((s, b) => s + (Number(b.amount) || 0), 0);
}
