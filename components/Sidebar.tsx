import React, { useEffect, useState } from 'react';
import { User, AppView, DailyNotice } from '../types';
import Avatar from './Avatar';
import { storage } from '../services/storage';
import { supabase } from '../services/supabase'; // Import crucial para o Realtime
import { Icons } from '../constants';

interface SidebarProps {
  user: User;
  setView: (view: AppView) => void;
  onClose?: () => void;
  onFollow?: (id: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ user, setView, onClose, onFollow }) => {
  const [topUsers, setTopUsers] = useState<any[]>([]);
  const [notices, setNotices] = useState<DailyNotice[]>([]);
  const [isEditingNotices, setIsEditingNotices] = useState(false);
  const [newNotice, setNewNotice] = useState('');
  const [loadingNotices, setLoadingNotices] = useState(true);
  const [liveUpdate, setLiveUpdate] = useState(false); // Estado para efeito visual de atualização

  // Função isolada para buscar o ranking
  const fetchRanking = async (forceRefresh = false) => {
    try {
        // Se for refresh forçado, ignora o cache local para pegar o valor REAL do banco
        const users = await storage.getUsers(forceRefresh);
        
        // CORREÇÃO DE LÓGICA: Ranking agora é baseado em XP (Mérito Total) e não Saldo (Coins)
        // Isso evita que o aluno caia no ranking ao comprar itens
        const ranked = users
            .sort((a, b) => b.xp - a.xp)
            .slice(0, 5)
            .map(u => ({
                id: u.id,
                name: u.name,
                points: u.xp, // Exibe XP
                avatarCor: u.avatarCor,
                avatarUrl: u.avatarUrl,
                isCurrent: u.id === user.id
            }));
        setTopUsers(ranked);
        
        if (forceRefresh) {
            setLiveUpdate(true);
            setTimeout(() => setLiveUpdate(false), 1000);
        }
    } catch (e) {
        console.error("Erro ao atualizar ranking:", e);
    }
  };

  useEffect(() => {
    // 1. Carga inicial (Cache + Rede)
    fetchRanking(false); // Carrega rápido do cache
    fetchRanking(true);  // Atualiza com dados reais do servidor

    fetchNotices();

    // 2. INSCRIÇÃO EM TEMPO REAL (REALTIME)
    // Escuta qualquer mudança na tabela 'users' (pontos mudaram, xp mudou, etc)
    const rankingSubscription = supabase
      .channel('sidebar-ranking-updates')
      .on(
        'postgres_changes',
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'users' 
        },
        (payload) => {
          // Se houver qualquer atualização em usuários, recarrega o ranking forçando dados novos
          fetchRanking(true);
        }
      )
      .subscribe();

    const noticesSubscription = supabase
      .channel('sidebar-notices-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'daily_notices' },
        () => {
            fetchNotices();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(rankingSubscription);
      supabase.removeChannel(noticesSubscription);
    };
  }, [user.id]); // Recria apenas se o ID do usuário mudar (login/logout)

  const fetchNotices = async () => {
    try {
      const data = await storage.getDailyNotices();
      setNotices(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingNotices(false);
    }
  };

  const handleAddNotice = async () => {
    if (!newNotice.trim()) return;
    try {
      const tempNotice = { id: 'temp-'+Date.now(), content: newNotice, createdAt: new Date().toISOString() };
      setNotices([tempNotice, ...notices]);
      setNewNotice('');
      
      await storage.addDailyNotice(newNotice);
      // O Realtime atualizará a lista final
    } catch (e) {
      alert('Erro ao adicionar aviso');
    }
  };

  const handleDeleteNotice = async (id: string) => {
    if (!confirm('Remover aviso?')) return;
    setNotices(notices.filter(n => n.id !== id));
    await storage.deleteDailyNotice(id);
  };

  const handleNav = (view: AppView) => {
    setView(view);
    if (onClose) onClose();
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

      <div className="bg-white rounded-2xl p-6 apple-shadow relative overflow-hidden">
        {/* Indicador de Atualização em Tempo Real */}
        <div className={`absolute top-0 right-0 w-2 h-2 bg-green-500 rounded-full m-6 transition-opacity duration-500 ${liveUpdate ? 'opacity-100 animate-ping' : 'opacity-0'}`}></div>

        <div className="flex items-center justify-between mb-5">
          <h4 className="font-bold text-apple-text text-sm">Top 5 (Por XP)</h4>
          <span className={`text-[10px] font-black uppercase tracking-widest transition-colors ${liveUpdate ? 'text-green-600' : 'text-ejn-medium'}`}>
             {liveUpdate ? 'Atualizando...' : 'Tempo Real'}
          </span>
        </div>
        <div className="space-y-4">
          {topUsers.length > 0 ? topUsers.map((u, i) => (
            <div key={u.id} className={`flex items-center gap-3 animate-fadeIn ${u.isCurrent ? 'bg-ejn-gold/5 p-2 -mx-2 rounded-xl border border-ejn-gold/20' : ''}`}>
              <div className={`text-[10px] font-bold w-4 ${i === 0 ? 'text-ejn-gold text-sm' : 'text-apple-tertiary'}`}>{i + 1}º</div>
              <div className="flex-1 min-w-0 flex items-center gap-2">
                 <Avatar name={u.name} bgColor={u.avatarCor} url={u.avatarUrl} size="xs" className="w-8 h-8 text-[10px]" />
                 <div className="min-w-0">
                    <p className={`text-xs font-bold truncate ${u.isCurrent ? 'text-ejn-dark' : 'text-apple-text'}`}>{u.name}</p>
                    <p className="text-[10px] text-apple-secondary font-medium">{u.points.toLocaleString()} XP</p>
                 </div>
              </div>
            </div>
          )) : (
              <div className="text-center py-4 text-xs text-apple-tertiary">
                  <div className="inline-block w-4 h-4 border-2 border-ejn-medium border-t-transparent rounded-full animate-spin mr-2"></div>
                  Sincronizando...
              </div>
          )}
        </div>
        <button 
          onClick={() => handleNav('RANKING')}
          className="w-full mt-4 py-2 text-xs font-bold text-ejn-medium hover:underline text-center apple-transition"
        >
          Ver ranking completo
        </button>
      </div>

      {/* CARD VERDE - AVISOS DIÁRIOS */}
      <div className="bg-ejn-dark rounded-2xl p-6 shadow-xl relative overflow-hidden group">
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-4">
             <h4 className="font-bold text-white text-sm">Avisos da Diretoria</h4>
             {user.role === 'gestor' && (
               <button 
                 onClick={() => setIsEditingNotices(!isEditingNotices)}
                 className="text-white/60 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-colors"
               >
                 <Icons.Edit className="w-4 h-4" />
               </button>
             )}
          </div>

          <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
            {isEditingNotices && (
              <div className="flex gap-2 mb-4 animate-fadeIn">
                <input 
                  type="text" 
                  value={newNotice}
                  onChange={(e) => setNewNotice(e.target.value)}
                  placeholder="Novo aviso..."
                  className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-xs text-white placeholder-white/50 focus:outline-none focus:bg-white/20"
                  onKeyPress={(e) => e.key === 'Enter' && handleAddNotice()}
                />
                <button 
                  onClick={handleAddNotice}
                  className="bg-ejn-gold text-ejn-dark p-2 rounded-lg font-bold hover:scale-105 transition-transform"
                >
                  <Icons.Plus className="w-4 h-4" />
                </button>
              </div>
            )}

            {loadingNotices ? (
               <div className="text-white/50 text-xs text-center py-4">Carregando avisos...</div>
            ) : notices.length > 0 ? (
              notices.map((notice, index) => (
                <div key={notice.id} className="flex gap-3 group/item animate-fadeIn">
                  <div className="w-5 h-5 bg-white/10 rounded-md flex items-center justify-center shrink-0 text-[10px] font-bold text-ejn-gold group-hover/item:bg-white/20 transition-colors">
                    {index + 1}
                  </div>
                  <p className="text-xs text-white/80 leading-relaxed font-medium flex-1">
                    {notice.content}
                  </p>
                  {isEditingNotices && (
                    <button 
                      onClick={() => handleDeleteNotice(notice.id)}
                      className="text-red-400 hover:text-red-300 opacity-60 hover:opacity-100"
                    >
                      <Icons.X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))
            ) : (
              <div className="text-white/40 text-xs italic text-center py-2">Nenhum aviso hoje.</div>
            )}
          </div>
        </div>
        
        {/* Elemento Decorativo */}
        <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-ejn-medium/20 rounded-full blur-2xl pointer-events-none"></div>
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