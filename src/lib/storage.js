import { supabase } from './supabase';

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

// Sobe a foto para o bucket público "avatars".
// O caminho começa com o id do usuário para a policy de storage permitir
// que cada pessoa escreva apenas na própria pasta.
export async function uploadAvatar(file, userId) {
  if (!file) throw new Error('Nenhuma foto selecionada.');
  if (!userId) throw new Error('Sessão expirada. Entre novamente.');
  if (!file.type.startsWith('image/')) {
    throw new Error('Escolha um arquivo de imagem.');
  }
  if (file.size > MAX_AVATAR_BYTES) {
    throw new Error('A foto deve ter no máximo 5 MB.');
  }

  const extension =
    (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') ||
    'jpg';
  const path = `${userId}/avatar-${Date.now()}.${extension}`;

  const { error } = await supabase.storage.from('avatars').upload(path, file, {
    cacheControl: '3600',
    upsert: true,
    contentType: file.type,
  });

  if (error) {
    if (/bucket/i.test(error.message)) {
      throw new Error(
        'O bucket de fotos ainda não foi criado. Rode o SQL de consolidação do briefing no Supabase.',
      );
    }
    throw error;
  }

  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  return data.publicUrl;
}

// Galeria de fotos do perfil (até 5). Mesma validação do avatar;
// arquivos ficam na pasta do próprio usuário (política de storage).
export async function uploadProfilePhoto(file, userId) {
  if (!file) throw new Error('Nenhuma foto selecionada.');
  if (!userId) throw new Error('Sessão expirada. Entre novamente.');
  if (!file.type.startsWith('image/')) {
    throw new Error('Escolha um arquivo de imagem.');
  }
  if (file.size > MAX_AVATAR_BYTES) {
    throw new Error('A foto deve ter no máximo 5 MB.');
  }

  const extension =
    (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') ||
    'jpg';
  const random = Math.random().toString(36).slice(2, 8);
  const path = `${userId}/gallery-${Date.now()}-${random}.${extension}`;

  const { error } = await supabase.storage.from('avatars').upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type,
  });

  if (error) {
    throw error;
  }

  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  return data.publicUrl;
}

// Remoção melhor-esforço: se falhar (permissão/rede), a foto só sai da
// galeria exibida — nunca derruba o fluxo de salvar o perfil.
export async function deleteProfilePhoto(publicUrl) {
  try {
    const marker = '/storage/v1/object/public/avatars/';
    const url = String(publicUrl || '');
    const idx = url.indexOf(marker);
    if (idx === -1) return;
    const path = decodeURIComponent(url.slice(idx + marker.length));
    if (!path) return;
    await supabase.storage.from('avatars').remove([path]);
  } catch {
    /* melhor esforço */
  }
}
