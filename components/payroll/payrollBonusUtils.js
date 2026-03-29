/** To'lov sanalari matni (Kun, Oy, To'lov vaqti) */
export function payrollDateLabel(p) {
  if (!p) return '—';
  const parts = [];
  if (p.date) parts.push(`Kun: ${p.date}`);
  if (p.month) parts.push(`Oy: ${p.month}`);
  if (p.paidAt) {
    try {
      const d = new Date(p.paidAt);
      if (!Number.isNaN(d.getTime())) {
        parts.push(
          `To'lov: ${d.toLocaleString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`
        );
      }
    } catch (_) { /* empty */ }
  }
  if (parts.length === 0 && p.createdAt) {
    try {
      const d = new Date(p.createdAt);
      if (!Number.isNaN(d.getTime())) parts.push(`Yozuv: ${d.toLocaleDateString('uz-UZ')}`);
    } catch (_) { /* empty */ }
  }
  return parts.length ? parts.join(' · ') : '—';
}

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
