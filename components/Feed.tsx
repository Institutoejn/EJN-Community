import React, { useState, useRef, useEffect } from 'react';
import { User, Post, Comment } from '../types';
import { Icons } from '../constants';
import Avatar from './Avatar';
import { storage } from '../services/storage';
import { supabase } from '../services/supabase';

interface FeedProps {
  user: User;
  onUpdateUser: (user: User) => void;
  onFollow: (targetId: string) => void;
}

const Feed: React.FC<FeedProps> = ({ user, onUpdateUser, onFollow }) => {
  // Inicializa com cache para velocidade, mas atualiza via rede logo em seguida
  const [posts, setPosts] = useState<Post[]>(() => storage.getLocalPosts());
  const [loadingPosts, setLoadingPosts] = useState(() => storage.getLocalPosts().length === 0);
  
  const [newPost, setNewPost] = useState('');
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showXpGain, setShowXpGain] = useState(false);
  const [xpAmount, setXpAmount] = useState(50);
  
  const [openComments, setOpenComments] = useState<Set<string>>(new Set());
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const [processingImage, setProcessingImage] = useState(false);
  
  // --- PROFILE MODAL STATE ---
  const [selectedProfile, setSelectedProfile] = useState<User | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // --- SISTEMA REALTIME UNIFICADO E CORRIGIDO ---
  useEffect(() => {
    fetchPosts(true);

    const channel = supabase.channel('feed-global-updates')
      // A. Escuta Mudanças nos POSTS
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, (payload) => {
         if (payload.eventType === 'INSERT') {
             // Se o post novo já existe no estado (via otimismo), não faz nada ou atualiza ID se precisar
             // Mas como fazemos a troca manual no submit, aqui focamos em posts DE OUTROS
             setPosts(current => {
                 // Evita duplicação se o ID já estiver lá
                 if (current.some(p => p.id === payload.new.id)) return current;
                 // Se não estiver (post de outro), busca o post completo
                 fetchPosts(true); 
                 return current;
             });
         } else if (payload.eventType === 'UPDATE') {
             setPosts(current => current.map(p => p.id === payload.new.id ? { ...p, content: payload.new.content, isPinned: payload.new.is_pinned } : p));
         } else if (payload.eventType === 'DELETE') {
             setPosts(current => current.filter(p => p.id !== payload.old.id));
         }
      })
      // B. Escuta LIKES - ATUALIZAÇÃO CIRÚRGICA
      .on('postgres_changes', { event: '*', schema: 'public', table: 'likes' }, async (payload) => {
          const affectedPostId = payload.new?.post_id || payload.old?.post_id;
          if (!affectedPostId) return;

          // Busca a contagem atualizada do banco
          const { count } = await supabase.from('likes').select('*', { count: 'exact', head: true }).eq('post_id', affectedPostId);
          
          // Verifica se EU curti (para garantir que a UI não minta)
          const { data: myLike } = await supabase.from('likes').select('id').eq('post_id', affectedPostId).eq('user_id', user.id).maybeSingle();

          setPosts(current => current.map(p => {
              if (p.id === affectedPostId) {
                  return {
                      ...p,
                      likes: count || 0,
                      likedByMe: !!myLike // Sincroniza estado real
                  };
              }
              return p;
          }));
      })
      // C. Escuta COMENTÁRIOS
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments' }, async (payload) => {
           // Quando chega um comentário novo, recarregamos a lista de comentários daquele post específico se estiver aberta
           // Ou apenas atualizamos o contador
           const pid = payload.new.post_id;
           
           // Fetch dos comentários atualizados deste post
           const { data: freshComments } = await supabase
            .from('comments')
            .select('*, users:user_id(name, avatar_url, avatar_cor)')
            .eq('post_id', pid)
            .order('created_at', { ascending: true });

           if (freshComments) {
               const mappedComments = freshComments.map((c: any) => ({
                    id: c.id, 
                    text: c.content, 
                    timestamp: c.created_at, 
                    userId: c.user_id,
                    userName: c.users?.name || 'Usuário', 
                    avatarUrl: c.users?.avatar_url, 
                    avatarCor: c.users?.avatar_cor
               }));

               setPosts(current => current.map(p => {
                   if (p.id === pid) return { ...p, comments: mappedComments };
                   return p;
               }));
           }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user.id]);

  const fetchPosts = async (force = false) => {
      try {
        const savedPosts = await storage.getPosts(force);
        if (savedPosts.length > 0) {
            setPosts(savedPosts);
        }
      } catch (error) {
          console.error("Background fetch error", error);
      } finally {
          setLoadingPosts(false);
      }
  };

  const handleProfileClick = async (userId: string) => {
      setLoadingProfile(true);
      try {
          const profile = await storage.getUserById(userId);
          if (profile) setSelectedProfile(profile);
      } catch (e) {
          console.error(e);
      } finally {
          setLoadingProfile(false);
      }
  };

  const handleFollowFromModal = (targetId: string) => {
      if (!selectedProfile) return;
      const isFollowing = user.followingIds.includes(targetId);
      
      setSelectedProfile(prev => {
          if (!prev) return null;
          return {
              ...prev,
              followersCount: isFollowing ? Math.max(0, prev.followersCount - 1) : prev.followersCount + 1
          };
      });

      onFollow(targetId);
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handlePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newPost.trim() && !selectedImageFile) || processingImage) return;

    setProcessingImage(true);
    const tempId = 'temp-' + Date.now();

    try {
        let uploadedImageUrl;
        if (selectedImageFile) {
            uploadedImageUrl = await storage.uploadImage(selectedImageFile, 'posts');
        }

        const optimisticPost: Post = {
            id: tempId,
            userId: user.id,
            userName: user.name,
            avatarUrl: user.avatarUrl,
            avatarCor: user.avatarCor,
            content: newPost,
            imageUrl: uploadedImageUrl || (imagePreview || undefined),
            comments: [], 
            likes: 0,
            timestamp: new Date().toISOString(),
            likedByMe: false
        };

        // 1. Adiciona otimista
        setPosts([optimisticPost, ...posts]);
        
        // Reset UI
        setNewPost('');
        setSelectedImageFile(null);
        setImagePreview(null);
        if (fileInputRef.current) fileInputRef.current.value = '';

        // 2. Salva no banco e ESPERA o ID Real
        const realPostData = await storage.savePost({
            userId: user.id,
            userName: user.name,
            content: optimisticPost.content,
            imageUrl: uploadedImageUrl,
            comments: [], 
            likes: 0,
            timestamp: optimisticPost.timestamp,
            id: '' 
        });

        // 3. CRUCIAL: Troca o ID temporário pelo Real no estado
        // Isso permite curtir imediatamente sem F5
        if (realPostData) {
            setPosts(current => current.map(p => 
                p.id === tempId ? { ...p, id: realPostData.id } : p
            ));
        }

        const xpBonus = uploadedImageUrl ? 75 : 50;
        const coinBonus = 10;
        
        setXpAmount(xpBonus);
        setShowXpGain(true);
        
        const updatedUser = { 
            ...user, 
            xp: user.xp + xpBonus,
            pontosTotais: user.pontosTotais + coinBonus, 
            postsCount: (user.postsCount || 0) + 1 
        };
        onUpdateUser(updatedUser);
        storage.saveUser(updatedUser);

        setTimeout(() => setShowXpGain(false), 2000);

    } catch (error) {
        console.error("Erro ao publicar:", error);
        // Remove post otimista em caso de erro
        setPosts(current => current.filter(p => p.id !== tempId));
        alert("Erro ao publicar. Verifique sua conexão.");
    } finally {
        setProcessingImage(false);
    }
  };

  const handleEditClick = (post: Post) => {
    setEditingPostId(post.id);
    setEditContent(post.content);
    setOpenMenuId(null);
  };

  const handleSaveEdit = async (postId: string) => {
    // Atualização Otimista
    setPosts(current => current.map(p => p.id === postId ? { ...p, content: editContent } : p));
    setEditingPostId(null);
    await storage.savePost({
        id: postId, userId: user.id, userName: user.name, content: editContent, timestamp: '', likes: 0, comments: []
    });
  };

  const handleDeletePost = async (postId: string) => {
    if(!confirm("Excluir publicação?")) return;
    // Otimista
    setPosts(current => current.filter(p => p.id !== postId));
    setOpenMenuId(null);
    await storage.deletePost(postId);
  };

  const handleLike = async (postId: string) => {
    // Proteção: Não permite curtir posts que ainda estão salvando (temp-id)
    if (postId.startsWith('temp-')) return;

    // 1. Atualização Visual Otimista
    const prevPosts = [...posts];
    setPosts(current => current.map(p => {
        if(p.id === postId) {
            return {
                ...p,
                likedByMe: !p.likedByMe,
                likes: p.likedByMe ? Math.max(0, p.likes - 1) : p.likes + 1
            };
        }
        return p;
    }));
    
    try {
        // 2. Envia para o banco
        await storage.toggleLike(postId, user.id);
    } catch (e) {
        // Reverte em caso de erro
        setPosts(prevPosts);
        console.error("Falha ao curtir");
    }
  };

  const toggleComments = (postId: string) => {
    const newOpen = new Set(openComments);
    if (newOpen.has(postId)) newOpen.delete(postId);
    else newOpen.add(postId);
    setOpenComments(newOpen);
  };

  const handleCommentSubmit = async (postId: string) => {
    if (postId.startsWith('temp-')) return; // Proteção

    const text = commentInputs[postId];
    if (!text || !text.trim()) return;

    const tempId = 'temp-' + Date.now();
    const newComment: Comment = {
        id: tempId,
        text: text,
        timestamp: new Date().toISOString(),
        userId: user.id,
        userName: user.name,
        avatarUrl: user.avatarUrl,
        avatarCor: user.avatarCor
    };

    // Otimista
    setPosts(current => current.map(p => {
        if(p.id === postId) return { ...p, comments: [...(p.comments || []), newComment] };
        return p;
    }));
    setCommentInputs({ ...commentInputs, [postId]: '' });

    try {
        // Salva e troca ID
        const realComment = await storage.addComment(postId, user.id, text);
        
        if (realComment) {
             setPosts(current => current.map(p => {
                 if(p.id === postId) {
                     const updatedComments = p.comments.map(c => c.id === tempId ? realComment : c);
                     return { ...p, comments: updatedComments };
                 }
                 return p;
             }));
             
            // Atualiza pontos do usuário apenas se sucesso
            const updatedUser = {
                ...user,
                xp: user.xp + 10,
                pontosTotais: user.pontosTotais + 2
            };
            onUpdateUser(updatedUser);
            storage.saveUser(updatedUser);
        }
    } catch (e) {
        // Reverte
        setPosts(current => current.map(p => {
            if (p.id === postId) return { ...p, comments: p.comments.filter(c => c.id !== tempId) };
            return p;
        }));
    }
  };

  return (
    <div className="w-full space-y-4 md:space-y-6 animate-fadeIn relative">
      {/* PROFILE POPUP MODAL */}
      {selectedProfile && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn" onClick={() => setSelectedProfile(null)}>
            <div className="bg-white rounded-[32px] p-8 w-full max-w-sm apple-shadow relative flex flex-col items-center text-center" onClick={(e) => e.stopPropagation()}>
                <button onClick={() => setSelectedProfile(null)} className="absolute top-4 right-4 p-2 text-apple-tertiary hover:text-apple-text bg-apple-bg rounded-full">
                    <Icons.X className="w-5 h-5" />
                </button>
                
                <Avatar 
                    name={selectedProfile.name} 
                    bgColor={selectedProfile.avatarCor} 
                    url={selectedProfile.avatarUrl} 
                    size="xl" 
                    className="mb-4 ring-4 ring-ejn-gold/20"
                />
                
                <h3 className="text-xl font-bold text-apple-text">{selectedProfile.name}</h3>
                <p className="text-xs text-ejn-medium font-bold uppercase tracking-widest mt-1">Nível {selectedProfile.nivel} • Aluno EJN</p>
                
                <p className="mt-4 text-sm text-apple-secondary leading-relaxed px-2">
                    {selectedProfile.bio || "Este aluno ainda não adicionou uma biografia."}
                </p>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 w-full mt-6 py-4 border-y border-apple-bg">
                    <div>
                        <p className="font-bold text-apple-text">{selectedProfile.postsCount || 0}</p>
                        <p className="text-[9px] text-apple-tertiary font-bold uppercase">Posts</p>
                    </div>
                    <div>
                        <p className="font-bold text-apple-text">{selectedProfile.followersCount || 0}</p>
                        <p className="text-[9px] text-apple-tertiary font-bold uppercase">Seguidores</p>
                    </div>
                    <div>
                        <p className="font-bold text-apple-text">{selectedProfile.followingCount || 0}</p>
                        <p className="text-[9px] text-apple-tertiary font-bold uppercase">Seguindo</p>
                    </div>
                </div>

                {/* Follow Button */}
                {user.id !== selectedProfile.id && (
                    <button 
                        onClick={() => handleFollowFromModal(selectedProfile.id)}
                        className={`w-full mt-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest apple-transition ${user.followingIds.includes(selectedProfile.id) ? 'bg-apple-bg text-apple-tertiary' : 'bg-ejn-dark text-white hover:bg-ejn-medium hover:scale-105 active:scale-95'}`}
                    >
                        {user.followingIds.includes(selectedProfile.id) ? 'Deixar de Seguir' : 'Seguir'}
                    </button>
                )}
            </div>
        </div>
      )}

      {/* Create Post */}
      <div className="bg-white rounded-2xl p-4 md:p-6 apple-shadow relative">
        {showXpGain && (
          <div className="absolute top-2 right-6 animate-bounce text-ejn-gold font-bold text-xs md:text-sm bg-ejn-dark px-3 py-1 rounded-full shadow-lg z-20">
            +{xpAmount} XP
          </div>
        )}
        <div className="flex gap-3 md:gap-4">
          <Avatar name={user.name} bgColor={user.avatarCor} url={user.avatarUrl} size="sm" className="hidden sm:flex" />
          <form onSubmit={handlePostSubmit} className="flex-1">
            <textarea
              className="w-full bg-apple-bg border-none rounded-xl p-3 md:p-4 text-sm font-medium text-apple-text placeholder-apple-tertiary focus:ring-0 focus:bg-white apple-transition resize-none min-h-[80px]"
              placeholder={`Olá ${user.name.split(' ')[0]}, qual o foco dos seus negócios hoje?`}
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
            />

            {imagePreview && (
              <div className="mt-3 relative inline-block group">
                <img src={imagePreview} alt="Preview" className="max-h-64 rounded-xl object-cover border border-apple-border shadow-sm" />
                <button type="button" onClick={() => { setSelectedImageFile(null); setImagePreview(null); }} className="absolute top-2 right-2 bg-black/50 text-white p-1.5 rounded-full hover:bg-black/70">
                  <Icons.X className="w-4 h-4"/>
                </button>
              </div>
            )}

            <div className="mt-4 flex justify-between items-center">
               <button 
                type="button" 
                onClick={() => !processingImage && fileInputRef.current?.click()}
                className="p-2.5 text-apple-secondary hover:text-ejn-medium hover:bg-apple-bg rounded-xl apple-transition flex items-center gap-2"
              >
                <Icons.Plus className="w-5 h-5"/>
                <span className="text-[10px] font-bold uppercase tracking-widest hidden md:inline">Foto</span>
              </button>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageSelect} />
              
              <button 
                type="submit"
                disabled={(!newPost.trim() && !selectedImageFile) || processingImage}
                className="bg-ejn-gold text-ejn-dark px-8 py-2.5 rounded-full font-bold text-xs md:text-sm shadow-sm hover:scale-105 active:scale-95 disabled:opacity-40 disabled:scale-100 apple-transition uppercase tracking-widest"
              >
                {processingImage ? '...' : 'Publicar'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Feed */}
      <div className="space-y-4 md:space-y-6">
        {loadingPosts ? (
           <div className="text-center py-10">
              <div className="inline-block w-8 h-8 border-4 border-ejn-gold/30 border-t-ejn-gold rounded-full animate-spin"></div>
           </div>
        ) : posts.length > 0 ? (
          posts.map((post) => (
            <div key={post.id} className={`bg-white rounded-2xl p-4 md:p-6 apple-shadow apple-transition animate-fadeIn relative ${post.id.startsWith('temp-') ? 'opacity-70' : ''}`}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="cursor-pointer hover:opacity-80 transition-opacity" onClick={() => handleProfileClick(post.userId)}>
                    <Avatar name={post.userName} bgColor={post.avatarCor || 'bg-gray-400'} url={post.avatarUrl} size="xs" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                        <h4 
                            className="font-bold text-apple-text text-sm truncate cursor-pointer hover:text-ejn-medium transition-colors"
                            onClick={() => handleProfileClick(post.userId)}
                        >
                            {post.userName}
                        </h4>
                        {user.id === post.userId && (
                          <div className="relative">
                            <button onClick={() => setOpenMenuId(openMenuId === post.id ? null : post.id)} className="p-1 hover:bg-apple-bg rounded-full">•••</button>
                            {openMenuId === post.id && (
                              <div ref={menuRef} className="absolute right-0 top-8 w-32 bg-white rounded-xl shadow-xl border border-apple-border z-20">
                                <button onClick={() => handleEditClick(post)} className="w-full text-left px-4 py-3 text-xs font-bold hover:bg-apple-bg">Editar</button>
                                <button onClick={() => handleDeletePost(post.id)} className="w-full text-left px-4 py-3 text-xs font-bold text-red-500 hover:bg-red-50">Excluir</button>
                              </div>
                            )}
                          </div>
                        )}
                    </div>
                    <p className="text-[10px] text-apple-secondary">
                        {post.id.startsWith('temp-') ? 'Enviando...' : new Date(post.timestamp).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                
                {editingPostId === post.id ? (
                  <div className="mb-4 bg-apple-bg p-3 rounded-xl">
                     <textarea className="w-full bg-transparent border-none text-sm resize-none" rows={3} value={editContent} onChange={(e) => setEditContent(e.target.value)} />
                     <button onClick={() => handleSaveEdit(post.id)} className="text-xs font-bold text-white bg-ejn-gold px-3 py-1 rounded-full mt-2">Salvar</button>
                  </div>
                ) : (
                  <p className="text-apple-text font-medium text-sm md:text-base mb-4 whitespace-pre-wrap">{post.content}</p>
                )}

                {post.imageUrl && (
                  <div className="rounded-2xl overflow-hidden border border-apple-border mb-4 bg-apple-bg">
                    <img src={post.imageUrl} alt="Post" className="w-full max-h-[500px] object-contain mx-auto" loading="lazy" />
                  </div>
                )}
                
                <div className="flex gap-6 mt-2 pt-4 border-t border-apple-border">
                  <button onClick={() => handleLike(post.id)} className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wide transition-colors ${post.likedByMe ? 'text-red-500' : 'text-apple-secondary hover:text-red-400'}`}>
                    <span>{post.likedByMe ? '❤️' : '🤍'}</span> {post.likes}
                  </button>
                  <button onClick={() => toggleComments(post.id)} className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-apple-secondary hover:text-ejn-medium transition-colors">
                    <span>💬</span> {(post.comments || []).length}
                  </button>
                </div>

                {openComments.has(post.id) && (
                  <div className="mt-4 pt-4 border-t border-apple-bg space-y-4">
                    {(post.comments || []).map(c => (
                      <div key={c.id} className={`flex gap-3 animate-fadeIn ${c.id.startsWith('temp-') ? 'opacity-60' : ''}`}>
                        <div className="cursor-pointer" onClick={() => handleProfileClick(c.userId)}>
                            <Avatar name={c.userName} bgColor={c.avatarCor} url={c.avatarUrl} size="xs" />
                        </div>
                        <div className="bg-apple-bg rounded-2xl px-4 py-2">
                           <p 
                                className="text-[10px] font-bold cursor-pointer hover:underline"
                                onClick={() => handleProfileClick(c.userId)}
                           >
                                {c.userName}
                           </p>
                           <p className="text-xs">{c.text}</p>
                        </div>
                      </div>
                    ))}
                    <div className="flex gap-2">
                        <input type="text" placeholder="Comentar..." className="flex-1 bg-apple-bg rounded-full px-4 text-xs" value={commentInputs[post.id] || ''} onChange={(e) => setCommentInputs({ ...commentInputs, [post.id]: e.target.value })} onKeyPress={(e) => e.key === 'Enter' && handleCommentSubmit(post.id)} />
                        <button onClick={() => handleCommentSubmit(post.id)} disabled={!commentInputs[post.id]} className="text-ejn-medium font-bold text-[10px] uppercase">Enviar</button>
                    </div>
                  </div>
                )}
            </div>
          ))
        ) : (
          <div className="bg-white rounded-3xl p-10 text-center apple-shadow">
            <h3 className="text-lg font-bold text-apple-text">Feed vazio</h3>
            <p className="text-xs text-apple-secondary mt-1">Seja o primeiro a publicar!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Feed;