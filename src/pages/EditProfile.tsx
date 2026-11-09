import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Loader2,
  MapPin,
  Plus,
  Save,
  Star,
  Trash2,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { captureAndSaveLocation } from '../lib/geo';
import {
  RELATIONSHIP_INTENTIONS,
  GENDER_OPTIONS,
  VIEW_PREFERENCE_OPTIONS,
} from '../lib/constants';
import { asArray, cleanText, clampInt, friendlyError, isMissingGenderColumn } from '../lib/helpers';
import { isAdminUser } from '../lib/permissions';
import { deleteProfilePhoto, uploadProfilePhoto } from '../lib/storage';
import Avatar from '../components/Avatar';
import BackButton from '../components/BackButton';
import Toast from '../components/Toast';

const MAX_PHOTOS = 5;
const MIN_PHOTOS = 3;
const BIO_MIN_CHARS = 150;

// Texto livre (vírgula, ponto e vírgula ou quebra de linha) → lista salva no perfil.
function parseTextList(text: any) {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of String(text || '').split(/[\n,;]+/)) {
    const clean = raw.trim().replace(/\s+/g, ' ');
    if (!clean) continue;
    const value = clean.slice(0, 80);
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(value);
    if (result.length >= 20) break;
  }
  return result;
}

function initialPhotos(profile: any) {
  const fromArray = asArray(profile?.photos);
  if (fromArray.length) return fromArray.slice(0, MAX_PHOTOS);
  const single = typeof profile?.photo_url === 'string' ? profile.photo_url.trim() : '';
  return single ? [single] : [];
}

function joinForEdit(list: any) {
  return Array.isArray(list) ? list.filter(Boolean).join(', ') : '';
}

