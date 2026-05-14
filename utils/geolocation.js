export function getCurrentPositionOnce(options) {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('Geolocation mavjud emas'));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });
}

/**
 * Geolokatsiyani ishonchli olish:
 * 1) High accuracy urinish
 * 2) Timeout/position error bo'lsa low accuracy fallback
 */
export async function getCurrentPositionRobust() {
  try {
    const first = await getCurrentPositionOnce({
      enableHighAccuracy: true,
      timeout: 18000,
      maximumAge: 5000,
    });
    const firstAcc = Number(first?.coords?.accuracy || 99999);
    if (Number.isFinite(firstAcc) && firstAcc <= 60) return first;
    // Aniqlik past bo'lsa yana bir marta high-accuracy urinish
    const second = await getCurrentPositionOnce({
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    });
    const secondAcc = Number(second?.coords?.accuracy || 99999);
    return secondAcc <= firstAcc ? second : first;
  } catch (err) {
    const code = Number(err?.code || 0);
    if (code === 1) throw err; // permission denied
    return getCurrentPositionOnce({
      enableHighAccuracy: false,
      timeout: 25000,
      maximumAge: 60000,
    });
  }
}
