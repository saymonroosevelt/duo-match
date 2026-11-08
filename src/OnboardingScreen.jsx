import React, { useRef, useState } from 'react';
import {
  ArrowRight,
  ArrowLeft,
  Camera,
  Check,
  CheckCircle2,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { supabase } from './lib/supabase';
import {
  INTEREST_OPTIONS,
  RELATIONSHIP_INTENTIONS,
} from './lib/constants';
import { friendlyError } from './lib/helpers';
import { uploadAvatar } from './lib/storage';
import Avatar from './components/Avatar';

export default function OnboardingScreen({ session }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [photoWarning, setPhotoWarning] = useState('');
  const [formData, setFormData] = useState({
    full_name: '',
    age: '',
    city: '',
    bio: '',
    photo_url: '',
    relationship_intention: '',
    interests: [],
  });
  const fileRef = useRef<HTMLInputElement | null>(null);

  function updateForm(key, value) {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }

  function toggleInterest(interest) {
    setFormData((prev) => {
      const current = prev.interests;
      return {
        ...prev,
        interests: current.includes(interest)
          ? current.filter((item) => item !== interest)
          : [...current, interest],
      };
    });
  }

  async function handlePhoto(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setUploading(true);
    setError('');
    setPhotoWarning('');
    try {
      const url = await uploadAvatar(file, session.user.id);
      updateForm('photo_url', url);
    } catch (uploadError) {
      setPhotoWarning(friendlyError(uploadError));
    } finally {
      setUploading(false);
    }
  }

  async function handleSaveProfile() {
    if (loading) return;

    const age = Number(formData.age);
    if (!formData.full_name.trim() || !formData.city.trim()) {
      setError('Preencha nome e cidade para continuar.');
      return;
    }
    if (!Number.isFinite(age) || age < 18 || age > 99) {
      setError('A idade precisa estar entre 18 e 99 anos.');
      return;
    }
    if (!formData.relationship_intention) {
      setError('Escolha o que você está procurando construir.');
      return;
    }
    if (formData.interests.length === 0) {
      setError('Selecione pelo menos um interesse.');
      return;
    }

    setLoading(true);
    setError('');

    const { error: saveError } = await supabase.from('profiles').upsert({
      id: session.user.id,
      full_name: formData.full_name.trim(),
      age,
      city: formData.city.trim(),
      bio: formData.bio.trim(),
      what_procura: formData.relationship_intention,
      intentions: formData.interests,
      photo_url: formData.photo_url || null,
      status: 'pending',
      lgpd_accepted_at: new Date().toISOString(),
    });

    setLoading(false);

    if (saveError) {
      setError(friendlyError(saveError));
      return;
    }

    setSaved(true);
  }

  if (saved) {
    return (
      <div className="min-h-[100dvh] text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <div className="relative z-10 max-w-sm w-full text-center">
          <div className="w-20 h-20 rounded-full border border-emerald-700/30 bg-emerald-950/30 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={36} className="text-emerald-300/80" />
          </div>
          <h1 className="text-3xl font-serif text-rose-50 mb-3">
            Perfil enviado para a curadoria
          </h1>
          <p className="text-sm text-rose-100/55 leading-relaxed mb-8">
            Recebemos seus dados. Nossa equipe avalia cada perfil manualmente antes
            de liberar o acesso ao Descobrir, matches e conversas.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="w-full rounded-full bg-[#f4ece8] py-4 text-sm font-semibold text-[#3a1c1c] hover:bg-white transition-colors inline-flex items-center justify-center gap-2"
          >
            <RefreshCw size={15} /> Verificar status
          </button>
          <p className="text-[10px] text-rose-100/25 mt-5 leading-relaxed">
            Não é necessário pagar para participar da curadoria.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] text-white p-6 flex flex-col relative overflow-hidden">

      <div className="flex items-center justify-between mb-5 z-10 pt-2">
        {step > 1 ? (
          <button
            type="button"
            onClick={() => {
              setError('');
              setStep(step - 1);
            }}
            className="w-9 h-9 rounded-full border border-white/10 bg-white/[0.03] flex items-center justify-center text-rose-200/70"
            aria-label="Voltar"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        ) : (
          <div className="w-9" />
        )}
        <span className="text-rose-200/40 text-[10px] uppercase tracking-[0.25em]">
          Passo {step} de 3
        </span>
        <div className="w-9" />
      </div>

      <div className="flex gap-1.5 mb-8 z-10 max-w-md w-full mx-auto">
        {[1, 2, 3].map((item) => (
          <div
            key={item}
            className={`h-1 flex-1 rounded-full transition-colors ${
              item <= step ? 'bg-rose-500/80' : 'bg-white/10'
            }`}
          />
        ))}
      </div>

      <div className="flex-1 flex flex-col z-10 max-w-md w-full mx-auto">
        {step === 1 && (
          <div className="animate-fade-in flex flex-col gap-5">
            <div>
              <h2 className="text-3xl font-serif mb-1 text-rose-50">Quem é você?</h2>
              <p className="text-sm text-rose-100/45">
                Essas informações ajudam a curadoria a entender seu perfil.
              </p>
            </div>

            <div className="flex flex-col items-center my-1">
              <div className="relative">
                <Avatar
                  src={formData.photo_url}
                  name={formData.full_name}
                  size="xl"
                />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="absolute -bottom-1 -right-1 w-10 h-10 rounded-full bg-[#f4ece8] text-[#3a1c1c] flex items-center justify-center border-4 border-[#0a0000] disabled:opacity-60"
                  aria-label="Enviar foto"
                >
                  {uploading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Camera size={16} />
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
              <p className="text-[10px] text-rose-100/25 mt-2">
                Foto opcional · pode adicionar depois
              </p>
              {photoWarning && (
                <p className="text-[10px] text-amber-300/60 mt-1 text-center max-w-[280px]">
                  {photoWarning}
                </p>
              )}
            </div>

            <label className="block">
              <span className="text-xs text-rose-100/55 ml-1">Nome completo</span>
              <input
                type="text"
                value={formData.full_name}
                onChange={(event) => updateForm('full_name', event.target.value)}
                className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.04] p-4 text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none focus:border-rose-500/50"
                placeholder="Ex: Matheus Silva"
              />
            </label>

            <div className="grid grid-cols-3 gap-3">
              <label className="block">
                <span className="text-xs text-rose-100/55 ml-1">Idade</span>
                <input
                  type="number"
                  min={18}
                  max={99}
                  value={formData.age}
                  onChange={(event) => updateForm('age', event.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.04] p-4 text-sm text-gray-100 focus:outline-none focus:border-rose-500/50"
                  placeholder="29"
                />
              </label>
              <label className="block col-span-2">
                <span className="text-xs text-rose-100/55 ml-1">Cidade e estado</span>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(event) => updateForm('city', event.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.04] p-4 text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none focus:border-rose-500/50"
                  placeholder="Florianópolis, SC"
                />
              </label>
            </div>

            <label className="block">
              <span className="text-xs text-rose-100/55 ml-1">
                Sobre você (opcional)
              </span>
              <textarea
                value={formData.bio}
                onChange={(event) => updateForm('bio', event.target.value)}
                rows={3}
                maxLength={700}
                className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.04] p-4 text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none focus:border-rose-500/50 resize-none"
                placeholder="Sua rotina, o que valoriza e o que gosta de fazer."
              />
            </label>

            <button
              type="button"
              onClick={() => {
                setError('');
                setStep(2);
              }}
              disabled={!formData.full_name || !formData.age || !formData.city}
              className="mt-3 w-full rounded-full bg-[#f4ece8] py-4 text-sm font-semibold text-[#3a1c1c] hover:bg-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              Continuar <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="animate-fade-in flex flex-col gap-5">
            <div>
              <h2 className="text-3xl font-serif mb-1 text-rose-50">
                O que você está procurando construir?
              </h2>
              <p className="text-sm text-rose-100/45">
                Escolha a intenção que mais representa você agora.
              </p>
            </div>

            <div className="flex flex-col gap-2.5">
              {RELATIONSHIP_INTENTIONS.map((intention) => (
                <button
                  key={intention}
                  type="button"
                  onClick={() => updateForm('relationship_intention', intention)}
                  className={`p-4 rounded-2xl text-left border transition-all flex items-center justify-between gap-3 ${
                    formData.relationship_intention === intention
                      ? 'border-rose-400 bg-rose-500/10 text-white'
                      : 'border-white/10 bg-white/[0.03] text-rose-100/60'
                  }`}
                >
                  <span className="text-sm leading-snug">{intention}</span>
                  {formData.relationship_intention === intention && (
                    <Check className="w-4 h-4 text-rose-400 shrink-0" />
                  )}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => {
                setError('');
                setStep(3);
              }}
              disabled={!formData.relationship_intention}
              className="mt-3 w-full rounded-full bg-[#f4ece8] py-4 text-sm font-semibold text-[#3a1c1c] hover:bg-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              Continuar <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="animate-fade-in flex flex-col gap-5">
            <div>
              <h2 className="text-3xl font-serif mb-1 text-rose-50">
                Explore por interesses
              </h2>
              <p className="text-sm text-rose-100/45">
                Selecione o que mais combina com você. Isso ajuda nos matches e nas
                comunidades.
              </p>
            </div>

            <div className="flex flex-wrap gap-2.5">
              {INTEREST_OPTIONS.map((interest) => {
                const isSelected = formData.interests.includes(interest);
                return (
                  <button
                    key={interest}
                    type="button"
                    onClick={() => toggleInterest(interest)}
                    className={`px-4 py-3 rounded-full border transition-all text-xs font-medium ${
                      isSelected
                        ? 'border-rose-400 bg-rose-500/20 text-white'
                        : 'border-white/10 bg-white/[0.04] text-rose-100/55'
                    }`}
                  >
                    {interest}
                  </button>
                );
              })}
            </div>

            {error && (
              <div className="rounded-xl border border-red-500/20 bg-red-950/20 px-4 py-3 text-xs text-red-200/80 leading-relaxed">
                {error}
              </div>
            )}

            <button
              type="button"
              onClick={handleSaveProfile}
              disabled={loading || formData.interests.length === 0}
              className="mt-2 w-full rounded-full bg-[#f4ece8] py-4 text-sm font-semibold text-[#3a1c1c] hover:bg-white transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Enviando...
                </>
              ) : (
                'Finalizar perfil'
              )}
            </button>

            <p className="text-[10px] text-center text-rose-100/25 leading-relaxed">
              Ao finalizar, seu perfil entra na fila de curadoria. O acesso só é
              liberado após a aprovação.
            </p>
          </div>
        )}

        {error && step !== 3 && (
          <div className="mt-4 rounded-xl border border-red-500/20 bg-red-950/20 px-4 py-3 text-xs text-red-200/80 leading-relaxed">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
