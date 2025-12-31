
import { User, Post, Mission, RewardItem, AppSettings, Comment } from '../types';
import { supabase } from './supabase';

// --- TURBO CACHE SYSTEM (LOCAL STORAGE + MEMORY) ---
const CACHE_KEYS = {
  USER: 'ejn_user_cache',
  POSTS: 'ejn_posts_cache',
  USERS: 'ejn_ranking_cache',
  MISSIONS: 'ejn_missions_cache',
  REWARDS: 'ejn_rewards_cache',
  SETTINGS: 'ejn_settings_cache'
};

// Helper para ler/gravar cache local instantâneo
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
  }
};

// Utilitário para mapear User DB (snake_case) -> User App (camelCase)
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
            const secondaryDataPromise = Promise.all([
                supabase.from('follows').select('following_id').eq('follower_id', session.user.id),
                supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', session.user.id)
            ]);

            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject('timeout'), 2000));
            const [followingResult, followersResult] = await Promise.race([secondaryDataPromise, timeoutPromise]) as any;

            const following = followingResult.data;
            mappedUser.followingIds = following ? following.map((f: any) => f.following_id) : [];
            mappedUser.followingCount = mappedUser.followingIds.length;
            mappedUser.followersCount = followersResult.count || 0;

        } catch (secondaryError) {
             if (cachedUser) {
                 mappedUser.followingIds = cachedUser.followingIds;
                 mappedUser.followingCount = cachedUser.followingCount;
                 mappedUser.followersCount = cachedUser.followersCount;
             }
        }

        localCache.set(CACHE_KEYS.USER, mappedUser);
        return mappedUser;

    } catch (fatalError) {
        console.error("Erro fatal storage:", fatalError);
        return localCache.get<User>(CACHE_KEYS.USER);
    }
  },

  createProfile: async (userId: string, email: string, name: string, role: string, avatarCor: string) => {
      const { error } = await supabase.from('users').insert({
          id: userId,
          email: email,
          name: name,
          role: role,
          avatar_cor: avatarCor,
          nivel: 1,
          xp: 0,
          xp_proximo_nivel: 1000,
          pontos_totais: 0,
          badges: [],
          created_at: new Date().toISOString(),
          status: 'active',
          posts_count: 0,
          likes_received: 0,
          streak: 0
      });
      if (error) throw error;
  },

  getUsers: async (forceRefresh = false): Promise<User[]> => {
    const cached = localCache.get<User[]>(CACHE_KEYS.USERS);
    if (!forceRefresh && cached) return cached;

    const { data, error } = await supabase.from('users').select('*').order('xp', { ascending: false }).limit(50);
    if (error) return cached || [];
    
    const mapped = data.map(mapUser);
    localCache.set(CACHE_KEYS.USERS, mapped);
    return mapped;
  },

  saveUser: async (user: User) => {
    // Atualiza cache local para refletir na UI imediatamente
    localCache.set(CACHE_KEYS.USER, user);
    
    // Atualiza cache de lista de usuários também se existir
    const cachedUsers = localCache.get<User[]>(CACHE_KEYS.USERS);
    if (cachedUsers) {
        const updatedList = cachedUsers.map(u => u.id === user.id ? user : u);
        localCache.set(CACHE_KEYS.USERS, updatedList);
    }
    
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
      role: user.role, // Importante para admin mudar role
      status: user.status
    };

    supabase.from('users').update(dbUser).eq('id', user.id).then(({ error }) => {
        if (error) console.error('Erro sync user:', error);
    });
  },

  deleteUser: async (userId: string) => {
    // Nota: Em produção, deletar Auth Users requer Supabase Service Role (backend).
    // Aqui deletamos o perfil público.
    
    // Limpa caches
    const users = localCache.get<User[]>(CACHE_KEYS.USERS) || [];
    localCache.set(CACHE_KEYS.USERS, users.filter(u => u.id !== userId));

    await supabase.from('users').delete().eq('id', userId);
  },

  // --- POSTS ---

  getPosts: async (forceRefresh = false): Promise<Post[]> => {
    const cached = localCache.get<Post[]>(CACHE_KEYS.POSTS);
    if (!forceRefresh && cached) return cached;

    const { data: { session } } = await supabase.auth.getSession();
    const currentUserId = session?.user?.id;

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
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(50); // Aumentado para admin ver mais

    if (error) return cached || [];

    const mappedPosts = data.map((p: any) => ({
      id: p.id,
      userId: p.user_id,
      userName: p.users?.name || 'Usuário Desconhecido',
      avatarUrl: p.users?.avatar_url,
      avatarCor: p.users?.avatar_cor,
      content: p.content,
      imageUrl: p.image_url,
      timestamp: p.created_at,
      likes: p.likes ? p.likes.length : 0, 
      isPinned: p.is_pinned,
      likedByMe: currentUserId ? (p.likes || []).some((l: any) => l.user_id === currentUserId) : false,
      comments: (p.comments || []).map((c: any) => ({
        id: c.id,
        text: c.content,
        timestamp: c.created_at,
        userId: c.user_id,
        userName: c.users?.name || 'Usuário Desconhecido',
        avatarUrl: c.users?.avatar_url,
        avatarCor: c.users?.avatar_cor
      })).sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    }));

    localCache.set(CACHE_KEYS.POSTS, mappedPosts);
    return mappedPosts;
  },

  savePost: async (post: Post) => {
    const currentPosts = localCache.get<Post[]>(CACHE_KEYS.POSTS) || [];
    
    if (post.id && post.id.length > 10 && !post.id.startsWith('temp-')) {
        const updatedCache = currentPosts.map(p => p.id === post.id ? { ...p, content: post.content, isPinned: post.isPinned } : p);
        localCache.set(CACHE_KEYS.POSTS, updatedCache);

        await supabase.from('posts').update({
            is_pinned: post.isPinned,
            content: post.content
        }).eq('id', post.id);
    } else {
        await supabase.from('posts').insert({
            user_id: post.userId,
            content: post.content,
            image_url: post.imageUrl
        });
    }
  },

  toggleLike: async (postId: string, userId: string) => {
      const { data } = await supabase.from('likes').select('id').eq('post_id', postId).eq('user_id', userId).single();
      if (data) {
          await supabase.from('likes').delete().eq('id', data.id);
      } else {
          await supabase.from('likes').insert({ post_id: postId, user_id: userId });
      }
  },

  addComment: async (postId: string, userId: string, content: string) => {
      await supabase.from('comments').insert({
          post_id: postId,
          user_id: userId,
          content: content
      });
  },

  deletePost: async (postId: string) => {
      const currentPosts = localCache.get<Post[]>(CACHE_KEYS.POSTS) || [];
      localCache.set(CACHE_KEYS.POSTS, currentPosts.filter(p => p.id !== postId));
      await supabase.from('posts').delete().eq('id', postId);
  },

  // --- MISSIONS & REWARDS ---

  getMissions: async (): Promise<Mission[]> => {
    const cached = localCache.get<Mission[]>(CACHE_KEYS.MISSIONS);
    // Sempre tentar fetch fresco se for admin, mas por simplicidade usamos a lógica padrão
    // Adicionamos verificação de rede para admin painel
    const { data, error } = await supabase.from('missions').select('*').order('created_at', { ascending: false });
    
    if (error) return cached || [];
    
    const mapped = data.map((m: any) => ({
        id: m.id,
        title: m.title,
        desc: m.description,
        rewardXP: m.reward_xp,
        rewardCoins: m.reward_coins,
        icon: m.icon,
        type: m.type,
        isActive: m.is_active
    }));

    localCache.set(CACHE_KEYS.MISSIONS, mapped);
    return mapped;
  },

  saveMissions: async (missions: Mission[]) => {
      // Atualiza cache
      const current = localCache.get<Mission[]>(CACHE_KEYS.MISSIONS) || [];
      // Mescla
      const updatedCache = [...current];
      missions.forEach(m => {
          const idx = updatedCache.findIndex(ex => ex.id === m.id);
          if (idx >= 0) updatedCache[idx] = m;
          else updatedCache.push(m);
      });
      localCache.set(CACHE_KEYS.MISSIONS, updatedCache);

      const dbMissions = missions.map(m => ({
          id: m.id.startsWith('m') && m.id.length < 15 ? undefined : m.id, // Se for ID temporário gerado no front, remove para DB gerar UUID
          title: m.title,
          description: m.desc,
          reward_xp: m.rewardXP,
          reward_coins: m.rewardCoins,
          icon: m.icon,
          type: m.type,
          is_active: m.isActive
      }));
      
      const { error } = await supabase.from('missions').upsert(dbMissions);
      if (error) console.error("Erro ao salvar missão", error);
  },

  deleteMission: async (id: string) => {
      const current = localCache.get<Mission[]>(CACHE_KEYS.MISSIONS) || [];
      localCache.set(CACHE_KEYS.MISSIONS, current.filter(m => m.id !== id));
      await supabase.from('missions').delete().eq('id', id);
  },

  getRewards: async (): Promise<RewardItem[]> => {
    const { data, error } = await supabase.from('rewards').select('*').order('cost', { ascending: true });
    if (error) return localCache.get<RewardItem[]>(CACHE_KEYS.REWARDS) || [];
    
    const mapped = data.map((r: any) => ({
        id: r.id,
        title: r.title,
        cost: r.cost,
        desc: r.description,
        longDesc: r.long_desc || r.description,
        icon: r.icon,
        imageUrl: r.image_url,
        stock: r.stock,
        category: r.category
    }));

    localCache.set(CACHE_KEYS.REWARDS, mapped);
    return mapped;
  },

  saveRewards: async (rewards: RewardItem[]) => {
      const current = localCache.get<RewardItem[]>(CACHE_KEYS.REWARDS) || [];
      const updatedCache = [...current];
      rewards.forEach(r => {
          const idx = updatedCache.findIndex(ex => ex.id === r.id);
          if (idx >= 0) updatedCache[idx] = r;
          else updatedCache.push(r);
      });
      localCache.set(CACHE_KEYS.REWARDS, updatedCache);

      const dbRewards = rewards.map(r => ({
          id: r.id.startsWith('r') && r.id.length < 15 ? undefined : r.id,
          title: r.title,
          description: r.desc,
          long_desc: r.longDesc,
          cost: r.cost,
          icon: r.icon,
          image_url: r.imageUrl,
          stock: r.stock,
          category: r.category
      }));
      
      const { error } = await supabase.from('rewards').upsert(dbRewards);
      if (error) console.error("Erro ao salvar recompensa", error);
  },

  deleteReward: async (id: string) => {
      const current = localCache.get<RewardItem[]>(CACHE_KEYS.REWARDS) || [];
      localCache.set(CACHE_KEYS.REWARDS, current.filter(r => r.id !== id));
      await supabase.from('rewards').delete().eq('id', id);
  },

  // --- SETTINGS ---

  getSettings: async (): Promise<AppSettings> => {
    const { data } = await supabase.from('settings').select('*').single();
    if (!data) return {
        platformName: 'Rede Social EJN',
        xpPerPost: 50,
        xpPerComment: 10,
        xpPerLikeReceived: 5,
        coinsPerPost: 10
    };
    
    const settings = {
        platformName: data.platform_name,
        xpPerPost: data.xp_per_post,
        xpPerComment: data.xp_per_comment,
        xpPerLikeReceived: data.xp_per_like, 
        coinsPerPost: data.coins_per_post
    };
    localCache.set(CACHE_KEYS.SETTINGS, settings);
    return settings;
  },

  saveSettings: async (settings: AppSettings) => {
      localCache.set(CACHE_KEYS.SETTINGS, settings);
      
      // Assume ID 1 para settings global
      const dbSettings = {
          id: 1, 
          platform_name: settings.platformName,
          xp_per_post: settings.xpPerPost,
          xp_per_comment: settings.xpPerComment,
          xp_per_like: settings.xpPerLikeReceived,
          coins_per_post: settings.coinsPerPost
      };
      
      await supabase.from('settings').upsert(dbSettings);
  },
  
  // Helpers para sessão
  signOut: async () => {
      localCache.clear();
      await supabase.auth.signOut();
  },
  
  signIn: async (email: string, password: string) => {
      return await supabase.auth.signInWithPassword({ email, password });
  },
  
  signUp: async (email: string, password: string, metaData: any) => {
      return await supabase.auth.signUp({
          email,
          password,
          options: { data: metaData }
      });
  },

  followUser: async (followerId: string, followingId: string) => {
    await supabase.from('follows').insert({
        follower_id: followerId,
        following_id: followingId
    });
  },
};