export default function EditProfile({
  profile,
  onBack,
  onSaved,
}: {
  profile: any;
  onBack: () => void;
  onSaved: (profile: any) => void;
}) {
  const [form, setForm] = useState({
    full_name: profile?.full_name || '',
    age: profile?.age ?? '',
    city: profile?.city || '',
    bio: profile?.bio || '',
    what_procura: profile?.what_procura || '',
    interestsText: joinForEdit(asArray(profile?.intentions)),
    valuesText: joinForEdit(asArray(profile?.values_inegotiable)),
    photos: initialPhotos(profile),
    gender: profile?.gender || '',
    viewPreference: profile?.preferred_gender || '',
  });
  const [uploading, setUploading] = useState(0);
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationMessage, setLocationMessage] = useState('');
  const [error, setError] = useState('');
  const [toast, setToast] = useState<any>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  // Curadoria (os dois e-mails da administração) é isenta do mínimo de 150 caracteres.
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    let active = true;
    supabase.auth
      .getUser()
      .then(({ data: { user } }) => {
        if (active) setIsAdmin(isAdminUser({ user }));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const bioClean = cleanText(form.bio, 700);
  const bioLength = bioClean.length;
  const bioTooShort = !isAdmin && bioLength < BIO_MIN_CHARS;
  const photosMissing = Math.max(0, MIN_PHOTOS - form.photos.length);

  const intentionOptions = useMemo(() => {
    const options = [...RELATIONSHIP_INTENTIONS];
    if (form.what_procura && !options.includes(form.what_procura)) {
      options.unshift(form.what_procura);
    }
    return options;
  }, [form.what_procura]);

  const parsedInterests = useMemo(
    () => parseTextList(form.interestsText),
    [form.interestsText],
  );
  const parsedValues = useMemo(
    () => parseTextList(form.valuesText),
    [form.valuesText],
  );

  function update(key: string, value: any) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handlePhotos(event: any) {
    const input = (event?.target || event?.currentTarget) as HTMLInputElement | null;
    const fileList = input?.files;
    const files: File[] = [];
    if (fileList) {
      for (let index = 0; index < fileList.length; index += 1) {
        files.push(fileList.item(index) as File);
      }
    }
    if (input) input.value = '';
    const remaining = MAX_PHOTOS - form.photos.length;
    if (!files.length || remaining <= 0) return;

    const queue = files.slice(0, remaining);
    setUploading(queue.length);
    setError('');

    for (const file of queue) {
      try {
        const url = await uploadProfilePhoto(file, profile.id);
        setForm((prev) => ({
          ...prev,
          photos: [...prev.photos, url].slice(0, MAX_PHOTOS),
        }));
      } catch (uploadError) {
        setError(friendlyError(uploadError));
      } finally {
        setUploading((count) => Math.max(0, count - 1));
      }
    }
  }

  function removePhoto(url: string) {
    setForm((prev) => ({
      ...prev,
      photos: prev.photos.filter((photo) => photo !== url),
    }));
    deleteProfilePhoto(url); // melhor esforço — nunca bloqueia o salvar
  }

  function makePrimary(url: string) {
    setForm((prev) => ({
      ...prev,
      photos: [url, ...prev.photos.filter((photo) => photo !== url)],
    }));
  }

  async function handleUseLocation() {
    if (locating) return;
    setLocating(true);
    setError('');
    setLocationMessage('');
    const userId = profile?.id;
    if (!userId) {
      setLocating(false);
      setLocationMessage('Sessão expirada. Entre novamente.');
      return;
    }
    const result = await captureAndSaveLocation(supabase, userId);
    setLocating(false);
    setLocationMessage(
      result.ok
        ? 'Sua localização foi salva. Ela será usada só para mostrar a distância aos membros aprovados.'
        : result.message || 'N�o foi poss�vel salvar a localiza��o.',
    );
  }

  async function handleSave(event?: any) {
    event?.preventDefault();
    if (saving) return;

    const age = clampInt(form.age, 18, 99, NaN);
    const fullName = cleanText(form.full_name, 80);
    const city = cleanText(form.city, 80);
    const bio = cleanText(form.bio, 700);
    if (!fullName) {
      setError('Informe seu nome.');
      return;
    }
    if (!Number.isFinite(age)) {
      setError('A idade precisa estar entre 18 e 99 anos.');
      return;
    }
    if (!city) {
      setError('Informe sua cidade.');
      return;
    }
    if (photosMissing > 0) {
      setError(
        `Adicione mais ${photosMissing} foto${
          photosMissing > 1 ? 's' : ''
        } — o perfil precisa de no mínimo ${MIN_PHOTOS} fotos (e no máximo ${MAX_PHOTOS}).`,
      );
      return;
    }
    if (bioTooShort) {
      setError(
        `Sua biografia precisa ter pelo menos ${BIO_MIN_CHARS} caracteres (${bioLength} hoje). Conte um pouco mais sobre você — intenções reais começam por perfis reais.`,
      );
      return;
    }
    if (!form.gender) {
      setError('Escolha o seu gênero para salvar o perfil.');
      return;
    }

    setSaving(true);
    setError('');

    const payload = {
      full_name: fullName,
      age,
      city,
      bio,
      what_procura: form.what_procura,
      intentions: parsedInterests,
      values_inegotiable: parsedValues,
      photos: form.photos,
      photo_url: form.photos[0] || null,
      gender: form.gender || null,
      preferred_gender: form.viewPreference || null,
    };

    // Tolerante a banco ainda sem a coluna `gender` (SQL de migração pendente)
    let { data, error: saveError } = await supabase
      .from('profiles')
      .update(payload)
      .eq('id', profile.id)
      .select()
      .single();

    let genderMissing = false;
    if (saveError && isMissingGenderColumn(saveError)) {
      const { gender: _gender, ...withoutGender } = payload;
      ({ data, error: saveError } = await supabase
        .from('profiles')
        .update(withoutGender)
        .eq('id', profile.id)
        .select()
        .single());
      if (!saveError) genderMissing = true;
    }

    setSaving(false);

    if (saveError) {
      setError(friendlyError(saveError));
      return;
    }

    if (genderMissing) {
      setToast({
        type: 'error',
        message:
          'Seu perfil foi salvo, mas o gênero ainda não pode ser gravado (falta a coluna no banco). Rode o SQL de migração 20261114_profiles_gender.sql.',
      });
    } else {
      setToast({ type: 'success', message: 'Perfil atualizado.' });
    }
    onSaved(data);
  }

  return (
    <div className="min-h-[100dvh] text-white">
      <header className="sticky top-0 z-30 border-b border-white/[0.07] bg-[#150408]">
        <div className="max-w-md mx-auto px-5 py-4 flex items-center justify-between">
          <BackButton onClick={onBack} />
          <h1 className="text-xl font-serif text-rose-50">Editar perfil</h1>
          <div className="w-16" />
        </div>
      </header>

      <form onSubmit={handleSave} className="max-w-md mx-auto px-5 pt-6 pb-32">
        {/* Galeria de fotos — até 5, a primeira é a foto principal */}
        <div className="mb-7">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs text-rose-100/55 ml-1">
              Suas fotos{' '}
              <span className="text-rose-100/30">
                · {form.photos.length}/{MAX_PHOTOS} (mín. {MIN_PHOTOS})
              </span>
            </span>
            <span className="text-[9px] uppercase tracking-[0.18em] text-rose-100/30">
              a 1ª é a principal
            </span>
          </div>

          <div className="grid grid-cols-5 gap-2">
            {form.photos.map((photo, index) => (
              <div
                key={photo}
                className={`relative aspect-[3/4] overflow-hidden rounded-2xl border bg-white/[0.03] ${
                  index === 0 ? 'border-rose-400/60' : 'border-white/10'
                }`}
              >
                <img
                  src={photo}
                  alt={`Foto ${index + 1} do perfil`}
                  className="absolute inset-0 h-full w-full object-cover"
                  onError={(event) => {
                    (event.target as HTMLImageElement).style.opacity = '0.25';
                  }}
                />
                {index === 0 ? (
                  <span className="absolute top-1.5 left-1.5 rounded-full bg-rose-500/90 px-1.5 py-0.5 text-[7px] font-semibold uppercase tracking-[0.18em] text-white">
                    Principal
                  </span>
                ) : null}
                <div className="absolute bottom-1.5 right-1.5 flex gap-1">
                  {index !== 0 && (
                    <button
                      type="button"
                      onClick={() => makePrimary(photo)}
                      aria-label="Definir como foto principal"
                      title="Definir como principal"
                      className="w-6 h-6 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-amber-300 hover:text-amber-200"
                    >
                      <Star size={11} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => removePhoto(photo)}
                    aria-label="Remover foto"
                    title="Remover foto"
                    className="w-6 h-6 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-rose-200/80 hover:text-white"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>
            ))}

            {form.photos.length < MAX_PHOTOS && (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading > 0}
                className="relative aspect-[3/4] rounded-2xl border border-dashed border-white/20 bg-white/[0.02] flex flex-col items-center justify-center gap-1 text-rose-100/45 hover:border-rose-400/50 hover:text-rose-100/75 transition-colors disabled:opacity-60"
              >
                {uploading > 0 ? (
                  <Loader2 size={17} className="animate-spin" />
                ) : (
                  <Plus size={19} />
                )}
                <span className="text-[8px] uppercase tracking-[0.2em]">
                  {uploading > 0 ? `Enviando ${uploading}` : 'Adicionar'}
                </span>
              </button>
            )}
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handlePhotos}
          />
          <p className="mt-2.5 text-center text-[10px] leading-relaxed text-rose-100/30">
            O perfil precisa de{' '}
            <strong className="text-rose-100/60">3 a 5 fotos</strong> — a primeira é a
            foto principal exibida no app · até 5 MB por foto. Toque na estrela para
            escolher qual é a principal.
          </p>
          {photosMissing > 0 && (
            <p className="mt-2 text-center text-[10px] leading-relaxed text-amber-300/70">
              Faltam {photosMissing} foto{photosMissing > 1 ? 's' : ''} para o mínimo de {MIN_PHOTOS}.
            </p>
          )}
        </div>

        {/* Avatar de pré-visualização da foto principal */}
        <div className="flex items-center gap-4 mb-6 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-3">
          <Avatar src={form.photos[0] || ''} name={form.full_name} size="md" />
          <div className="min-w-0">
            <p className="text-[11px] text-rose-100/70 leading-snug">
              É assim que os membros aprovados verão a sua foto principal.
            </p>
            <p className="text-[9px] uppercase tracking-widest text-rose-100/30 mt-1">
              {photosMissing > 0
                ? `Faltam ${photosMissing} foto${photosMissing > 1 ? 's' : ''} para salvar`
                : `${form.photos.length} foto${form.photos.length > 1 ? 's' : ''} na galeria`}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <label className="block">
            <span className="text-xs text-rose-100/55 ml-1">Nome completo</span>
            <input
              value={form.full_name}
              onChange={(event) => update('full_name', event.target.value)}
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3.5 text-sm text-white focus:outline-none focus:border-rose-500/40"
              placeholder="Seu nome"
            />
          </label>

          <div className="grid grid-cols-3 gap-3">
            <label className="block">
              <span className="text-xs text-rose-100/55 ml-1">Idade</span>
              <input
                type="number"
                min={18}
                max={99}
                value={form.age}
                onChange={(event) => update('age', event.target.value)}
                className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3.5 text-sm text-white focus:outline-none focus:border-rose-500/40"
              />
            </label>
            <label className="block col-span-2">
              <span className="text-xs text-rose-100/55 ml-1">Cidade e estado</span>
              <input
                value={form.city}
                onChange={(event) => update('city', event.target.value)}
                className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3.5 text-sm text-white focus:outline-none focus:border-rose-500/40"
                placeholder="Florianópolis, SC"
              />
            </label>
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-3.5 flex items-center gap-3">
            <MapPin size={17} className="text-rose-200/60 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] text-rose-100/70 leading-snug">
                Mostre a distância entre você e outros membros (aproximada, em km).
              </p>
              {locationMessage && (
                <p className="text-[10px] text-rose-100/45 mt-1 leading-snug">
                  {locationMessage}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={handleUseLocation}
              disabled={locating}
              className="shrink-0 rounded-full border border-white/15 bg-white/[0.06] px-3 py-2 text-[10px] uppercase tracking-widest text-rose-100/70 hover:bg-white/[0.09] disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              {locating ? <Loader2 size={12} className="animate-spin" /> : null}
              {locating ? 'Localizando' : 'Ativar GPS'}
            </button>
          </div>

          <label className="block">
            <span className="text-xs text-rose-100/55 ml-1">
              Sobre você
              {isAdmin && (
                <span className="ml-2 text-[8px] uppercase tracking-[0.18em] text-amber-300/60 align-middle">
                  Curadoria · sem mínimo
                </span>
              )}
            </span>
            <textarea
              value={form.bio}
              onChange={(event) => update('bio', event.target.value)}
              rows={4}
              maxLength={700}
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3.5 text-sm text-white placeholder:text-rose-100/25 focus:outline-none focus:border-rose-500/40 resize-none"
              placeholder="Conte um pouco sobre você, sua rotina e o que valoriza."
            />
            <div className="mt-1.5 flex items-center justify-between gap-3">
              <span
                className={
                  bioTooShort
                    ? 'text-[9px] leading-relaxed text-amber-300/70'
                    : 'text-[9px] leading-relaxed text-emerald-300/60'
                }
              >
                {isAdmin
                  ? 'Você é da curadoria — escreva o que quiser, sem mínimo.'
                  : bioLength === 0
                    ? `Mínimo de ${BIO_MIN_CHARS} caracteres para salvar`
                    : bioTooShort
                      ? `Faltam ${BIO_MIN_CHARS - bioLength} caracteres (mínimo ${BIO_MIN_CHARS})`
                      : 'Mínimo de 150 caracteres atingido'}
              </span>
              <span className="shrink-0 text-[9px] text-rose-100/25">
                {bioLength}/700
              </span>
            </div>
          </label>

          <label className="block">
            <span className="text-xs text-rose-100/55 ml-1">O que você busca</span>
            <select
              value={form.what_procura}
              onChange={(event) => update('what_procura', event.target.value)}
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#171719] px-4 py-3.5 text-sm text-white focus:outline-none focus:border-rose-500/40"
            >
              <option value="">Selecione</option>
              {intentionOptions.map((intention) => (
                <option key={intention} value={intention}>
                  {intention}
                </option>
              ))}
            </select>
          </label>

          {/* Seu gênero — obrigatório */}
          <div>
            <span className="text-xs text-rose-100/55 ml-1">
              Seu gênero <span className="text-rose-300/70">*</span>
            </span>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {GENDER_OPTIONS.map((option) => {
                const selected = form.gender === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => update('gender', option.value)}
                    className={`p-4 rounded-2xl border transition-all text-sm ${
                      selected
                        ? 'border-rose-400 bg-rose-500/10 text-white'
                        : 'border-white/10 bg-white/[0.03] text-rose-100/60 hover:border-white/20'
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
            {!form.gender && (
              <p className="mt-1.5 ml-1 text-[10px] text-amber-300/70">
                Escolha o seu gênero para salvar o perfil.
              </p>
            )}
          </div>

          {/* O que você deseja ver? — filtro da tela Explorar */}
          <div>
            <span className="text-xs text-rose-100/55 ml-1">O que você deseja ver?</span>
            <div className="grid grid-cols-3 gap-2 mt-2">
              {VIEW_PREFERENCE_OPTIONS.map((option) => {
                const selected = form.viewPreference === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => update('viewPreference', option.value)}
                    className={`p-3.5 rounded-2xl border transition-all text-xs text-center ${
                      selected
                        ? 'border-rose-400 bg-rose-500/15 text-white'
                        : 'border-white/10 bg-white/[0.03] text-rose-100/60 hover:border-white/20'
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
            <p className="mt-1.5 ml-1 text-[10px] text-rose-100/35 leading-relaxed">
              Usada na tela Explorar para mostrar apenas quem você escolheu ver.
              (Quem escolher Ambos, ou não escolher, vê todos os perfis.)
            </p>
          </div>

          {/* Interesses — texto livre */}
          <div>
            <span className="text-xs text-rose-100/55 ml-1">Interesses</span>
            <textarea
              value={form.interestsText}
              onChange={(event) => update('interestsText', event.target.value)}
              rows={3}
              maxLength={600}
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3.5 text-sm text-white placeholder:text-rose-100/25 focus:outline-none focus:border-rose-500/40 resize-none"
              placeholder="Escreva livremente, do seu jeito..."
            />
            <p className="mt-1.5 ml-1 text-[10px] text-rose-100/35 leading-relaxed">
              Sem lista fechada: escreva o que você quiser — separando por vírgula
              ou quebrando linhas, se preferir.
            </p>
            {parsedInterests.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {parsedInterests.map((interest) => (
                  <span
                    key={interest}
                    className="rounded-full border border-rose-400/25 bg-rose-500/10 px-2.5 py-1 text-[10px] text-rose-100/85"
                  >
                    {interest}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Valores inegociáveis — texto livre */}
          <div>
            <span className="text-xs text-rose-100/55 ml-1">Valores inegociáveis</span>
            <textarea
              value={form.valuesText}
              onChange={(event) => update('valuesText', event.target.value)}
              rows={3}
              maxLength={600}
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3.5 text-sm text-white placeholder:text-rose-100/25 focus:outline-none focus:border-rose-500/40 resize-none"
              placeholder="Escreva livremente, do seu jeito..."
            />
            <p className="mt-1.5 ml-1 text-[10px] text-rose-100/35 leading-relaxed">
              Escreva o que é essencial para você em um relacionamento — sem
              opções fixas.
            </p>
            {parsedValues.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {parsedValues.map((value) => (
                  <span
                    key={value}
                    className="rounded-full border border-rose-400/25 bg-rose-500/10 px-2.5 py-1 text-[10px] text-rose-100/85"
                  >
                    {value}
                  </span>
                ))}
              </div>
            )}
          </div>

        </div>

        {error && (
          <p className="mt-5 rounded-xl border border-red-500/20 bg-red-950/30 px-4 py-3 text-xs text-red-200/80">
            {error}
          </p>
        )}

      </form>

      <div className="fixed bottom-0 left-0 right-0 border-t border-white/[0.07] bg-[#150408] px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <div className="max-w-md mx-auto">
          <button
            type="button"
            onClick={handleSave}
            disabled={
              saving ||
              uploading > 0 ||
              bioTooShort ||
              photosMissing > 0 ||
              !form.gender
            }
            className="w-full rounded-full bg-[#f4ece8] py-4 text-sm font-semibold text-[#3a1c1c] hover:bg-white disabled:opacity-50 transition-colors inline-flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Salvando...
              </>
            ) : (
              <>
                <Save size={16} /> Salvar alterações
              </>
            )}
          </button>
        </div>
      </div>

      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}
    </div>
  );
}
