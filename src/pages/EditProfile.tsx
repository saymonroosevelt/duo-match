import { useMemo, useRef, useState } from 'react';
import { Camera, Loader2, MapPin, Save, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { captureAndSaveLocation } from '../lib/geo';
import {
  INTEREST_OPTIONS,
  RELATIONSHIP_INTENTIONS,
  VALUES_OPTIONS,
} from '../lib/constants';
import { asArray, cleanText, clampInt, friendlyError } from '../lib/helpers';
import { uploadAvatar } from '../lib/storage';
import Avatar from '../components/Avatar';
import BackButton from '../components/BackButton';
import Toast from '../components/Toast';

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
    age: profile?.age || '',
    city: profile?.city || '',
    bio: profile?.bio || '',
    what_procura: profile?.what_procura || '',
    interests: asArray(profile?.intentions),
    values: asArray(profile?.values_inegotiable),
    photo_url: profile?.photo_url || '',
  });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationMessage, setLocationMessage] = useState('');
  const [error, setError] = useState('');
  const [toast, setToast] = useState<any>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const intentionOptions = useMemo(() => {
    const options = [...RELATIONSHIP_INTENTIONS];
    if (form.what_procura && !options.includes(form.what_procura)) {
      options.unshift(form.what_procura);
    }
    return options;
  }, [form.what_procura]);

  function update(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleArray(key, value) {
    setForm((prev) => {
      const current = prev[key];
      return {
        ...prev,
        [key]: current.includes(value)
          ? current.filter((item) => item !== value)
          : [...current, value],
      };
    });
  }

  async function handlePhoto(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setUploading(true);
    setError('');
    try {
      const url = await uploadAvatar(file, profile.id);
      update('photo_url', url);
    } catch (uploadError) {
      setError(friendlyError(uploadError));
    } finally {
      setUploading(false);
    }
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
        : result.message,
    );
  }

  async function handleSave(event) {
    event?.preventDefault();
    if (saving) return;

    const age = clampInt(form.age, 18, 99, NaN);
    const fullName = cleanText(form.full_name, 80);
    const city = cleanText(form.city, 80);
    const bio = cleanText(form.bio, 500);
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

    setSaving(true);
    setError('');

    const payload = {
      full_name: fullName,
      age,
      city,
      bio,
      what_procura: form.what_procura,
      intentions: form.interests,
      values_inegotiable: form.values,
      photo_url: form.photo_url || null,
    };

    const { data, error: saveError } = await supabase
      .from('profiles')
      .update(payload)
      .eq('id', profile.id)
      .select()
      .single();

    setSaving(false);

    if (saveError) {
      setError(friendlyError(saveError));
      return;
    }

    setToast({ type: 'success', message: 'Perfil atualizado.' });
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
        <div className="flex flex-col items-center mb-7">
          <div className="relative">
            <Avatar src={form.photo_url} name={form.full_name} size="xl" />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="absolute -bottom-1 -right-1 w-11 h-11 rounded-full bg-[#f4ece8] text-[#3a1c1c] flex items-center justify-center border-4 border-[#0a0000] disabled:opacity-60"
              aria-label="Enviar foto"
            >
              {uploading ? (
                <Loader2 size={17} className="animate-spin" />
              ) : (
                <Camera size={17} />
              )}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhoto}
            />
          </div>
          <p className="text-[10px] text-rose-100/30 mt-3 text-center">
            Foto pública para membros aprovados · até 5 MB
          </p>
          {form.photo_url && (
            <button
              type="button"
              onClick={() => update('photo_url', '')}
              className="mt-2 inline-flex items-center gap-1 text-[10px] text-red-300/60 hover:text-red-200"
            >
              <Trash2 size={11} /> Remover foto
            </button>
          )}
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
            <span className="text-xs text-rose-100/55 ml-1">Sobre você</span>
            <textarea
              value={form.bio}
              onChange={(event) => update('bio', event.target.value)}
              rows={4}
              maxLength={700}
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3.5 text-sm text-white placeholder:text-rose-100/25 focus:outline-none focus:border-rose-500/40 resize-none"
              placeholder="Conte um pouco sobre você, sua rotina e o que valoriza."
            />
            <span className="block text-right text-[9px] text-rose-100/25 mt-1">
              {form.bio.length}/700
            </span>
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

          <div>
            <span className="text-xs text-rose-100/55 ml-1">Interesses</span>
            <div className="flex flex-wrap gap-2 mt-2">
              {INTEREST_OPTIONS.map((interest) => {
                const selected = form.interests.includes(interest);
                return (
                  <button
                    key={interest}
                    type="button"
                    onClick={() => toggleArray('interests', interest)}
                    className={`rounded-full border px-3.5 py-2 text-xs transition-colors ${
                      selected
                        ? 'border-rose-400 bg-rose-500/15 text-white'
                        : 'border-white/10 bg-white/[0.04] text-rose-100/55'
                    }`}
                  >
                    {interest}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <span className="text-xs text-rose-100/55 ml-1">
              Valores inegociáveis
            </span>
            <div className="flex flex-wrap gap-2 mt-2">
              {VALUES_OPTIONS.map((value) => {
                const selected = form.values.includes(value);
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => toggleArray('values', value)}
                    className={`rounded-full border px-3.5 py-2 text-xs transition-colors ${
                      selected
                        ? 'border-rose-400 bg-rose-500/15 text-white'
                        : 'border-white/10 bg-white/[0.04] text-rose-100/55'
                    }`}
                  >
                    {value}
                  </button>
                );
              })}
            </div>
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
            disabled={saving || uploading}
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
