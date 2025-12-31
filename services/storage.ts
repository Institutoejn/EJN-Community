
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
        // 1. INSTANT RETURN: Se existir cache local, retorna IMEDIATAMENTE.
        // Isso permite que a UI carregue em < 50ms.
        const cachedUser = localCache.get<User>(CACHE_KEYS.USER);
        
        // Se a flag skipNetwork for true, retornamos apenas o cache (usado no boot inicial do App.tsx)
        if (skipNetwork && cachedUser) return cachedUser;

        // 2. NETWORK FETCH (Background): Valida sessão e busca dados frescos
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error || !session) return null;

        const { data: profile, error: profileError } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single();

        if (profileError || !profile) {
             // Se falhar na rede mas tiver cache, mantemos o cache para não quebrar a exp
             return cachedUser || null;
        }

        const mappedUser = mapUser(profile);

        // Fast Track Followers
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
             // Em caso de erro/timeout, preserva dados antigos do cache se existirem
             if (cachedUser) {
                 mappedUser.followingIds = cachedUser.followingIds;
                 mappedUser.followingCount = cachedUser.followingCount;
                 mappedUser.followersCount = cachedUser.followersCount;
             }
        }

        // 3. UPDATE CACHE: Salva a versão mais nova para o próximo reload
        localCache.set(CACHE_KEYS.USER, mappedUser);
        return mappedUser;

    } catch (fatalError) {
        console.error("Erro fatal storage:", fatalError);
        return localCache.get<User>(CACHE_KEYS.USER); // Fallback final
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
    // Cache First
    const cached = localCache.get<User[]>(CACHE_KEYS.USERS);
    if (!forceRefresh && cached) {
        // Dispara refresh em background se necessário, mas retorna cache agora
        // (Para simplificar, retornamos cache e deixamos o refresh explícito atualizar depois)
        return cached;
    }

    const { data, error } = await supabase.from('users').select('*').order('xp', { ascending: false }).limit(50);
    if (error) return cached || [];
    
    const mapped = data.map(mapUser);
    localCache.set(CACHE_KEYS.USERS, mapped);
    return mapped;
  },

  saveUser: async (user: User) => {
    // Atualiza cache local imediatamente para feedback instantâneo
    localCache.set(CACHE_KEYS.USER, user);
    
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
      posts_count: user.postsCount
    };

    // Fire and forget (não espera resposta para não travar UI)
    supabase.from('users').update(dbUser).eq('id', user.id).then(({ error }) => {
        if (error) console.error('Erro sync user:', error);
    });
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
      .limit(30);

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
    // Atualiza cache local primeiro
    const currentPosts = localCache.get<Post[]>(CACHE_KEYS.POSTS) || [];
    // Adiciona temporariamente ao topo (optimistic UI)
    if (!post.id) {
        const tempPost = { ...post, id: 'temp-' + Date.now(), timestamp: new Date().toISOString() };
        localCache.set(CACHE_KEYS.POSTS, [tempPost, ...currentPosts]);
    }

    if (!post.id || post.id.length < 10) { 
        await supabase.from('posts').insert({
            user_id: post.userId,
            content: post.content,
            image_url: post.imageUrl
        });
    } else {
        await supabase.from('posts').update({
            is_pinned: post.isPinned,
            content: post.content
        }).eq('id', post.id);
    }
  },

  toggleLike: async (postId: string, userId: string) => {
      // Optimistic update já feito na UI, aqui só chama o banco
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
      // Remove do cache local imediatamente
      const currentPosts = localCache.get<Post[]>(CACHE_KEYS.POSTS) || [];
      localCache.set(CACHE_KEYS.POSTS, currentPosts.filter(p => p.id !== postId));
      
      await supabase.from('posts').delete().eq('id', postId);
  },

  // --- MISSIONS & REWARDS ---

  getMissions: async (): Promise<Mission[]> => {
    const cached = localCache.get<Mission[]>(CACHE_KEYS.MISSIONS);
    if (cached) return cached;

    const { data, error } = await supabase.from('missions').select('*').eq('is_active', true);
    if (error) return [];
    
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

  getRewards: async (): Promise<RewardItem[]> => {
    const cached = localCache.get<RewardItem[]>(CACHE_KEYS.REWARDS);
    if (cached) return cached;

    const { data, error } = await supabase.from('rewards').select('*');
    if (error) return [];
    
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

  // --- FOLLOW SYSTEM ---
  
  followUser: async (followerId: string, followingId: string) => {
      await supabase.from('follows').insert({
          follower_id: followerId,
          following_id: followingId
      });
  },

  // --- SETTINGS ---

  getSettings: async (): Promise<AppSettings> => {
    const cached = localCache.get<AppSettings>(CACHE_KEYS.SETTINGS);
    if (cached) return cached;

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
        xpPerLikeReceived: 5, 
        coinsPerPost: data.coins_per_post
    };
    localCache.set(CACHE_KEYS.SETTINGS, settings);
    return settings;
  },

  saveMissions: async (missions: Mission[]) => {
      localCache.set(CACHE_KEYS.MISSIONS, missions);
      const dbMissions = missions.map(m => ({
          id: m.id.includes('-') ? m.id : undefined, 
          title: m.title,
          description: m.desc,
          reward_xp: m.rewardXP,
          reward_coins: m.rewardCoins,
          icon: m.icon,
          type: m.type
      }));
      await supabase.from('missions').upsert(dbMissions);
  },

  saveRewards: async (rewards: RewardItem[]) => {
      localCache.set(CACHE_KEYS.REWARDS, rewards);
      const dbRewards = rewards.map(r => ({
          id: r.id.includes('-') ? r.id : undefined,
          title: r.title,
          description: r.desc,
          cost: r.cost,
          icon: r.icon,
          image_url: r.imageUrl,
          stock: r.stock,
          category: r.category
      }));
      await supabase.from('rewards').upsert(dbRewards);
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
  }
};
