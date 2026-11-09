// Utilitários de geolocalização + distância (Haversine)

export function isValidCoord(value) {
  const lat = Number(value?.latitude);
  const lng = Number(value?.longitude);
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180 &&
    !(lat === 0 && lng === 0) // (0,0) = "Null Island", descarta
  );
}

// Arredonda para ~110 m de precisão (2 casas ≈ 1,1 km não; 4 casas ≈ 11 m).
// Aqui usamos 3 casas (≈110 m): suficiente para "a mais ou menos X km".
export function roundCoord(value) {
  return Math.round(Number(value) * 1000) / 1000;
}

export function haversineKm(from, to) {
  if (!isValidCoord(from) || !isValidCoord(to)) return null;

  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371; // raio médio da Terra em km

  const lat1 = toRad(Number(from.latitude));
  const lat2 = toRad(Number(to.latitude));
  const dLat = lat2 - lat1;
  const dLng = toRad(Number(to.longitude) - Number(from.longitude));

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  const km = 2 * R * Math.asin(Math.sqrt(a));
  return Math.round(km * 10) / 10; // 1 casa decimal
}

export function formatDistanceLabel(km, { suffix = 'de você' } = {}) {
  if (km == null || !Number.isFinite(km)) return null;
  if (km < 1) return `A menos de 1 km ${suffix}`.trim();
  return `A ${Math.round(km)} km ${suffix}`.trim();
}

export function distanceLabel(from, to, opts) {
  const km = haversineKm(from, to);
  return formatDistanceLabel(km, opts);
}

// Geolocalização do navegador, com motivos tipados para tratar a negação do GPS.
export function getCurrentPosition({ timeout = 10000 } = {}) {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject({ code: 'unsupported' });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: roundCoord(position.coords.latitude),
          longitude: roundCoord(position.coords.longitude),
        });
      },
      (error) => {
        // 1 = PERMISSION_DENIED · 2 = POSITION_UNAVAILABLE · 3 = TIMEOUT
        reject({ code: error?.code ?? 'unknown' });
      },
      { enableHighAccuracy: false, timeout, maximumAge: 5 * 60 * 1000 },
    );
  });
}

export function locationErrorMessage(error) {
  const code = error?.code;
  if (code === 1) return 'Localização não permitida';
  if (code === 2) return 'Não foi possível obter sua localização';
  if (code === 3) return 'Tempo esgotado ao obter a localização';
  if (code === 'unsupported') return 'Localização não suportada neste dispositivo';
  return 'Não foi possível obter sua localização';
}

// Captura + salva no perfil. Nunca lança: resolve { ok, coords?, message }.
export async function captureAndSaveLocation(supabase, userId) {
  try {
    const coords = await getCurrentPosition();
    const { error } = await supabase
      .from('profiles')
      .update({ latitude: coords.latitude, longitude: coords.longitude })
      .eq('id', userId);
    if (error) return { ok: false, message: 'Falha ao salvar localização' };
    return { ok: true, coords };
  } catch (error) {
    return { ok: false, message: locationErrorMessage(error) };
  }
}
