// Controle local de mensagens não lidas (por dispositivo).
// Marca o momento em que o usuário abre cada conversa;
// mensagens recebidas depois desse marco contam como não lidas.

const STORAGE_KEY = 'dm_last_opened_matches';

export function readOpenedMap() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const map = raw ? JSON.parse(raw) : {};
    return map && typeof map === 'object' ? map : {};
  } catch {
    return {};
  }
}

export function markMatchOpened(matchId, at = new Date().toISOString()) {
  if (!matchId) return;
  try {
    const map = readOpenedMap();
    map[String(matchId)] = at;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // storage indisponível — segue sem contagem de não lidas
  }
}

export function getMatchOpenedAt(matchId) {
  const map = readOpenedMap();
  return map[String(matchId)] || null;
}
