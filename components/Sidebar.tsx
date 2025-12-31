
import React from 'react';
import { User, AppView } from '../types';
import Avatar from './Avatar';

interface SidebarProps {
  user: User;
  setView: (view: AppView) => void;
  onClose?: () => void;
  onFollow?: (id: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ user, setView, onClose, onFollow }) => {
  const topUsers = [
    { name: 'Ana Silva', points: 12500, avatar: 'bg-[#007AFF]' },
    { name: 'Carlos Lima', points: 11200, avatar: 'bg-[#FF3B30]' },
    { name: 'Beatriz Santos', points: 9800, avatar: 'bg-[#AF52DE]' },
    { name: user.name, points: user.pontosTotais, avatar: user.avatarCor, avatarUrl: user.avatarUrl, isCurrent: true },
    { name: 'Daniel Rocha', points: 8500, avatar: 'bg-[#FF9500]' },
  ].sort((a, b) => b.points - a.points).slice(0, 5);

  const handleNav = (view: AppView) => {
    setView(view);
    if (onClose) onClose();
  };

  const handleFollowClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onFollow) onFollow('paulo_mentoria');
  };

  return (
    <aside className="w-full lg:w-[280px] space-y-6">
      <div className="bg-white rounded-2xl p-6 apple-shadow apple-transition">
        <div className="flex flex-col items-center text-center">
          <div 
            onClick={() => handleNav('PROFILE')}
            className="cursor-pointer hover:opacity-90 transition-opacity"
          >
            <Avatar name={user.name} bgColor={user.avatarCor} url={user.avatarUrl} size="lg" />
          </div>
          <h3 className="mt-4 text-lg font-bold text-apple-text tracking-tight">{user.name}</h3>
          <p className="text-apple-secondary text-xs font-semibold uppercase tracking-widest mt-1">Nível {user.nivel}</p>
          
          <button 
            onClick={() => handleNav('PROFILE')}
            className="w-full mt-5 py-2.5 bg-apple-bg text-apple-text text-sm font-semibold rounded-full hover:bg-[#E5E5EA] transition-colors"
          >
            Ver perfil completo
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 apple-shadow">
        <div className="flex items-center justify-between mb-5">
          <h4 className="font-bold text-apple-text text-sm">Top 5 da Semana</h4>
          <span className="text-[10px] font-black text-ejn-medium uppercase tracking-widest">Global</span>
        </div>
        <div className="space-y-4">
          {topUsers.map((u, i) => (
            <div key={i} className={`flex items-center gap-3 ${u.isCurrent ? 'bg-ejn-gold/5 p-2 -mx-2 rounded-xl border border-ejn-gold/20' : ''}`}>
              <div className="text-[10px] font-bold text-apple-tertiary w-4">{i + 1}º</div>
              <div className="flex-1 min-w-0 flex items-center gap-2">
                 <div className={`w-8 h-8 rounded-full ${u.avatar} flex items-center justify-center text-[10px] text-white font-bold shrink-0`}>
                    {u.name[0]}
                 </div>
                 <div className="min-w-0">
                    <p className="text-xs font-bold text-apple-text truncate">{u.name}</p>
                    <p className="text-[10px] text-apple-secondary font-medium">{u.points.toLocaleString()} pts</p>
                 </div>
              </div>
            </div>
          ))}
        </div>
        <button 
          onClick={() => handleNav('RANKING')}
          className="w-full mt-4 py-2 text-xs font-bold text-ejn-medium hover:underline text-center apple-transition"
        >
          Ver ranking completo
        </button>
      </div>

      <div className="lg:hidden bg-white rounded-2xl p-6 apple-shadow">
          <h4 className="font-bold text-apple-text text-sm mb-4">Sugestão</h4>
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-full bg-ejn-medium flex items-center justify-center text-white font-bold text-xs">PM</div>
             <div>
                <p className="text-xs font-bold text-apple-text">Paulo Mentoria</p>
                <p className="text-[10px] text-apple-secondary">Especialista</p>
             </div>
             <button 
                onClick={handleFollowClick}
                disabled={user.followingIds?.includes('paulo_mentoria')}
                className={`ml-auto font-bold text-xs ${user.followingIds?.includes('paulo_mentoria') ? 'text-apple-tertiary' : 'text-ejn-medium'}`}
             >
                {user.followingIds?.includes('paulo_mentoria') ? 'Seguindo' : 'Seguir'}
             </button>
          </div>
      </div>

      <div className="bg-ejn-dark rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <h4 className="font-bold text-white text-sm mb-4">Acelere seu negócio</h4>
          <div className="space-y-4">
            <div className="flex gap-3 group cursor-pointer">
              <div className="w-5 h-5 bg-white/10 rounded-md flex items-center justify-center shrink-0 text-[10px] font-bold text-ejn-gold group-hover:bg-white/20 transition-colors">1</div>
              <p className="text-xs text-white/80 leading-relaxed font-medium">Conclua o módulo de Vendas Exponenciais para +500 XP.</p>
            </div>
            <div className="flex gap-3 group cursor-pointer">
              <div className="w-5 h-5 bg-white/10 rounded-md flex items-center justify-center shrink-0 text-[10px] font-bold text-ejn-gold group-hover:bg-white/20 transition-colors">2</div>
              <p className="text-xs text-white/80 leading-relaxed font-medium">Participe do fórum de networking do nível {user.nivel}.</p>
            </div>
          </div>
        </div>
        <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-ejn-medium/20 rounded-full blur-2xl"></div>
      </div>

      <footer className="text-center pb-4 lg:pb-0">
        <p className="text-[10px] text-apple-tertiary font-bold uppercase tracking-[0.2em]">
          Instituto Escola Jovens de Negócios
        </p>
      </footer>
    </aside>
  );
};

export default Sidebar;
