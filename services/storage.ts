
import { User, Post, Mission, RewardItem, AppSettings } from '../types';
import { supabase } from './supabase';

const CURRENT_USER_KEY = 'ejn_social_session_id';

// Funções auxiliares para gerar IDs únicos se o banco não gerar
const generateId = () => Math.random().toString(36).substring(2, 10);

export const storage = {
  // --- USERS ---

  getUsers: async (): Promise<User[]> => {
    const { data, error } = await supabase.from('users').select('*');
    if (error) {
      console.error('Erro ao buscar usuários:', error);
      return [];
    }
    return data as User[];
  },

  saveUser: async (user: User) => {
    const { error } = await supabase.from('users').upsert(user);
    if (error) console.error('Erro ao salvar usuário:', error);
  },

  updateUsersList: async (users: User[]) => {
    // No Supabase, atualizamos individualmente ou em batch. 
    // Para simplificar a migração, vamos atualizar um por um se necessário, 
    // mas o ideal é chamar saveUser para o usuário específico modificado.
    const { error } = await supabase.from('users').upsert(users);
    if (error) console.error('Erro ao atualizar lista de usuários:', error);
  },

  // --- SESSION ---

  setCurrentUser: (user: User | null) => {
    if (user) {
      localStorage.setItem(CURRENT_USER_KEY, user.id);
    } else {
      localStorage.removeItem(CURRENT_USER_KEY);
    }
  },

  getCurrentUser: async (): Promise<User | null> => {
    const id = localStorage.getItem(CURRENT_USER_KEY);
    if (!id) return null;

    const { data, error } = await supabase.from('users').select('*').eq('id', id).single();
    
    if (error || !data) {
      // Se der erro (ex: usuário deletado), limpa a sessão local
      localStorage.removeItem(CURRENT_USER_KEY);
      return null;
    }
    return data as User;
  },

  // --- POSTS ---

  getPosts: async (): Promise<Post[]> => {
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .order('timestamp', { ascending: false });
      
    if (error) {
      console.error('Erro ao buscar posts:', error);
      return [];
    }
    return data as Post[];
  },

  savePost: async (post: Post) => {
    const { error } = await supabase.from('posts').insert(post);
    if (error) console.error('Erro ao salvar post:', error);
  },

  updatePosts: async (posts: Post[]) => {
    // Upsert em massa
    const { error } = await supabase.from('posts').upsert(posts);
    if (error) console.error('Erro ao atualizar posts:', error);
  },

  // --- MISSIONS ---

  getMissions: async (): Promise<Mission[]> => {
    const { data, error } = await supabase.from('missions').select('*');
    if (error || !data || data.length === 0) {
      // Fallback inicial se banco vazio
      return [
        { id: 'm1', title: 'Primeiro Passo', desc: 'Complete seu perfil com bio e localização.', rewardXP: 150, rewardCoins: 50, icon: '👤', type: 'achievement', isActive: true },
        { id: 'm2', title: 'Networking Ativo', desc: 'Faça sua primeira publicação no feed.', rewardXP: 200, rewardCoins: 100, icon: '📢', type: 'achievement', isActive: true }
      ];
    }
    return data as Mission[];
  },

  saveMissions: async (missions: Mission[]) => {
    const { error } = await supabase.from('missions').upsert(missions);
    if (error) console.error('Erro ao salvar missões:', error);
  },

  // --- REWARDS ---

  getRewards: async (): Promise<RewardItem[]> => {
    const { data, error } = await supabase.from('rewards').select('*');
    if (error || !data || data.length === 0) {
      return [];
    }
    return data as RewardItem[];
  },

  saveRewards: async (rewards: RewardItem[]) => {
    const { error } = await supabase.from('rewards').upsert(rewards);
    if (error) console.error('Erro ao salvar brindes:', error);
  },

  // --- SETTINGS ---

  getSettings: async (): Promise<AppSettings> => {
    const { data, error } = await supabase.from('settings').select('*').eq('id', 'global').single();
    if (error || !data) {
      return {
        platformName: 'Rede Social EJN',
        xpPerPost: 50,
        xpPerComment: 10,
        xpPerLikeReceived: 5,
        coinsPerPost: 10
      };
    }
    // Remover o campo ID que vem do banco para casar com a tipagem
    const { id, ...settings } = data;
    return settings as AppSettings;
  },

  saveSettings: async (settings: AppSettings) => {
    const { error } = await supabase.from('settings').upsert({ id: 'global', ...settings });
    if (error) console.error('Erro ao salvar configurações:', error);
  }
};
