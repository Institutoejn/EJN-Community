
import { User, Post, Mission, RewardItem, AppSettings, Comment } from '../types';
import { supabase } from './supabase';

// Utilitário para mapear User DB (snake_case) -> User App (camelCase)
const mapUser = (dbUser: any): User => ({
  id: dbUser.id,
  name: dbUser.name || 'Usuário Sem Nome',
  email: dbUser.email || '',
  role: dbUser.role as 'aluno' | 'gestor',
  nivel: dbUser.nivel,
  xp: dbUser.xp,
  xpProximoNivel: dbUser.xp_proximo_nivel,
  pontosTotais: dbUser.pontos_totais,
  badges: dbUser.badges || [],
  dataCriacao: dbUser.created_at,
  avatarCor: dbUser.avatar_cor,
  bio: dbUser.bio,
  location: dbUser.location,
  website: dbUser.website,
  avatarUrl: dbUser.avatar_url,
  coverUrl: dbUser.cover_url,
  postsCount: dbUser.posts_count,
  likesReceived: dbUser.likes_received,
  commentsCount: 0, // Calculado via query se necessário
  streak: dbUser.streak,
  followersCount: 0, // Implementar tabela follows se desejar contagem real
  followingCount: 0,
  followingIds: [], // Implementar tabela follows
  status: dbUser.status as 'active' | 'suspended'
});

