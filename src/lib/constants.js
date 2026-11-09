// Opções usadas em várias telas do Duo Match.
// Mantenha os textos alinhados com o briefing e com o onboarding.

export const RELATIONSHIP_INTENTIONS = [
  'Relacionamento sério e casamento',
  'Parceiro(a) para crescer na vida',
  'Companheiro(a) para construir uma família',
  'Parceiro(a) de vida e de negócios',
  'Companhia, carinho e experiências',
  'Uma relação em que exista proteção e segurança',
];

export const INTEREST_OPTIONS = [
  'Geopolítica',
  'Moda',
  'Caseiros',
  'Viagens e gastronomia',
  'Fitness',
  'Empreendedorismo',
  'Arte e Cultura',
  'Música',
];

export const VALUES_OPTIONS = [
  'Fé',
  'Família',
  'Honestidade',
  'Lealdade',
  'Crescimento',
  'Saúde',
  'Inteligência',
  'Humor',
  'Estabilidade',
  'Propósito',
  'Liberdade',
  'Respeito',
];

export const REPORT_REASONS = [
  'Perfil falso',
  'Assédio ou desrespeito',
  'Conteúdo impróprio',
  'Spam ou golpe',
  'Outro',
];

// Cards da tela de interesses/comunidades. As três fotos enviadas pelo
// usuário ficam em /public e são usadas com cache-busting.
export const COMMUNITIES = [
  {
    name: 'Geopolítica',
    filter: 'Geopolítica',
    desc: 'Política, economia e mundo',
    image:
      'https://images.unsplash.com/photo-1521295121783-8a321d551ad2?auto=format&fit=crop&q=80&w=800',
  },
  {
    name: 'Moda',
    filter: 'Moda',
    desc: 'Estilo e tendências',
    image: '/moda.jpg?v=2',
  },
  {
    name: 'Caseiros',
    filter: 'Caseiros',
    desc: 'Filmes, casa e tranquilidade',
    image: '/caseiros.jpg?v=2',
  },
  {
    name: 'Viagens',
    filter: 'Viagens e gastronomia',
    desc: 'Conhecer lugares e restaurantes',
    image: '/viagens.jpg?v=2',
  },
  {
    name: 'Fitness',
    filter: 'Fitness',
    desc: 'Treino e vida saudável',
    image:
      'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&q=80&w=800',
  },
  {
    name: 'Empreendedorismo',
    filter: 'Empreendedorismo',
    desc: 'Negócios e crescimento',
    image: '/empreendedorismo.jpg?v=2',
  },
];

export const FALLBACK_PLANS = [
  {
    id: null,
    slug: 'duo-match',
    name: 'Duo Match',
    price: 49.9,
    description:
      'Para quem quer conhecer pessoas com intenções reais, com curadoria e conversas sem ruído.',
    interval: 'month',
    highlight: true,
    features: [
      'Curadoria de perfis',
      'Matches e chat ilimitados',
      'Filtros de busca',
      'Comunidades de interesse',
    ],
  },
];

export const PLAN_STATUS_LABELS = {
  active: 'Ativo',
  trialing: 'Em teste',
  pending_payment: 'Aguardando pagamento',
  cancelled: 'Cancelado',
  expired: 'Expirado',
};
