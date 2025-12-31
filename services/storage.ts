
import { User, Post, Mission, RewardItem, AppSettings } from '../types';

const USERS_KEY = 'ejn_social_users';
const CURRENT_USER_KEY = 'ejn_social_session';
const POSTS_KEY = 'ejn_social_posts';
const MISSIONS_KEY = 'ejn_social_missions';
const REWARDS_KEY = 'ejn_social_rewards';
const SETTINGS_KEY = 'ejn_social_settings';

const BRAZILIAN_NAMES = [
  "João Silva", "Maria Oliveira", "Pedro Santos", "Ana Souza", "Lucas Pereira", 
  "Beatriz Lima", "Gabriel Costa", "Mariana Ferreira", "Rafael Rodrigues", "Juliana Almeida",
  "Felipe Nascimento", "Camila Rocha", "Thiago Mendes", "Letícia Carvalho", "Bruno Gomes",
  "Isabela Martins", "Gustavo Barbosa", "Larissa Melo", "Diego Araujo", "Patrícia Cardoso",
  "Leonardo Teixeira", "Vanessa Moreira", "Ricardo Cavalcanti", "Aline Barros", "Eduardo Paiva",
  "Tatiane Ramos", "Marcelo Freire", "Suelen Castro", "André Caldeira", "Monica Viana"
];

const INITIAL_POSTS_CONTENT = [
  "Acabei de fechar minha primeira rodada de investimento! 🚀",
  "Alguém aqui usa CRM para gestão de leads B2B? Indicações?",
  "O networking no Instituto EJN está surreal. Conheci 3 parceiros hoje.",
  "Dica do dia: foco no produto é bom, mas foco no cliente é lucro certo.",
  "Como vocês gerenciam o burnout na fase de escala da startup?",
  "Pitch deck aprovado! Agora começa a diversão real.",
  "O erro é apenas um feedback mal interpretado. Sigamos.",
  "Quem vai para o evento presencial em São Paulo mês que vem?",
  "Estratégia de Growth Hacking que funcionou: marketing de indicação.",
  "Buscando sócio técnico (CTO) para projeto de Fintech. Dm aberta!",
  "A consistência bate o talento quando o talento não tem consistência.",
  "Hoje o dia foi de mentorias pesadas. Minha cabeça está explodindo (de um jeito bom).",
  "Validando MVP com 50 usuários pagantes. O céu é o limite!",
  "Cuidado com o ego no empreendedorismo. Ele é o assassino de startups.",
  "Contratando meu primeiro funcionário. Alguma dica de RH para iniciantes?"
];

