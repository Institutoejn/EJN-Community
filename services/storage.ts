import { User, Post, Mission, RewardItem, AppSettings, Comment, TrendingTopic } from '../types';
import { supabase } from './supabase';

// --- TURBO CACHE SYSTEM ---
const CACHE_KEYS = {
  USER: 'ejn_user_cache',
  POSTS: 'ejn_posts_cache',
  USERS: 'ejn_ranking_cache',
  MISSIONS: 'ejn_missions_cache',
  REWARDS: 'ejn_rewards_cache',
  SETTINGS: 'ejn_settings_cache',
  TRENDING: 'ejn_trending_cache'
};

const localCache = {
  get: <T>(key: string): T | null => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch { return null; }
  },
  set: (key: string, data: any) => {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) { console.warn('Cache limit reached'); }
  },
  clear: () => {
    Object.values(CACHE_KEYS).forEach(k => localStorage.removeItem(k));
    localStorage.removeItem('ejn_last_view');
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.includes('auth-token')) {
            localStorage.removeItem(key);
        }
    }
  }
};

const mapUser = (dbUser: any): User => ({
  id: dbUser.id,
  name: dbUser.name || 'Usuário Sem Nome',
  email: dbUser.email || '',
  role: dbUser.role as 'aluno' | 'gestor',
  nivel: dbUser.nivel || 1,
  xp: dbUser.xp || 0,
  xpProximoNivel: dbUser.xp_proximo_nivel || 1000,
  pontosTotais: dbUser.pontos_totais || 0,
  badges: dbUser.badges || [],
  dataCriacao: dbUser.created_at,
  avatarCor: dbUser.avatar_cor,
  bio: dbUser.bio,
  location: dbUser.location,
  website: dbUser.website,
  avatarUrl: dbUser.avatar_url,
  coverUrl: dbUser.cover_url,
  postsCount: dbUser.posts_count || 0,
  likesReceived: dbUser.likes_received || 0,
  commentsCount: 0,
  streak: dbUser.streak || 0,
  followersCount: 0, 
  followingCount: 0,
  followingIds: [], 
  status: dbUser.status as 'active' | 'suspended'
});

