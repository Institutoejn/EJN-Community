
import React, { useState, useRef, useEffect } from 'react';
import { User, Post, Comment } from '../types';
import { Icons } from '../constants';
import Avatar from './Avatar';
import { storage } from '../services/storage';

interface FeedProps {
  user: User;
  onUpdateUser: (user: User) => void;
  onFollow: (targetId: string) => void;
}

const Feed: React.FC<FeedProps> = ({ user, onUpdateUser, onFollow }) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPost, setNewPost] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showXpGain, setShowXpGain] = useState(false);
  const [xpAmount, setXpAmount] = useState(50);
  const [openComments, setOpenComments] = useState<Set<string>>(new Set());
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [processingImage, setProcessingImage] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchPosts = async (force = false) => {
      // Loading state só aparece na primeira carga. 
      // Atualizações subsequentes são silenciosas ou mostram skeleton se cache estiver vazio.
      if (posts.length === 0) setLoadingPosts(true);
      
      const savedPosts = await storage.getPosts(force);
      setPosts(savedPosts);
      setLoadingPosts(false);
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  // --- FAST IMAGE PROCESSING ---
  // Qualidade 0.6 e Max Width 700px garantem Base64 leve e rápido
  const processImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxWidth = 700; // Otimizado para velocidade
          let width = img.width;
          let height = img.height;

          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }

          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          // JPEG com qualidade 0.6 para performance máxima
          resolve(canvas.toDataURL('image/jpeg', 0.6));
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProcessingImage(true);
      try {
        const compressed = await processImage(file);
        setSelectedImage(compressed);
      } catch (err) {
        console.error("Erro ao processar imagem do post");
      } finally {
        setProcessingImage(false);
      }
    }
  };

  const handlePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newPost.trim() && !selectedImage) || processingImage) return;

    // Criar post
    await storage.savePost({
        userId: user.id,
        userName: user.name,
        content: newPost,
        imageUrl: selectedImage || undefined,
        comments: [], 
        likes: 0,
        timestamp: new Date().toISOString(),
        id: '' 
    });

    // Limpeza da UI Instantânea
    setNewPost('');
    setSelectedImage(null);

    // Feedback de XP
    const bonus = selectedImage ? 75 : 50;
    setXpAmount(bonus);
    setShowXpGain(true);
    
    // Atualizar UI do usuário 
    const updatedUser = { 
      ...user, 
      xp: user.xp + bonus, 
      postsCount: (user.postsCount || 0) + 1 
    };
    onUpdateUser(updatedUser);
    
    // Background updates (fire & forget)
    storage.saveUser(updatedUser);
    fetchPosts(true); // Recarrega feed em background

    setTimeout(() => setShowXpGain(false), 2000);
  };

  const handleLike = async (postId: string) => {
    // Optimistic Update Instantâneo
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

    // Optimistic: Adiciona comentário visualmente antes do banco confirmar (se tivéssemos a estrutura completa aqui)
    // Para simplificar, limpamos o input e chamamos refresh
    setCommentInputs({ ...commentInputs, [postId]: '' });
    
    await storage.addComment(postId, user.id, text);
    
    await fetchPosts(true); // Força refresh do cache

    onUpdateUser({ ...user, xp: user.xp + 5 });
    storage.saveUser({ ...user, xp: user.xp + 5 });
  };

  const removeSelectedImage = () => {
    setSelectedImage(null);
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

            {selectedImage && (
              <div className="mt-3 relative inline-block group">
                <img 
                  src={selectedImage} 
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
                disabled={(!newPost.trim() && !selectedImage) || processingImage}
                className="bg-ejn-gold text-ejn-dark px-8 py-2.5 rounded-full font-bold text-xs md:text-sm shadow-sm hover:scale-105 active:scale-95 disabled:opacity-40 disabled:scale-100 apple-transition uppercase tracking-widest"
              >
                {processingImage ? 'Aguarde' : 'Publicar'}
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
            <div key={post.id} className="bg-white rounded-2xl p-4 md:p-6 apple-shadow apple-transition apple-shadow-hover animate-fadeIn">
                <div className="flex items-center gap-3 mb-4">
                  <Avatar 
                    name={post.userName} 
                    bgColor={post.avatarCor || 'bg-gray-400'} 
                    url={post.avatarUrl}
                    size="xs" 
                    className="!text-apple-secondary" 
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-apple-text text-sm leading-tight truncate">{post.userName}</h4>
                      
                      {/* Botão Seguir no Feed */}
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

                      <span className="shrink-0 bg-ejn-gold/10 text-ejn-medium text-[8px] md:text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase ml-auto">
                        Aluno EJN
                      </span>
                    </div>
                    <p className="text-[10px] md:text-[11px] text-apple-secondary font-medium">Postado em {new Date(post.timestamp).toLocaleDateString()}</p>
                  </div>
                </div>
                
                {post.content && (
                  <p className="text-apple-text font-medium text-sm md:text-base leading-relaxed whitespace-pre-wrap mb-4">
                    {post.content}
                  </p>
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

                {/* Seção de Comentários */}
                {openComments.has(post.id) && (
                  <div className="mt-4 pt-4 border-t border-apple-bg animate-fadeIn space-y-4">
                    {(post.comments || []).map(comment => (
                      <div key={comment.id} className="flex gap-3">
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
