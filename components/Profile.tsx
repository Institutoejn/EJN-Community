
import React, { useState, useRef } from 'react';
import { User } from '../types';
import Avatar from './Avatar';
import { Icons, AVATAR_COLORS } from '../constants';
import { storage } from '../services/storage';

interface ProfileProps {
  user: User;
  onUpdateUser: (user: User) => void;
}

const Profile: React.FC<ProfileProps> = ({ user, onUpdateUser }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedUser, setEditedUser] = useState<User>({ ...user });
  const [message, setMessage] = useState('');
  
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const xpPercentage = (user.xp / user.xpProximoNivel) * 100;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'cover') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        if (type === 'avatar') {
          setEditedUser({ ...editedUser, avatarUrl: base64String });
        } else {
          setEditedUser({ ...editedUser, coverUrl: base64String });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    storage.saveUser(editedUser);
    storage.setCurrentUser(editedUser);
    onUpdateUser(editedUser);
    setIsEditing(false);
    setMessage('Perfil atualizado com sucesso');
    setTimeout(() => setMessage(''), 3000);
  };

  return (
    <div className="w-full space-y-6 md:space-y-8 animate-fadeIn">
      {/* Hidden Inputs */}
      <input 
        type="file" 
        ref={avatarInputRef} 
        className="hidden" 
        accept="image/*" 
        onChange={(e) => handleFileChange(e, 'avatar')} 
      />
      <input 
        type="file" 
        ref={coverInputRef} 
        className="hidden" 
        accept="image/*" 
        onChange={(e) => handleFileChange(e, 'cover')} 
      />

      {/* Profile Header */}
      <div className="bg-white rounded-3xl apple-shadow overflow-hidden">
        <div className="h-32 md:h-48 bg-ejn-dark relative group">
          {editedUser.coverUrl ? (
            <img src={isEditing ? editedUser.coverUrl : user.coverUrl} className="w-full h-full object-cover" alt="Capa" />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-ejn-dark to-ejn-medium opacity-50"></div>
          )}
          
          {isEditing && (
             <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => coverInputRef.current?.click()}
                  className="bg-white/90 text-apple-text px-4 py-2 rounded-full text-xs font-bold apple-transition hover:scale-105 flex items-center gap-2"
                >
                  <Icons.Plus className="w-4 h-4" /> Alterar Capa
                </button>
             </div>
          )}
        </div>
        
        <div className="px-5 md:px-8 pb-8">
          <div className="flex flex-col md:flex-row md:justify-between items-center md:items-end -mt-12 md:-mt-16 mb-8 gap-4 md:gap-0">
            <div className="relative group">
              <Avatar 
                name={user.name} 
                bgColor={editedUser.avatarCor} 
                url={isEditing ? editedUser.avatarUrl : user.avatarUrl} 
                size="xl" 
                className="ring-4 md:ring-8 ring-white" 
              />
              {isEditing && (
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="absolute inset-0 bg-black/40 rounded-full"></div>
                  <div className="z-10 flex flex-col gap-2">
                    <button 
                      onClick={() => avatarInputRef.current?.click()}
                      className="bg-white text-apple-text px-3 py-1.5 rounded-full text-[10px] font-bold apple-transition hover:scale-105"
                    >
                      Alterar Foto
                    </button>
                    <button 
                      onClick={() => setEditedUser({...editedUser, avatarCor: AVATAR_COLORS[Math.floor(Math.random()*AVATAR_COLORS.length)], avatarUrl: undefined})}
                      className="bg-white/20 text-white px-3 py-1.5 rounded-full text-[10px] font-bold apple-transition hover:bg-white/40"
                    >
                      Remover
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            {!isEditing ? (
              <button 
                onClick={() => setIsEditing(true)}
                className="bg-apple-bg hover:bg-[#E5E5EA] text-apple-text px-6 py-2.5 rounded-full font-bold text-sm apple-transition flex items-center gap-2"
              >
                <Icons.Edit /> <span className="hidden sm:inline">Editar Perfil</span>
              </button>
            ) : (
              <div className="flex gap-2">
                <button 
                  onClick={() => {
                    setIsEditing(false);
                    setEditedUser({...user});
                  }}
                  className="bg-apple-bg text-apple-secondary px-5 md:px-6 py-2 md:py-2.5 rounded-full font-bold text-sm hover:text-apple-text apple-transition"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSave}
                  className="bg-ejn-gold text-ejn-dark px-7 md:px-8 py-2 md:py-2.5 rounded-full font-bold text-sm shadow-md hover:scale-105 active:scale-95 apple-transition"
                >
                  Salvar
                </button>
              </div>
            )}
          </div>

          {message && (
            <div className="fixed top-20 right-4 md:right-8 bg-apple-text text-white px-6 py-3 rounded-2xl text-sm font-bold shadow-2xl animate-slideIn flex items-center gap-2 z-[60]">
               <div className="w-4 h-4 bg-green-500 rounded-full"></div> {message}
            </div>
          )}

          {!isEditing ? (
            <div className="space-y-6 text-center md:text-left">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-apple-text tracking-tight">{user.name}</h2>
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mt-1">
                   <span className="text-ejn-medium font-bold uppercase tracking-widest text-[10px] md:text-[11px]">Empreendedor • Nível {user.nivel}</span>
                   <span className="hidden sm:block w-1.5 h-1.5 bg-apple-border rounded-full"></span>
                   <span className="text-apple-secondary text-[10px] font-bold uppercase tracking-wider">#{user.id}</span>
                </div>
              </div>
              
              <p className="text-apple-text font-medium text-sm md:text-base max-w-2xl leading-relaxed mx-auto md:mx-0">
                {user.bio || 'Adicione uma breve descrição profissional para que os outros alunos conheçam sua jornada.'}
              </p>

              <div className="flex flex-wrap justify-center md:justify-start gap-x-8 gap-y-4 text-[10px] md:text-xs font-bold text-apple-secondary uppercase tracking-widest">
                <div className="flex items-center gap-2">
                  <Icons.Location className="w-4 h-4 text-apple-tertiary" /> {user.location || 'Brasil'}
                </div>
                {user.website && (
                  <a href={user.website} target="_blank" rel="noopener" className="flex items-center gap-2 text-ejn-medium hover:opacity-70 transition-opacity">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.828a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg>
                    {user.website.replace(/^https?:\/\//, '')}
                  </a>
                )}
                <div className="flex items-center gap-2">EJN • {new Date(user.dataCriacao).getFullYear()}</div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeIn">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-apple-secondary uppercase tracking-[0.2em] ml-1">Nome Completo</label>
                <input 
                  type="text" 
                  className="w-full h-12 px-5 bg-apple-bg border border-apple-border rounded-xl focus:ring-2 focus:ring-ejn-gold/20 focus:outline-none font-medium apple-transition"
                  value={editedUser.name}
                  onChange={(e) => setEditedUser({...editedUser, name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-apple-secondary uppercase tracking-[0.2em] ml-1">Base de Operações</label>
                <input 
                  type="text" 
                  placeholder="Ex: Curitiba, PR"
                  className="w-full h-12 px-5 bg-apple-bg border border-apple-border rounded-xl focus:ring-2 focus:ring-ejn-gold/20 focus:outline-none font-medium apple-transition"
                  value={editedUser.location || ''}
                  onChange={(e) => setEditedUser({...editedUser, location: e.target.value})}
                />
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="text-[10px] font-black text-apple-secondary uppercase tracking-[0.2em] ml-1">Pitch / Bio</label>
                <textarea 
                  className="w-full p-5 bg-apple-bg border border-apple-border rounded-xl focus:ring-2 focus:ring-ejn-gold/20 focus:outline-none min-h-[120px] font-medium resize-none apple-transition"
                  value={editedUser.bio || ''}
                  maxLength={160}
                  onChange={(e) => setEditedUser({...editedUser, bio: e.target.value})}
                  placeholder="Defina seu negócio em poucas palavras..."
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stats Cards - Refatorado com Seguidores */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Card XP e Nível */}
        <div className="bg-white rounded-3xl p-5 md:p-6 apple-shadow">
           <p className="text-[9px] md:text-[10px] font-black text-apple-tertiary uppercase tracking-widest mb-1">XP Atual</p>
           <div className="flex items-end justify-between mb-3">
              <h3 className="text-xl md:text-2xl font-bold text-apple-text">{user.xp.toLocaleString()}</h3>
              <p className="text-[10px] font-bold text-apple-secondary">Nível {user.nivel}</p>
           </div>
           <div className="h-1.5 w-full bg-[#E5E5EA] rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-ejn-gold to-[#FFC933] transition-all duration-1000"
                style={{ width: `${xpPercentage}%` }}
              ></div>
           </div>
        </div>

        {/* Card Saldo EJN Coins */}
        <div className="bg-white rounded-3xl p-5 md:p-6 apple-shadow flex flex-col justify-center">
           <p className="text-[9px] md:text-[10px] font-black text-apple-tertiary uppercase tracking-widest mb-1">Saldo EJN Coins</p>
           <div className="flex items-center gap-2 md:gap-3">
              <h3 className="text-xl md:text-3xl font-black text-ejn-gold">{user.pontosTotais.toLocaleString()}</h3>
              <div className="w-6 h-6 md:w-8 md:h-8 bg-ejn-gold/10 rounded-lg flex items-center justify-center text-[9px] font-black text-ejn-gold">EJN</div>
           </div>
        </div>

        {/* Card Seguidores / Seguindo */}
        <div className="bg-white rounded-3xl p-5 md:p-6 apple-shadow flex flex-col justify-center">
           <p className="text-[9px] md:text-[10px] font-black text-apple-tertiary uppercase tracking-widest mb-1">Conexões</p>
           <div className="flex items-center gap-6">
              <div className="text-center">
                 <p className="text-lg md:text-xl font-bold text-apple-text">{user.followersCount.toLocaleString()}</p>
                 <p className="text-[8px] font-bold text-apple-secondary uppercase">Seguidores</p>
              </div>
              <div className="text-center">
                 <p className="text-lg md:text-xl font-bold text-apple-text">{user.followingCount.toLocaleString()}</p>
                 <p className="text-[8px] font-bold text-apple-secondary uppercase">Seguindo</p>
              </div>
           </div>
        </div>

        {/* Card Impacto Social */}
        <div className="bg-white rounded-3xl p-5 md:p-6 apple-shadow flex flex-col justify-center">
           <p className="text-[9px] md:text-[10px] font-black text-apple-tertiary uppercase tracking-widest mb-1">Impacto</p>
           <div className="flex items-center gap-6">
              <div className="text-center">
                 <p className="text-lg md:text-xl font-bold text-apple-text">{user.postsCount}</p>
                 <p className="text-[8px] font-bold text-apple-secondary uppercase">Posts</p>
              </div>
              <div className="text-center">
                 <p className="text-lg md:text-xl font-bold text-apple-text">{user.likesReceived}</p>
                 <p className="text-[8px] font-bold text-apple-secondary uppercase">Curtidas</p>
              </div>
           </div>
        </div>

        {/* Card Frequência */}
        <div className="bg-white rounded-3xl p-5 md:p-6 apple-shadow flex flex-col justify-center col-span-2 lg:col-span-1">
           <p className="text-[9px] md:text-[10px] font-black text-apple-tertiary uppercase tracking-widest mb-1">Frequência</p>
           <div className="flex items-baseline gap-2">
              <h3 className="text-xl md:text-3xl font-black text-apple-text">🔥 {user.streak}</h3>
              <p className="text-[8px] md:text-[10px] font-bold text-apple-secondary uppercase">Dias</p>
           </div>
        </div>
      </div>

      {/* Badges Section */}
      <div className="bg-white rounded-3xl p-6 md:p-8 apple-shadow">
        <h3 className="text-lg md:text-xl font-bold text-apple-text mb-6 md:mb-8">Badges Conquistadas</h3>
        <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-4 md:gap-8">
            {user.badges.map((b, i) => (
                <div key={i} className="flex flex-col items-center gap-2 md:gap-3 group">
                    <div className="w-12 h-12 md:w-16 md:h-16 bg-apple-bg rounded-2xl flex items-center justify-center shadow-inner border border-apple-border group-hover:scale-110 group-hover:bg-ejn-gold/10 apple-transition cursor-pointer">
                        <span className="text-2xl md:text-3xl">🏆</span>
                    </div>
                    <span className="text-[8px] md:text-[9px] font-bold text-apple-secondary text-center uppercase leading-tight tracking-wider">{b}</span>
                </div>
            ))}
            {[...Array(4)].map((_, i) => (
                <div key={i} className="flex flex-col items-center gap-2 md:gap-3 opacity-20 grayscale">
                    <div className="w-12 h-12 md:w-16 md:h-16 bg-apple-bg rounded-2xl flex items-center justify-center border-2 border-dashed border-apple-border">
                        <Icons.Award className="w-6 h-6 md:w-8 md:h-8 text-apple-tertiary" />
                    </div>
                    <span className="text-[8px] md:text-[9px] font-bold text-apple-tertiary text-center uppercase tracking-wider">Bloqueado</span>
                </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default Profile;