export const storage = {
  // --- AUTH & USER ---
  getCurrentUser: async (skipNetwork = false): Promise<User | null> => {
    try {
        const cachedUser = localCache.get<User>(CACHE_KEYS.USER);
        if (skipNetwork && cachedUser) return cachedUser;

        const { data: { session }, error } = await supabase.auth.getSession();
        if (error || !session) return null;

        const { data: profile, error: profileError } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single();

        if (profileError || !profile) return cachedUser || null;
        const mappedUser = mapUser(profile);

        try {
            const [followingResult, followersResult] = await Promise.all([
                supabase.from('follows').select('following_id').eq('follower_id', session.user.id),
                supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', session.user.id)
            ]);
            mappedUser.followingIds = followingResult.data ? followingResult.data.map((f: any) => f.following_id) : [];
            mappedUser.followingCount = mappedUser.followingIds.length;
            mappedUser.followersCount = followersResult.count || 0;
        } catch (e) {}

        localCache.set(CACHE_KEYS.USER, mappedUser);
        return mappedUser;
    } catch (fatalError) {
        return localCache.get<User>(CACHE_KEYS.USER);
    }
  },

  getUsers: async (forceRefresh = false): Promise<User[]> => {
    const cached = localCache.get<User[]>(CACHE_KEYS.USERS);
    if (!forceRefresh && cached) return cached || [];
    const { data, error } = await supabase.from('users').select('*').order('xp', { ascending: false });
    if (error) return cached || [];
    const mapped = (data || []).map(mapUser);
    localCache.set(CACHE_KEYS.USERS, mapped);
    return mapped;
  },

  saveUser: async (user: User) => {
    const dbUser = {
      name: user.name,
      bio: user.bio,
      location: user.location,
      website: user.website,
      avatar_url: user.avatarUrl,
      cover_url: user.coverUrl,
      xp: user.xp,
      pontos_totais: user.pontosTotais,
      likes_received: user.likesReceived,
      posts_count: user.postsCount,
      role: user.role,
      status: user.status
    };
    const { error } = await supabase.from('users').update(dbUser).eq('id', user.id);
    if (error) throw error;
    localCache.set(CACHE_KEYS.USER, user);
  },

  deleteUser: async (userId: string) => {
    const { error } = await supabase.from('users').delete().eq('id', userId);
    if (error) throw error;
    
    // Limpa caches locais
    localStorage.removeItem(CACHE_KEYS.USERS); 
    const users = localCache.get<User[]>(CACHE_KEYS.USERS) || [];
    localCache.set(CACHE_KEYS.USERS, users.filter(u => u.id !== userId));
  },

  // --- POSTS ---
  getPosts: async (forceRefresh = false): Promise<Post[]> => {
    const cached = localCache.get<Post[]>(CACHE_KEYS.POSTS);
    if (!forceRefresh && cached) return cached || [];
    const { data: { session } } = await supabase.auth.getSession();
    const { data, error } = await supabase
      .from('posts')
      .select(`*, users:user_id (name, avatar_url, avatar_cor), comments (*, users:user_id (name, avatar_url, avatar_cor)), likes (user_id)`)
      .order('created_at', { ascending: false });
    if (error) return cached || [];
    const mappedPosts = (data || []).map((p: any) => ({
      id: p.id,
      userId: p.user_id,
      userName: p.users?.name || 'Usuário',
      avatarUrl: p.users?.avatar_url,
      avatarCor: p.users?.avatar_cor,
      content: p.content,
      imageUrl: p.image_url,
      timestamp: p.created_at,
      likes: p.likes ? p.likes.length : 0, 
      isPinned: p.is_pinned,
      likedByMe: session?.user?.id ? (p.likes || []).some((l: any) => l.user_id === session.user.id) : false,
      comments: (p.comments || []).map((c: any) => ({
        id: c.id, text: c.content, timestamp: c.created_at, userId: c.user_id,
        userName: c.users?.name || 'Usuário', avatarUrl: c.users?.avatar_url, avatarCor: c.users?.avatar_cor
      }))
    }));
    localCache.set(CACHE_KEYS.POSTS, mappedPosts);
    return mappedPosts;
  },

  savePost: async (post: Post) => {
    if (post.id && !post.id.startsWith('temp-')) {
      const { error } = await supabase.from('posts').update({ content: post.content, is_pinned: post.isPinned }).eq('id', post.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('posts').insert({ user_id: post.userId, content: post.content, image_url: post.imageUrl });
      if (error) throw error;
    }
  },

  deletePost: async (postId: string) => {
    const { error } = await supabase.from('posts').delete().eq('id', postId);
    if (error) throw error;
    const posts = localCache.get<Post[]>(CACHE_KEYS.POSTS) || [];
    localCache.set(CACHE_KEYS.POSTS, posts.filter(p => p.id !== postId));
  },

  toggleLike: async (postId: string, userId: string) => {
      const { data } = await supabase.from('likes').select('id').eq('post_id', postId).eq('user_id', userId).single();
      if (data) await supabase.from('likes').delete().eq('id', data.id);
      else await supabase.from('likes').insert({ post_id: postId, user_id: userId });
  },

  addComment: async (postId: string, userId: string, content: string) => {
      await supabase.from('comments').insert({ post_id: postId, user_id: userId, content: content });
  },

  getTrending: async (): Promise<TrendingTopic[]> => {
    const { data, error } = await supabase.rpc('get_trending_topics');
    if (error) return [];
    return data as TrendingTopic[];
  },

  // --- MISSIONS ---
  getMissions: async (): Promise<Mission[]> => {
    const { data, error } = await supabase.from('missions').select('*').order('created_at', { ascending: false });
    if (error) return localCache.get<Mission[]>(CACHE_KEYS.MISSIONS) || [];
    const mapped = (data || []).map((m: any) => ({
        id: m.id.toString(), title: m.title, desc: m.description, rewardXP: m.reward_xp, rewardCoins: m.reward_coins,
        icon: m.icon, type: m.type, isActive: m.is_active
    }));
    localCache.set(CACHE_KEYS.MISSIONS, mapped);
    return mapped;
  },

  saveMission: async (mission: Mission) => {
      const dbData = {
          title: mission.title, description: mission.desc, reward_xp: mission.rewardXP,
          reward_coins: mission.rewardCoins, icon: mission.icon, type: mission.type, is_active: mission.isActive
      };
      if (mission.id && mission.id.length > 5) {
          const { error } = await supabase.from('missions').update(dbData).eq('id', mission.id);
          if (error) throw error;
      } else {
          const { error } = await supabase.from('missions').insert(dbData);
          if (error) throw error;
      }
  },

  deleteMission: async (id: string) => {
      const { error } = await supabase.from('missions').delete().eq('id', id);
      if (error) throw error;
      const missions = localCache.get<Mission[]>(CACHE_KEYS.MISSIONS) || [];
      localCache.set(CACHE_KEYS.MISSIONS, missions.filter(m => m.id.toString() !== id.toString()));
  },

  // --- REWARDS ---
  getRewards: async (): Promise<RewardItem[]> => {
    const { data, error } = await supabase.from('rewards').select('*').order('cost', { ascending: true });
    if (error) return localCache.get<RewardItem[]>(CACHE_KEYS.REWARDS) || [];
    const mapped = (data || []).map((r: any) => ({
        id: r.id.toString(), title: r.title, cost: r.cost, desc: r.description, longDesc: r.long_desc,
        icon: r.icon, imageUrl: r.image_url, stock: r.stock, category: r.category
    }));
    localCache.set(CACHE_KEYS.REWARDS, mapped);
    return mapped;
  },

  saveReward: async (reward: RewardItem) => {
      const dbData = {
          title: reward.title, description: reward.desc, long_desc: reward.longDesc, cost: reward.cost,
          icon: reward.icon, image_url: reward.imageUrl, stock: reward.stock, category: reward.category
      };
      if (reward.id && reward.id.length > 5) {
          const { error } = await supabase.from('rewards').update(dbData).eq('id', reward.id);
          if (error) throw error;
      } else {
          const { error } = await supabase.from('rewards').insert(dbData);
          if (error) throw error;
      }
  },

  deleteReward: async (id: string) => {
      const { error } = await supabase.from('rewards').delete().eq('id', id);
      if (error) {
          console.error("Erro ao deletar do Supabase:", error);
          throw error;
      }
      const rewards = localCache.get<RewardItem[]>(CACHE_KEYS.REWARDS) || [];
      localCache.set(CACHE_KEYS.REWARDS, rewards.filter(r => r.id.toString() !== id.toString()));
  },

  // --- SETTINGS ---
  getSettings: async (): Promise<AppSettings> => {
    const { data, error } = await supabase.from('settings').select('*').single();
    if (error || !data) return { platformName: 'Rede Social EJN', xpPerPost: 50, xpPerComment: 10, xpPerLikeReceived: 5, coinsPerPost: 10 };
    return { platformName: data.platform_name, xpPerPost: data.xp_per_post, xpPerComment: data.xp_per_comment, xpPerLikeReceived: data.xp_per_like, coinsPerPost: data.coins_per_post };
  },

  saveSettings: async (settings: AppSettings) => {
      const { error } = await supabase.from('settings').upsert({ id: 1, platform_name: settings.platformName, xp_per_post: settings.xpPerPost, xp_per_comment: settings.xpPerComment, xp_per_like: settings.xpPerLikeReceived, coins_per_post: settings.coinsPerPost });
      if (error) throw error;
  },

  followUser: async (followerId: string, followingId: string) => {
    await supabase.from('follows').insert({ follower_id: followerId, following_id: followingId });
  },

  signOut: async () => { 
    try {
        localCache.clear(); 
        await supabase.auth.signOut(); 
    } catch (e) {
        console.warn("Silent failure during signout", e);
    }
  },
  signIn: async (email: string, password: string) => await supabase.auth.signInWithPassword({ email, password }),
  signUp: async (email: string, password: string, metaData: any) => await supabase.auth.signUp({ email, password, options: { data: metaData } }),
  createProfile: async (id: string, email: string, name: string, role: string, avatarCor: string) => await supabase.from('users').insert({ id, email, name, role, avatar_cor: avatarCor, nivel: 1, xp: 0, xp_proximo_nivel: 1000, pontos_totais: 0, badges: [], status: 'active', posts_count: 0, likes_received: 0, streak: 0 })
};