import { useState } from 'react';
import { supabase } from '../services/supabaseClient';

const INTENTION_OPTIONS = [
  'Relacionamento sério', 'Casamento e família', 'Parceiro(a) de vida', 
  'Crescimento conjunto', 'Companhia e experiências', 'Outro'
];

export default function CompleteProfile() {
  const [formData, setFormData] = useState({
    full_name: '', bio: '', intentions: [] as string[]
  });
  const [loading, setLoading] = useState(false);

  const toggleIntention = (intention: string) => {
    setFormData(prev => ({
      ...prev,
      intentions: prev.intentions.includes(intention)
        ? prev.intentions.filter(i => i !== intention)
        : [...prev.intentions, intention]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from('profiles').upsert({
      id: user.id,
      ...formData,
      status: 'pending'
    });

    if (error) alert('Erro: ' + error.message);
    else { alert('Perfil enviado!'); window.location.reload(); }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] p-6 pb-20">
      <h2 className="text-2xl font-serif text-[#4A0E0E] mb-6">Complete seu perfil</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        
        <section>
          <h3 className="font-bold text-stone-800 mb-3">Dados Pessoais</h3>
          <input className="w-full p-3 border rounded mb-2" placeholder="Nome Completo" value={formData.full_name} onChange={(e) => setFormData({...formData, full_name: e.target.value})} />
        </section>

        {/* DEBUG: Se isso não aparecer, o componente não está renderizando */}
        <section className="border-4 border-red-500 p-4 min-h-[200px]">
          <h3 className="font-bold text-red-600 mb-3">DEBUG: SELEÇÃO DE INTENÇÕES</h3>
          <div className="grid grid-cols-2 gap-2">
            {INTENTION_OPTIONS.map(i => (
              <button 
                key={i} 
                type="button" 
                onClick={() => toggleIntention(i)} 
                className={`p-3 text-sm border rounded ${formData.intentions.includes(i) ? 'bg-[#4A0E0E] text-white' : 'bg-white text-stone-700'}`}
              >
                {i}
              </button>
            ))}
          </div>
        </section>

        <textarea className="w-full p-3 border rounded" placeholder="Sobre você (bio)" rows={4} value={formData.bio} onChange={(e) => setFormData({...formData, bio: e.target.value})} />
        
        <button type="submit" className="w-full bg-[#4A0E0E] text-white p-3 rounded font-bold hover:bg-stone-800 transition">
          {loading ? 'Salvando...' : 'Enviar para aprovação'}
        </button>
      </form>
    </div>
  );
}