export const storage = {
  getUsers: (): User[] => {
    const data = localStorage.getItem(USERS_KEY);
    if (!data) {
      const initialUsers: User[] = BRAZILIAN_NAMES.map((name, i) => ({
        id: `U${100 + i}`,
        name,
        email: `${name.toLowerCase().replace(' ', '.')}@exemplo.com`,
        role: i === 0 ? 'gestor' : 'aluno',
        nivel: Math.floor(Math.random() * 12) + 1,
        xp: Math.floor(Math.random() * 5000),
        xpProximoNivel: 1000,
        pontosTotais: Math.floor(Math.random() * 3000),
        badges: i % 3 === 0 ? ['Pioneiro EJN', 'Top Voice'] : ['Aluno Dedicado'],
        dataCriacao: new Date(Date.now() - Math.random() * 10000000000).toISOString(),
        avatarCor: `bg-[${['#007AFF', '#FF3B30', '#34C759', '#AF52DE'][i % 4]}]`,
        postsCount: Math.floor(Math.random() * 15),
        likesReceived: Math.floor(Math.random() * 100),
        commentsCount: Math.floor(Math.random() * 20),
        streak: Math.floor(Math.random() * 10),
        followersCount: Math.floor(Math.random() * 50),
        followingCount: Math.floor(Math.random() * 50),
        followingIds: [],
        status: i % 15 === 0 && i !== 0 ? 'suspended' : 'active'
      }));
      localStorage.setItem(USERS_KEY, JSON.stringify(initialUsers));
      return initialUsers;
    }
    return JSON.parse(data);
  },

  saveUser: (user: User) => {
    const users = storage.getUsers();
    const existingIndex = users.findIndex(u => u.id === user.id);
    if (existingIndex > -1) {
      users[existingIndex] = user;
    } else {
      users.push(user);
    }
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  },

  updateUsersList: (users: User[]) => {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  },

  setCurrentUser: (user: User | null) => {
    if (user) {
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(CURRENT_USER_KEY);
    }
  },

  getCurrentUser: (): User | null => {
    const data = localStorage.getItem(CURRENT_USER_KEY);
    return data ? JSON.parse(data) : null;
  },

  getPosts: (): Post[] => {
    const data = localStorage.getItem(POSTS_KEY);
    if (!data) {
      const users = storage.getUsers();
      const initialPosts: Post[] = INITIAL_POSTS_CONTENT.map((content, i) => ({
        id: `P${100 + i}`,
        userId: users[i % users.length].id,
        userName: users[i % users.length].name,
        content,
        timestamp: new Date(Date.now() - i * 3600000).toISOString(),
        likes: Math.floor(Math.random() * 50),
        comments: [],
        status: 'published'
      }));
      localStorage.setItem(POSTS_KEY, JSON.stringify(initialPosts));
      return initialPosts;
    }
    return JSON.parse(data);
  },

  savePost: (post: Post) => {
    const posts = storage.getPosts();
    posts.unshift(post);
    localStorage.setItem(POSTS_KEY, JSON.stringify(posts));
  },

  updatePosts: (posts: Post[]) => {
    localStorage.setItem(POSTS_KEY, JSON.stringify(posts));
  },

  getMissions: (): Mission[] => {
    const data = localStorage.getItem(MISSIONS_KEY);
    return data ? JSON.parse(data) : [
      { id: 'm1', title: 'Primeiro Passo', desc: 'Complete seu perfil com bio e localização.', rewardXP: 150, rewardCoins: 50, icon: '👤', type: 'achievement', isActive: true },
      { id: 'm2', title: 'Networking Ativo', desc: 'Faça sua primeira publicação no feed.', rewardXP: 200, rewardCoins: 100, icon: '📢', type: 'achievement', isActive: true },
      { id: 'm3', title: 'Engajador Semanal', desc: 'Curta 10 publicações de colegas.', rewardXP: 300, rewardCoins: 50, icon: '❤️', type: 'daily', isActive: true },
      { id: 'm4', title: 'Mestre do Pitch', desc: 'Apresente seu negócio no fórum.', rewardXP: 500, rewardCoins: 200, icon: '🔥', type: 'special', isActive: true },
      { id: 'm5', title: 'Comentador Elite', desc: 'Faça 5 comentários construtivos hoje.', rewardXP: 150, rewardCoins: 40, icon: '💬', type: 'daily', isActive: true }
    ];
  },

  saveMissions: (missions: Mission[]) => {
    localStorage.setItem(MISSIONS_KEY, JSON.stringify(missions));
  },

  getRewards: (): RewardItem[] => {
    const data = localStorage.getItem(REWARDS_KEY);
    return data ? JSON.parse(data) : [
      { id: 'r1', title: 'Mentoria Express', cost: 1500, desc: '15 min de call estratégica.', longDesc: 'Call com mentor para destravar seu negócio.', icon: '📞', imageUrl: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=400', stock: 10, category: 'Mentoria' },
      { id: 'r2', title: 'Badge de Destaque', cost: 500, desc: 'Destaque-se no ranking.', longDesc: 'Aumenta sua visibilidade na rede.', icon: '✨', imageUrl: 'https://images.unsplash.com/photo-1579546678181-9822b9518301?w=400', stock: 100, category: 'Badge' },
      { id: 'r3', title: 'Livro Empreendedorismo', cost: 1200, desc: 'Físico enviado para você.', longDesc: 'O guia definitivo para escalar seu negócio.', icon: '📚', imageUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400', stock: 15, category: 'Produto' },
      { id: 'r4', title: 'Ingresso Evento VIP', cost: 5000, desc: 'Acesso total ao Summit EJN.', longDesc: 'Experiência única com os maiores players.', icon: '🎟️', imageUrl: 'https://images.unsplash.com/photo-1540575861501-7ad0582373f2?w=400', stock: 5, category: 'Evento' },
      { id: 'r5', title: 'Análise de LinkedIn', cost: 2000, desc: 'Review do seu perfil.', longDesc: 'Transforme seu perfil em um imã de leads.', icon: '👔', imageUrl: 'https://images.unsplash.com/photo-1611944212129-29977ae1398c?w=400', stock: 30, category: 'Mentoria' },
      { id: 'r6', title: 'Caneca EJN Exclusive', cost: 800, desc: 'Item de colecionador.', longDesc: 'Beba seu café com o estilo do Instituto.', icon: '☕', imageUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=400', stock: 50, category: 'Produto' }
    ];
  },

  saveRewards: (rewards: RewardItem[]) => {
    localStorage.setItem(REWARDS_KEY, JSON.stringify(rewards));
  },

  getSettings: (): AppSettings => {
    const data = localStorage.getItem(SETTINGS_KEY);
    return data ? JSON.parse(data) : {
      platformName: 'Rede Social EJN',
      xpPerPost: 50,
      xpPerComment: 10,
      xpPerLikeReceived: 5,
      coinsPerPost: 10
    };
  },

  saveSettings: (settings: AppSettings) => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }
};
