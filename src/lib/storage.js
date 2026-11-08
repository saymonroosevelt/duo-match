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
