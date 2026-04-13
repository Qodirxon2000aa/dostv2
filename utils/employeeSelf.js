/**
 * Joriy foydalanuvchini xodimlar ro‘yxatidagi yozuv bilan moslashtirish.
 */
export function resolveEmployeeRecord(user, employees) {
  if (!user || !employees?.length) return null;
  const uid = user._id != null ? String(user._id) : '';
  const uu = user.uid != null ? String(user.uid) : '';
  const mail = user.email ? String(user.email).toLowerCase() : '';
  return (
    employees.find((e) => {
      const eid = e._id != null ? String(e._id) : '';
      const euid = e.uid != null ? String(e.uid) : '';
      const em = e.email ? String(e.email).toLowerCase() : '';
      return (
        (uid && (eid === uid || euid === uid)) ||
        (uu && (eid === uu || euid === uu)) ||
        (mail && em === mail)
      );
    }) || null
  );
}

export function employeeTargetId(employee) {
  return employee?._id || employee?.uid || null;
}
