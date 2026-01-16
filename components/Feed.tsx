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
  // ⚡ CARGA INSTANTÂNEA: Inicializa direto do cache síncrono
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

  useEffect(() => {
    // Atualiza posts em background
    fetchPosts(true);

    const channel = supabase.channel('feed-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, (payload) => {
         if (payload.eventType === 'UPDATE') {
             setPosts(current => current.map(p => p.id === payload.new.id ? { ...p, content: payload.new.content, isPinned: payload.new.is_pinned } : p));
         } else if (payload.eventType === 'DELETE') {
             setPosts(current => current.filter(p => p.id !== payload.old.id));
         } else if (payload.eventType === 'INSERT') {
             if (payload.new.user_id !== user.id) {
                 setTimeout(() => fetchPosts(true), 500);
             }
         }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

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
      onFollow(targetId);
      // Atualiza estado local do modal para refletir a mudança
      if (selectedProfile && selectedProfile.id === targetId) {
          // Nota: Isso é apenas visual dentro do modal
          // A lógica real de atualização está no onFollow do pai
          // Mas como o modal usa 'user' (que é o currentUser) para checar 'followingIds',
          // a atualização do pai via onUpdateUser deve propagar e atualizar o botão corretamente.
      }
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

    try {
        let uploadedImageUrl;
        if (selectedImageFile) {
            uploadedImageUrl = await storage.uploadImage(selectedImageFile, 'posts');
        }

        const optimisticPost: Post = {
            id: 'temp-' + Date.now(),
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

        setPosts([optimisticPost, ...posts]);
        
        setNewPost('');
        setSelectedImageFile(null);
        setImagePreview(null);
        if (fileInputRef.current) fileInputRef.current.value = '';

        await storage.savePost({
            userId: user.id,
            userName: user.name,
            content: optimisticPost.content,
            imageUrl: uploadedImageUrl,
            comments: [], 
            likes: 0,
            timestamp: optimisticPost.timestamp,
            id: '' 
        });

        const bonus = uploadedImageUrl ? 75 : 50;
        setXpAmount(bonus);
        setShowXpGain(true);
        
        const updatedUser = { ...user, xp: user.xp + bonus, postsCount: (user.postsCount || 0) + 1 };
        onUpdateUser(updatedUser);
        storage.saveUser(updatedUser);

        setTimeout(() => setShowXpGain(false), 2000);
        setTimeout(() => fetchPosts(true), 1000);

    } catch (error) {
        console.error("Erro ao publicar:", error);
        alert("Erro ao publicar. Tente novamente.");
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
    setPosts(current => current.map(p => p.id === postId ? { ...p, content: editContent } : p));
    setEditingPostId(null);
    await storage.savePost({
        id: postId, userId: user.id, userName: user.name, content: editContent, timestamp: '', likes: 0, comments: []
    });
  };

  const handleDeletePost = async (postId: string) => {
    if(!confirm("Excluir publicação?")) return;
    setPosts(current => current.filter(p => p.id !== postId));
    setOpenMenuId(null);
    await storage.deletePost(postId);
  };

  const handleLike = async (postId: string) => {
    setPosts(current => current.map(p => {
        if(p.id === postId) {
            return {
                ...p,
                likedByMe: !p.likedByMe,
                likes: p.likedByMe ? p.likes - 1 : p.likes + 1
            };
        }
        return p;
    }));
    await storage.toggleLike(postId, user.id);
  };

  const toggleComments = (postId: string) => {
    const newOpen = new Set(openComments);
    if (newOpen.has(postId)) newOpen.delete(postId);
    else newOpen.add(postId);
    setOpenComments(newOpen);
  };

  const handleCommentSubmit = async (postId: string) => {
    const text = commentInputs[postId];
    if (!text || !text.trim()) return;

    const newComment: Comment = {
        id: 'temp-' + Date.now(),
        text: text,
        timestamp: new Date().toISOString(),
        userId: user.id,
        userName: user.name,
        avatarUrl: user.avatarUrl,
        avatarCor: user.avatarCor
    };

    setPosts(current => current.map(p => {
        if(p.id === postId) return { ...p, comments: [...(p.comments || []), newComment] };
        return p;
    }));
    
    setCommentInputs({ ...commentInputs, [postId]: '' });
    await storage.addComment(postId, user.id, text);
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
                        disabled={user.followingIds.includes(selectedProfile.id)}
                        className={`w-full mt-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest apple-transition ${user.followingIds.includes(selectedProfile.id) ? 'bg-apple-bg text-apple-tertiary cursor-default' : 'bg-ejn-dark text-white hover:bg-ejn-medium hover:scale-105 active:scale-95'}`}
                    >
                        {user.followingIds.includes(selectedProfile.id) ? 'Seguindo' : 'Seguir'}
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
            <div key={post.id} className="bg-white rounded-2xl p-4 md:p-6 apple-shadow apple-transition animate-fadeIn relative">
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
                    <p className="text-[10px] text-apple-secondary">{new Date(post.timestamp).toLocaleDateString()}</p>
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
                  <button onClick={() => handleLike(post.id)} className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wide ${post.likedByMe ? 'text-red-500' : 'text-apple-secondary'}`}>
                    <span>{post.likedByMe ? '❤️' : '🤍'}</span> {post.likes}
                  </button>
                  <button onClick={() => toggleComments(post.id)} className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-apple-secondary">
                    <span>💬</span> {(post.comments || []).length}
                  </button>
                </div>

                {openComments.has(post.id) && (
                  <div className="mt-4 pt-4 border-t border-apple-bg space-y-4">
                    {(post.comments || []).map(c => (
                      <div key={c.id} className="flex gap-3">
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