export const storage = {
  // --- AUTH & USER ---

  getCurrentUser: async (): Promise<User | null> => {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session) return null;

    // Buscar dados do perfil público
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (profileError || !profile) return null;

    // Buscar quem o usuário segue
    const { data: following } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', session.user.id);

    const mappedUser = mapUser(profile);
    mappedUser.followingIds = following ? following.map((f: any) => f.following_id) : [];
    mappedUser.followingCount = mappedUser.followingIds.length;
    
    // Buscar contagem de seguidores
    const { count } = await supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('following_id', session.user.id);
      
    mappedUser.followersCount = count || 0;

    return mappedUser;
  },

  getUsers: async (): Promise<User[]> => {
    const { data, error } = await supabase.from('users').select('*').order('xp', { ascending: false });
    if (error) {
      console.error('Erro ao buscar usuários:', error);
      return [];
    }
    return data.map(mapUser);
  },

  saveUser: async (user: User) => {
    // Mapear de volta para snake_case
    const dbUser = {
      id: user.id,
      name: user.name,
      // email: user.email, // Email gerido pelo Auth
      role: user.role,
      nivel: user.nivel,
      xp: user.xp,
      xp_proximo_nivel: user.xpProximoNivel,
      pontos_totais: user.pontosTotais,
      badges: user.badges,
      avatar_cor: user.avatarCor,
      bio: user.bio,
      location: user.location,
      website: user.website,
      avatar_url: user.avatarUrl,
      cover_url: user.coverUrl,
      posts_count: user.postsCount,
      likes_received: user.likesReceived,
      streak: user.streak,
      status: user.status
    };

    const { error } = await supabase.from('users').update(dbUser).eq('id', user.id);
    if (error) console.error('Erro ao atualizar usuário:', error);
  },

  // --- POSTS ---

  getPosts: async (): Promise<Post[]> => {
    const { data: { session } } = await supabase.auth.getSession();
    const currentUserId = session?.user?.id;

    // Buscar Posts + Dados do Autor + Comentários (e autores) + Likes
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
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar posts:', error);
      return [];
    }

    return data.map((p: any) => ({
      id: p.id,
      userId: p.user_id,
      userName: p.users?.name || 'Desconhecido',
      avatarUrl: p.users?.avatar_url,
      avatarCor: p.users?.avatar_cor,
      content: p.content,
      imageUrl: p.image_url,
      timestamp: p.created_at,
      likes: p.likes, // O count simples da tabela ou count da relação
      isPinned: p.is_pinned,
      likedByMe: currentUserId ? p.likes.some((l: any) => l.user_id === currentUserId) : false,
      comments: p.comments.map((c: any) => ({
        id: c.id,
        text: c.content,
        timestamp: c.created_at,
        userId: c.user_id,
        userName: c.users?.name || 'Desconhecido',
        avatarUrl: c.users?.avatar_url,
        avatarCor: c.users?.avatar_cor
      })).sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    }));
  },

  savePost: async (post: Post) => {
    // Inserir novo post
    if (!post.id || post.id.length < 10) { // Check simples se é ID novo
        const { error } = await supabase.from('posts').insert({
            user_id: post.userId,
            content: post.content,
            image_url: post.imageUrl
        });
        if (error) console.error("Erro ao criar post", error);
    } else {
        // Atualizar existente (ex: pin)
        const { error } = await supabase.from('posts').update({
            is_pinned: post.isPinned,
            content: post.content
        }).eq('id', post.id);
        if (error) console.error("Erro ao atualizar post", error);
    }
  },

  toggleLike: async (postId: string, userId: string) => {
      // Verificar se já curtiu
      const { data } = await supabase.from('likes').select('id').eq('post_id', postId).eq('user_id', userId).single();
      
      if (data) {
          // Remover Like
          await supabase.from('likes').delete().eq('id', data.id);
          // Decrementar contador no post (opcional, pode ser trigger no banco)
          await supabase.rpc('decrement_likes', { row_id: postId }); 
          // NOTA: Para simplificar sem criar funções RPC SQL complexas agora, 
          // vamos confiar no client update ou refresh. 
          // O ideal é usar triggers SQL para contadores.
          // Fallback manual update:
          const { data: p } = await supabase.from('posts').select('likes').eq('id', postId).single();
          if(p) await supabase.from('posts').update({ likes: Math.max(0, p.likes - 1) }).eq('id', postId);
      } else {
          // Adicionar Like
          await supabase.from('likes').insert({ post_id: postId, user_id: userId });
          const { data: p } = await supabase.from('posts').select('likes').eq('id', postId).single();
          if(p) await supabase.from('posts').update({ likes: p.likes + 1 }).eq('id', postId);
      }
  },

  addComment: async (postId: string, userId: string, content: string) => {
      const { error } = await supabase.from('comments').insert({
          post_id: postId,
          user_id: userId,
          content: content
      });
      if(error) console.error("Erro ao comentar", error);
  },

  deletePost: async (postId: string) => {
      await supabase.from('posts').delete().eq('id', postId);
  },

  // --- MISSIONS & REWARDS ---

  getMissions: async (): Promise<Mission[]> => {
    const { data, error } = await supabase.from('missions').select('*').eq('is_active', true);
    if (error) return [];
    return data.map((m: any) => ({
        id: m.id,
        title: m.title,
        desc: m.description,
        rewardXP: m.reward_xp,
        rewardCoins: m.reward_coins,
        icon: m.icon,
        type: m.type,
        isActive: m.is_active
    }));
  },

  getRewards: async (): Promise<RewardItem[]> => {
    const { data, error } = await supabase.from('rewards').select('*');
    if (error) return [];
    return data.map((r: any) => ({
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
  },

  // --- FOLLOW SYSTEM ---
  
  followUser: async (followerId: string, followingId: string) => {
      const { error } = await supabase.from('follows').insert({
          follower_id: followerId,
          following_id: followingId
      });
      if(!error) {
          // Atualizar XP por networking (exemplo)
          // Isso deveria ser idealmente no backend/trigger
      }
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
    return {
        platformName: data.platform_name,
        xpPerPost: data.xp_per_post,
        xpPerComment: data.xp_per_comment,
        xpPerLikeReceived: 0, // Campo não estava no SQL inicial, ajustado
        coinsPerPost: data.coins_per_post
    };
  },

  // Métodos de Admin para Salvar/Criar (Simplificados)
  saveMissions: async (missions: Mission[]) => {
      // Upsert logic map back to snake_case
      const dbMissions = missions.map(m => ({
          id: m.id.includes('-') ? m.id : undefined, // Se tem hifen é UUID, senao é temp ID, deixa criar novo
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
