import { User, Post, Mission, RewardItem, AppSettings, Comment, TrendingTopic, DailyNotice } from '../types';
import { supabase } from './supabase';
import { AVATAR_COLORS } from '../constants';

// --- TURBO CACHE SYSTEM ---
const CACHE_KEYS = {
  USER: 'ejn_user_cache',
  POSTS: 'ejn_posts_cache',
  USERS: 'ejn_ranking_cache',
  MISSIONS: 'ejn_missions_cache',
  REWARDS: 'ejn_rewards_cache',
  SETTINGS: 'ejn_settings_cache',
  TRENDING: 'ejn_trending_cache',
  NOTICES: 'ejn_notices_cache'
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
    } catch (e) { 
        console.warn('Cache limit reached, clearing old data');
        try { localStorage.clear(); } catch(e2) {}
    }
  },
  clear: () => {
    Object.values(CACHE_KEYS).forEach(k => localStorage.removeItem(k));
    localStorage.removeItem('ejn_last_view');
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
  followersCount: dbUser.followersCount || 0, 
  followingCount: dbUser.followingCount || 0,
  followingIds: dbUser.followingIds || [], 
  status: dbUser.status as 'active' | 'suspended'
});

export const storage = {
  // --- MÉTODOS SÍNCRONOS (INSTANTÂNEOS) ---
  getLocalCurrentUser: (): User | null => localCache.get<User>(CACHE_KEYS.USER),
  getLocalPosts: (): Post[] => localCache.get<Post[]>(CACHE_KEYS.POSTS) || [],
  getLocalUsers: (): User[] => localCache.get<User[]>(CACHE_KEYS.USERS) || [],
  getLocalMissions: (): Mission[] => localCache.get<Mission[]>(CACHE_KEYS.MISSIONS) || [],
  getLocalRewards: (): RewardItem[] => localCache.get<RewardItem[]>(CACHE_KEYS.REWARDS) || [],
  getLocalTrending: (): TrendingTopic[] => localCache.get<TrendingTopic[]>(CACHE_KEYS.TRENDING) || [],
  getLocalNotices: (): DailyNotice[] => localCache.get<DailyNotice[]>(CACHE_KEYS.NOTICES) || [],

  uploadImage: async (file: File, path: string): Promise<string> => {
    try {
        if (!file) throw new Error("Arquivo inválido");
        if (file.size > 5 * 1024 * 1024) throw new Error("Imagem muito grande (Max 5MB)");

        const fileExt = file.name.split('.').pop();
        const fileName = `${path}/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
            .from('media')
            .upload(fileName, file, { upsert: true, cacheControl: '3600' });

        if (uploadError) {
             console.error("Supabase Upload Error:", uploadError);
             throw uploadError;
        }

        const { data } = supabase.storage.from('media').getPublicUrl(fileName);
        return data.publicUrl;
    } catch (error) {
        console.error("Erro crítico no upload:", error);
        throw new Error("Falha ao enviar imagem. Verifique sua conexão.");
    }
  },

  getUserById: async (id: string): Promise<User | null> => {
    const cachedUsers = localCache.get<User[]>(CACHE_KEYS.USERS) || [];
    const found = cachedUsers.find(u => u.id === id);
    if (found) return found;

    const { data, error } = await supabase.from('users').select('*').eq('id', id).single();
    if (error || !data) return null;
    
    const [following, followers] = await Promise.all([
        supabase.from('follows').select('following_id').eq('follower_id', id),
        supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', id)
    ]);
    
    const mapped = mapUser(data);
    mapped.followingCount = following.data?.length || 0;
    mapped.followersCount = followers.count || 0;
    
    return mapped;
  },

  getCurrentUser: async (skipNetwork = false): Promise<User | null> => {
    try {
        if (skipNetwork) {
            const cached = localCache.get<User>(CACHE_KEYS.USER);
            if (cached) return cached;
        }
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session) return null;

        let { data: profile, error: profileError } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .maybeSingle(); 

        if (!profile) {
            try {
                const meta = session.user.user_metadata || {};
                const newUser = {
                    id: session.user.id,
                    email: session.user.email,
                    name: meta.name || 'Novo Aluno',
                    role: meta.role || 'aluno',
                    avatar_cor: meta.avatarCor || AVATAR_COLORS[0],
                    nivel: 1, xp: 0, pontos_totais: 0
                };
                const { error: insertError } = await supabase.from('users').upsert(newUser);
                if (!insertError) profile = newUser;
                else {
                    const retry = await supabase.from('users').select('*').eq('id', session.user.id).maybeSingle();
                    if (retry.data) profile = retry.data;
                }
            } catch (healError) {}
        }

        if (!profile) return null; 

        const mappedUser = mapUser(profile);

        try {
            const socialPromise = Promise.all([
                supabase.from('follows').select('following_id').eq('follower_id', session.user.id),
                supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', session.user.id)
            ]);
            
            const timeoutSocial = new Promise<any>((resolve) => setTimeout(() => resolve(null), 1500));
            const results = await Promise.race([socialPromise, timeoutSocial]);

            if (results) {
                const [followingResult, followersResult] = results;
                mappedUser.followingIds = followingResult.data ? followingResult.data.map((f: any) => f.following_id) : [];
                mappedUser.followingCount = mappedUser.followingIds.length;
                mappedUser.followersCount = followersResult.count || 0;
            }
        } catch (e) { }

        localCache.set(CACHE_KEYS.USER, mappedUser);
        return mappedUser;
    } catch (fatalError) {
        return localCache.get<User>(CACHE_KEYS.USER);
    }
  },

  getUsers: async (forceRefresh = false): Promise<User[]> => {
    const cached = localCache.get<User[]>(CACHE_KEYS.USERS);
    if (!forceRefresh && cached) return cached;
    
    const { data, error } = await supabase.from('users').select('*').order('xp', { ascending: false });
    if (error) return cached || [];
    
    const mapped = (data || []).map(mapUser);
    localCache.set(CACHE_KEYS.USERS, mapped);
    return mapped;
  },

  saveUser: async (user: User) => {
    if (user.avatarUrl && user.avatarUrl.startsWith('data:')) delete user.avatarUrl; 
    
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
    const currentUsers = localCache.get<User[]>(CACHE_KEYS.USERS) || [];
    localCache.set(CACHE_KEYS.USERS, currentUsers.filter(u => u.id !== userId));
  },

  getPosts: async (forceRefresh = false): Promise<Post[]> => {
    const cached = localCache.get<Post[]>(CACHE_KEYS.POSTS);
    if (!forceRefresh && cached) return cached;
    
    const { data: { session } } = await supabase.auth.getSession();
    
    // IMPORTANTE: Busca posts e faz o join correto
    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        users:user_id (name, avatar_url, avatar_cor),
        comments (
            id, content, created_at, user_id,
            users:user_id (name, avatar_url, avatar_cor)
        ),
        likes (user_id)
      `)
      .order('created_at', { ascending: false })
      .limit(50);
      
    if (error) {
        console.error("Erro ao buscar posts:", error);
        return cached || [];
    }
    
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
        id: c.id, 
        text: c.content, 
        timestamp: c.created_at, 
        userId: c.user_id,
        userName: c.users?.name || 'Usuário', 
        avatarUrl: c.users?.avatar_url, 
        avatarCor: c.users?.avatar_cor
      })).sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
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
      try {
          // CORREÇÃO CRÍTICA: Use maybeSingle() ao invés de single()
          // single() estoura erro se não achar nada, impedindo o insert
          const { data, error } = await supabase
            .from('likes')
            .select('id')
            .eq('post_id', postId)
            .eq('user_id', userId)
            .maybeSingle();
            
          if (error && error.code !== 'PGRST116') throw error; // Ignora erro de "não encontrado"

          if (data) {
              // Se já existe, remove (Unlike)
              await supabase.from('likes').delete().eq('id', data.id);
          } else {
              // Se não existe, cria (Like)
              await supabase.from('likes').insert({ post_id: postId, user_id: userId });
          }
      } catch (e) {
          console.error("Erro ao curtir:", e);
          throw e;
      }
  },

  addComment: async (postId: string, userId: string, content: string) => {
      const { error } = await supabase.from('comments').insert({ post_id: postId, user_id: userId, content: content });
      if (error) {
          console.error("Erro ao comentar:", error);
          throw error;
      }
  },

  getTrending: async (): Promise<TrendingTopic[]> => {
    const { data, error } = await supabase.rpc('get_trending_topics');
    if (error) return [];
    return data as TrendingTopic[];
  },

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
          await supabase.from('missions').update(dbData).eq('id', mission.id);
      } else {
          await supabase.from('missions').insert(dbData);
      }
  },
  deleteMission: async (id: string) => {
      await supabase.from('missions').delete().eq('id', id);
      const missions = localCache.get<Mission[]>(CACHE_KEYS.MISSIONS) || [];
      localCache.set(CACHE_KEYS.MISSIONS, missions.filter(m => m.id.toString() !== id.toString()));
  },

  getRewards: async (): Promise<RewardItem[]> => {
    const { data, error } = await supabase.from('rewards').select('*').gt('stock', 0).order('cost', { ascending: true });
    if (error) return localCache.get<RewardItem[]>(CACHE_KEYS.REWARDS) || [];
    const mapped = (data || []).map((r: any) => ({
        id: r.id.toString(), title: r.title, cost: r.cost, desc: r.description, longDesc: r.long_desc,
        icon: r.icon, imageUrl: r.image_url, stock: r.stock, category: r.category
    }));
    localCache.set(CACHE_KEYS.REWARDS, mapped);
    return mapped;
  },
  
  claimReward: async (rewardId: string, userId: string): Promise<{success: boolean, message: string}> => {
    try {
        const { data, error } = await supabase.rpc('claim_reward', { p_reward_id: rewardId, p_user_id: userId });
        if (error) throw error;
        return data as {success: boolean, message: string};
    } catch (e: any) {
        console.error(e);
        return { success: false, message: e.message || 'Erro ao processar resgate' };
    }
  },

  getClaims: async (): Promise<any[]> => {
    const { data, error } = await supabase
        .from('reward_claims')
        .select(`*, users:user_id(name, email)`)
        .order('created_at', { ascending: false });
    
    if (error) return [];
    return data;
  },

  saveReward: async (reward: RewardItem) => {
      const dbData = {
          title: reward.title, description: reward.desc, long_desc: reward.longDesc, cost: reward.cost,
          icon: reward.icon, image_url: reward.imageUrl, stock: reward.stock, category: reward.category
      };
      if (reward.id && reward.id.length > 5) {
          await supabase.from('rewards').update(dbData).eq('id', reward.id);
      } else {
          await supabase.from('rewards').insert(dbData);
      }
  },
  deleteReward: async (id: string) => {
      await supabase.from('rewards').delete().eq('id', id);
      const rewards = localCache.get<RewardItem[]>(CACHE_KEYS.REWARDS) || [];
      localCache.set(CACHE_KEYS.REWARDS, rewards.filter(r => r.id.toString() !== id.toString()));
  },

  getSettings: async (): Promise<AppSettings> => {
    const { data, error } = await supabase.from('settings').select('*').single();
    if (error || !data) return { 
        platformName: 'Rede Social EJN', 
        xpPerPost: 50, coinsPerPost: 10,
        xpPerComment: 10, coinsPerComment: 2,
        xpPerLikeReceived: 5, coinsPerLikeReceived: 1
    };
    return { 
        platformName: data.platform_name, 
        xpPerPost: data.xp_per_post, coinsPerPost: data.coins_per_post,
        xpPerComment: data.xp_per_comment, coinsPerComment: data.coins_per_comment,
        xpPerLikeReceived: data.xp_per_like, coinsPerLikeReceived: data.coins_per_like
    };
  },

  saveSettings: async (settings: AppSettings) => {
      const { error } = await supabase.from('settings').upsert({ 
          id: 1, 
          platform_name: settings.platformName, 
          xp_per_post: settings.xpPerPost, coins_per_post: settings.coinsPerPost,
          xp_per_comment: settings.xpPerComment, coins_per_comment: settings.coinsPerComment,
          xp_per_like: settings.xpPerLikeReceived, coins_per_like: settings.coinsPerLikeReceived
      });
      if (error) throw error;
  },

  // --- NOVOS MÉTODOS PARA AVISOS DIÁRIOS ---
  getDailyNotices: async (): Promise<DailyNotice[]> => {
    const cached = localCache.get<DailyNotice[]>(CACHE_KEYS.NOTICES);
    
    const { data, error } = await supabase
      .from('daily_notices')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });
      
    if (error) return cached || [];
    
    const mapped = (data || []).map((n: any) => ({
      id: n.id,
      content: n.content,
      createdAt: n.created_at
    }));
    localCache.set(CACHE_KEYS.NOTICES, mapped);
    return mapped;
  },

  addDailyNotice: async (content: string) => {
    await supabase.from('daily_notices').insert({ content });
  },

  deleteDailyNotice: async (id: string) => {
    await supabase.from('daily_notices').delete().eq('id', id);
  },

  followUser: async (followerId: string, followingId: string) => {
    await supabase.from('follows').insert({ follower_id: followerId, following_id: followingId });
  },

  signOut: async () => { 
    try {
        localCache.clear(); 
        await supabase.auth.signOut(); 
    } catch (e) { console.warn(e); }
  },
  signIn: async (email: string, password: string) => await supabase.auth.signInWithPassword({ email, password }),
  signUp: async (email: string, password: string, metaData: any) => await supabase.auth.signUp({ email, password, options: { data: metaData } }),
  createProfile: async (id: string, email: string, name: string, role: string, avatarCor: string) => await supabase.from('users').insert({ id, email, name, role, avatar_cor: avatarCor, nivel: 1, xp: 0, xp_proximo_nivel: 1000, pontos_totais: 0, badges: [], status: 'active', posts_count: 0, likes_received: 0, streak: 0 })
};
