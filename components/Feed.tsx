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
  // Inicialização INSTANTÂNEA com dados do cache local
  const [posts, setPosts] = useState<Post[]>(() => storage.getLocalPosts());
  const [loadingPosts, setLoadingPosts] = useState(() => storage.getLocalPosts().length === 0);
  
  const [newPost, setNewPost] = useState('');
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showXpGain, setShowXpGain] = useState(false);
  const [xpAmount, setXpAmount] = useState(50);
  
  // States para Comentários
  const [openComments, setOpenComments] = useState<Set<string>>(new Set());
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  
  // States para Edição/Exclusão
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const [processingImage, setProcessingImage] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Fecha menu ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // --- REALTIME SUBSCRIPTION ---
  useEffect(() => {
    fetchPosts(true);

    const channel = supabase.channel('feed-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, (payload) => {
         if (payload.eventType === 'UPDATE') {
             setPosts(current => current.map(p => p.id === payload.new.id ? { ...p, content: payload.new.content, isPinned: payload.new.is_pinned } : p));
         } else if (payload.eventType === 'DELETE') {
             setPosts(current => current.filter(p => p.id !== payload.old.id));
         } else if (payload.eventType === 'INSERT') {
             if (payload.new.user_id !== user.id) {
                 fetchPosts(true); 
             }
         }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'likes' }, () => {
         refreshLikesAndComments();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments' }, (payload) => {
         if (payload.new.user_id !== user.id) {
             refreshLikesAndComments();
         }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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

  const refreshLikesAndComments = async () => {
      const updatedPosts = await storage.getPosts(true);
      setPosts(current => {
          return updatedPosts.map(up => {
              const local = current.find(c => c.id === up.id);
              if (local && editingPostId === local.id) {
                   return { ...up, content: local.content }; 
              }
              return up;
          });
      });
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Apenas preview local
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
            imageUrl: uploadedImageUrl || (imagePreview || undefined), // Usa URL real se tiver, senão preview
            comments: [], 
            likes: 0,
            timestamp: new Date().toISOString(),
            likedByMe: false
        };

        // Atualização Otimista
        setPosts([optimisticPost, ...posts]);
        
        // Limpeza do Form
        setNewPost('');
        setSelectedImageFile(null);
        setImagePreview(null);
        if (fileInputRef.current) fileInputRef.current.value = '';

        // Salvar no Banco
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

        // Feedback de XP
        const bonus = uploadedImageUrl ? 75 : 50;
        setXpAmount(bonus);
        setShowXpGain(true);
        
        const updatedUser = { ...user, xp: user.xp + bonus, postsCount: (user.postsCount || 0) + 1 };
        onUpdateUser(updatedUser);
        storage.saveUser(updatedUser);

        setTimeout(() => {
            setShowXpGain(false);
            fetchPosts(true); // Garante sincronia
        }, 2000);

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

  const handleCancelEdit = () => {
    setEditingPostId(null);
    setEditContent('');
  };

  const handleSaveEdit = async (postId: string) => {
    setPosts(current => current.map(p => p.id === postId ? { ...p, content: editContent } : p));
    setEditingPostId(null);

    await storage.savePost({
        id: postId,
        userId: user.id, 
        userName: user.name,
        content: editContent,
        timestamp: '', 
        likes: 0,
        comments: []
    });
  };

  const handleDeletePost = async (postId: string) => {
    if(!confirm("Tem certeza que deseja excluir esta publicação?")) return;

    setPosts(current => current.filter(p => p.id !== postId));
    setOpenMenuId(null);

    await storage.deletePost(postId);
    onUpdateUser({ ...user, postsCount: Math.max(0, user.postsCount - 1) });
    storage.saveUser({ ...user, postsCount: Math.max(0, user.postsCount - 1) });
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
    onUpdateUser({ ...user, xp: user.xp + 5 });
    storage.saveUser({ ...user, xp: user.xp + 5 });
  };

  const removeSelectedImage = () => {
    setSelectedImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="w-full space-y-4 md:space-y-6 animate-fadeIn">
      {/* Create Post Card */}
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
                <img 
                  src={imagePreview} 
                  alt="Preview" 
                  className="max-h-64 rounded-xl object-cover border border-apple-border shadow-sm"
                />
                <button 
                  type="button"
                  onClick={removeSelectedImage}
                  className="absolute top-2 right-2 bg-black/50 text-white p-1.5 rounded-full hover:bg-black/70 apple-transition"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>
            )}

            <input 
              type="file" 
              ref={fileInputRef}
              className="hidden" 
              accept="image/*"
              onChange={handleImageSelect}
            />

            <div className="mt-4 flex justify-between items-center">
              <button 
                type="button" 
                onClick={() => !processingImage && fileInputRef.current?.click()}
                className="p-2.5 text-apple-secondary hover:text-ejn-medium hover:bg-apple-bg rounded-xl apple-transition flex items-center gap-2 group"
              >
                <svg className="w-5 h-5 group-hover:scale-110 apple-transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                </svg>
                <span className="text-[10px] font-bold uppercase tracking-widest hidden md:inline">{processingImage ? 'Processando...' : 'Anexar Foto'}</span>
              </button>
              <button 
                type="submit"
                disabled={(!newPost.trim() && !selectedImageFile) || processingImage}
                className="bg-ejn-gold text-ejn-dark px-8 py-2.5 rounded-full font-bold text-xs md:text-sm shadow-sm hover:scale-105 active:scale-95 disabled:opacity-40 disabled:scale-100 apple-transition uppercase tracking-widest"
              >
                {processingImage ? 'Enviando...' : 'Publicar'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Feed List */}
      <div className="space-y-4 md:space-y-6">
        {loadingPosts ? (
           <div className="text-center py-10">
              <div className="inline-block w-8 h-8 border-4 border-ejn-gold/30 border-t-ejn-gold rounded-full animate-spin"></div>
              <p className="mt-2 text-xs font-bold text-apple-tertiary">Carregando feed...</p>
           </div>
        ) : posts.length > 0 ? (
          posts.map((post) => (
            <div key={post.id} className="bg-white rounded-2xl p-4 md:p-6 apple-shadow apple-transition apple-shadow-hover animate-fadeIn relative">
                <div className="flex items-center gap-3 mb-4">
                  <Avatar 
                    name={post.userName} 
                    bgColor={post.avatarCor || 'bg-gray-400'} 
                    url={post.avatarUrl}
                    size="xs" 
                    className="!text-apple-secondary" 
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-apple-text text-sm leading-tight truncate">{post.userName}</h4>
                          {post.userId !== user.id && (
                            <>
                              <span className="text-apple-tertiary">•</span>
                              <button 
                                onClick={() => onFollow(post.userId)}
                                disabled={user.followingIds?.includes(post.userId)}
                                className={`text-[10px] font-black uppercase tracking-widest apple-transition ${user.followingIds?.includes(post.userId) ? 'text-apple-tertiary cursor-default' : 'text-ejn-medium hover:text-ejn-dark'}`}
                              >
                                {user.followingIds?.includes(post.userId) ? 'Seguindo' : 'Seguir'}
                              </button>
                            </>
                          )}
                        </div>

                        {user.id === post.userId && (
                          <div className="relative">
                            <button 
                              onClick={() => setOpenMenuId(openMenuId === post.id ? null : post.id)}
                              className="text-apple-secondary hover:text-apple-text p-1 rounded-full hover:bg-apple-bg transition-colors"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z"/>
                              </svg>
                            </button>
                            
                            {openMenuId === post.id && (
                              <div ref={menuRef} className="absolute right-0 top-8 w-32 bg-white rounded-xl shadow-xl border border-apple-border z-20 overflow-hidden animate-fadeIn">
                                <button 
                                  onClick={() => handleEditClick(post)}
                                  className="w-full text-left px-4 py-3 text-xs font-bold text-apple-text hover:bg-apple-bg flex items-center gap-2"
                                >
                                  <Icons.Edit className="w-3 h-3" /> Editar
                                </button>
                                <button 
                                  onClick={() => handleDeletePost(post.id)}
                                  className="w-full text-left px-4 py-3 text-xs font-bold text-red-500 hover:bg-red-50 flex items-center gap-2"
                                >
                                  <Icons.X className="w-3 h-3" /> Excluir
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                    </div>
                    <p className="text-[10px] md:text-[11px] text-apple-secondary font-medium">Postado em {new Date(post.timestamp).toLocaleDateString()}</p>
                  </div>
                </div>
                
                {editingPostId === post.id ? (
                  <div className="mb-4 bg-apple-bg p-3 rounded-xl border border-ejn-gold/50">
                     <textarea 
                        className="w-full bg-transparent border-none text-sm text-apple-text focus:ring-0 resize-none"
                        rows={3}
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                     />
                     <div className="flex justify-end gap-2 mt-2">
                        <button onClick={handleCancelEdit} className="text-xs font-bold text-apple-secondary hover:text-apple-text">Cancelar</button>
                        <button onClick={() => handleSaveEdit(post.id)} className="text-xs font-bold text-white bg-ejn-gold px-3 py-1 rounded-full">Salvar</button>
                     </div>
                  </div>
                ) : (
                  post.content && (
                    <p className="text-apple-text font-medium text-sm md:text-base leading-relaxed whitespace-pre-wrap mb-4">
                      {post.content}
                    </p>
                  )
                )}

                {post.imageUrl && (
                  <div className="rounded-2xl overflow-hidden border border-apple-border mb-4 bg-apple-bg">
                    <img src={post.imageUrl} alt="Conteúdo do post" className="w-full max-h-[500px] object-contain mx-auto" />
                  </div>
                )}
                
                <div className="mt-2 pt-4 border-t border-apple-border flex justify-between md:justify-start md:gap-8">
                  <button 
                    onClick={() => handleLike(post.id)}
                    className={`flex items-center gap-2 font-bold text-[9px] md:text-[10px] uppercase tracking-widest apple-transition group ${post.likedByMe ? 'text-red-500' : 'text-apple-secondary hover:text-red-500'}`}
                  >
                    <svg 
                      className={`w-4 h-4 group-hover:scale-110 apple-transition ${post.likedByMe ? 'fill-current' : ''}`} 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
                    </svg>
                    <span>{post.likes > 0 ? `${post.likes} Curtir` : 'Curtir'}</span>
                  </button>
                  
                  <button 
                    onClick={() => toggleComments(post.id)}
                    className="flex items-center gap-2 text-apple-secondary hover:text-ejn-medium font-bold text-[9px] md:text-[10px] uppercase tracking-widest apple-transition group"
                  >
                    <svg className="w-4 h-4 group-hover:scale-110 apple-transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
                    </svg>
                    <span>{(post.comments || []).length > 0 ? `${(post.comments || []).length} Comentários` : 'Comentário'}</span>
                  </button>
                </div>

                {openComments.has(post.id) && (
                  <div className="mt-4 pt-4 border-t border-apple-bg animate-fadeIn space-y-4">
                    {(post.comments || []).map(comment => (
                      <div key={comment.id} className="flex gap-3 animate-fadeIn">
                        <Avatar name={comment.userName} bgColor={comment.avatarCor} url={comment.avatarUrl} size="xs" />
                        <div className="flex-1 bg-apple-bg rounded-2xl px-4 py-2">
                           <p className="text-[10px] font-bold text-apple-text">{comment.userName}</p>
                           <p className="text-xs text-apple-text leading-tight">{comment.text}</p>
                        </div>
                      </div>
                    ))}

                    <div className="flex gap-3 items-center">
                      <Avatar name={user.name} bgColor={user.avatarCor} url={user.avatarUrl} size="xs" />
                      <div className="flex-1 flex gap-2">
                        <input 
                          type="text" 
                          placeholder="Escreva um comentário..."
                          className="flex-1 bg-apple-bg border-none rounded-full px-4 py-2 text-xs focus:ring-1 focus:ring-ejn-gold/50 outline-none"
                          value={commentInputs[post.id] || ''}
                          onChange={(e) => setCommentInputs({ ...commentInputs, [post.id]: e.target.value })}
                          onKeyPress={(e) => e.key === 'Enter' && handleCommentSubmit(post.id)}
                        />
                        <button 
                          onClick={() => handleCommentSubmit(post.id)}
                          disabled={!commentInputs[post.id]?.trim()}
                          className="text-ejn-medium font-bold text-[10px] uppercase tracking-widest disabled:opacity-30 hover:text-ejn-dark transition-colors"
                        >
                          Enviar
                        </button>
                      </div>
                    </div>
                  </div>
                )}
            </div>
          ))
        ) : (
          <div className="bg-white rounded-3xl p-12 md:p-16 text-center apple-shadow">
            <div className="w-16 h-16 md:w-20 md:h-20 bg-apple-bg rounded-full flex items-center justify-center mx-auto mb-6">
              <Icons.Plus className="w-8 h-8 md:w-10 md:h-10 text-apple-tertiary opacity-40" />
            </div>
            <h3 className="text-lg md:text-xl font-bold text-apple-text mb-2">Sua jornada começa agora</h3>
            <p className="text-apple-secondary text-xs md:text-sm font-medium max-w-[240px] md:max-w-[280px] mx-auto leading-relaxed">
              Conecte-se com a comunidade compartilhando seus primeiros insights.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Feed;