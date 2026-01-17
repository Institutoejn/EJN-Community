import React, { useEffect, useState } from 'react';
import { User } from '../types';
import Avatar from './Avatar';
import { storage } from '../services/storage';
import { supabase } from '../services/supabase';

interface RankingProps {
  user: User;
  onFollow?: (id: string) => void;
}

const Ranking: React.FC<RankingProps> = ({ user, onFollow }) => {
  // Inicializa instantaneamente com cache local
  const [leaderboard, setLeaderboard] = useState<any[]>(() => {
    const cached = storage.getLocalUsers();
    return cached.length > 0 ? cached.sort((a, b) => b.pontosTotais - a.pontosTotais).map(u => ({...u, isCurrent: u.id === user.id})) : [];
  });
  
  const [loading, setLoading] = useState(leaderboard.length === 0);

  // Função centralizada de atualização
  const updateRanking = async () => {
    try {
        const allUsers = await storage.getUsers(true); // Force refresh
        const ranked = allUsers
          .sort((a, b) => b.pontosTotais - a.pontosTotais) // Ordena por Coins/Pontos Totais (Critério de Negócios)
          .map(u => ({
            ...u,
            isCurrent: u.id === user.id
          }));
        
        setLeaderboard(ranked);
        setLoading(false);
    } catch (error) {
        console.error("Erro ao atualizar ranking:", error);
    }
  };

  useEffect(() => {
    // 1. Carga inicial
    updateRanking();

    // 2. REALTIME GLOBAL: Escuta alterações na tabela users
    // Se João ganhar 500 XP, Maria verá o ranking mudar instantaneamente
    const channel = supabase.channel('ranking-realtime')
        .on(
            'postgres_changes', 
            { event: 'UPDATE', schema: 'public', table: 'users' }, 
            (payload) => {
                // Otimização: Só atualiza se XP ou PontosTotais mudarem
                const oldU = payload.old as any;
                const newU = payload.new as any;
                if (oldU.xp !== newU.xp || oldU.pontos_totais !== newU.pontos_totais) {
                    updateRanking();
                }
            }
        )
        .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user.id]);

  const top3 = leaderboard.slice(0, 3);
  
  const handleFollowClick = (targetId: string) => {
    if (onFollow) onFollow(targetId);
  };

  if (loading && !leaderboard.length) {
     return (
        <div className="w-full h-64 flex items-center justify-center">
           <div className="w-8 h-8 border-4 border-ejn-gold/20 border-t-ejn-gold rounded-full animate-spin"></div>
        </div>
     );
  }

  return (
    <div className="w-full space-y-6 md:space-y-8 animate-fadeIn pb-10">
      <div className="bg-ejn-dark rounded-3xl p-8 md:p-10 text-center relative overflow-hidden shadow-2xl">
        <div className="relative z-10">
          <h2 className="text-2xl md:text-3xl font-black text-white mb-2 uppercase tracking-tight">Elite dos Negócios</h2>
          <p className="text-ejn-gold font-bold text-[10px] md:text-xs uppercase tracking-[0.3em] opacity-80">Ranking Global • Temporada 2025</p>
        </div>
        <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none">
          <div className="grid grid-cols-6 h-full">
            {[...Array(6)].map((_, i) => <div key={i} className="border-r border-white"></div>)}
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-center md:items-end justify-center gap-6 md:gap-6 pt-6 md:pt-10 px-2">
        {top3[1] && (
          <div className="flex flex-col items-center w-full max-w-[160px] md:flex-1 md:max-w-[120px] order-2 md:order-1">
            <div className="relative mb-4">
              <Avatar name={top3[1].name} bgColor={top3[1].avatarCor} url={top3[1].avatarUrl} size="lg" className="ring-4 ring-slate-300" />
              <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-slate-300 rounded-full flex items-center justify-center text-slate-700 font-bold shadow-lg">2</div>
            </div>
            <div className="bg-white rounded-t-2xl w-full pt-4 pb-2 px-2 text-center apple-shadow">
               <p className="text-[10px] font-bold text-apple-text truncate">{top3[1].name.split(' ')[0]}</p>
               <p className="text-[9px] font-black text-ejn-medium">{top3[1].pontosTotais.toLocaleString()} pts</p>
            </div>
            <div className="bg-slate-200 h-8 md:h-16 w-full rounded-b-lg"></div>
          </div>
        )}

        {top3[0] && (
          <div className="flex flex-col items-center w-full max-w-[180px] md:flex-1 md:max-w-[140px] order-1 md:order-2 md:-translate-y-4">
            <div className="relative mb-4">
              <Avatar name={top3[0].name} bgColor={top3[0].avatarCor} url={top3[0].avatarUrl} size="xl" className="ring-4 ring-ejn-gold shadow-2xl" />
              <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-ejn-gold rounded-full flex items-center justify-center text-ejn-dark font-black shadow-lg">1</div>
            </div>
            <div className="bg-white rounded-t-2xl w-full pt-6 pb-2 px-2 text-center apple-shadow border-x-2 border-t-2 border-ejn-gold/20">
               <p className="text-xs font-bold text-apple-text truncate">{top3[0].name.split(' ')[0]}</p>
               <p className="text-xs font-black text-ejn-gold">{top3[0].pontosTotais.toLocaleString()} pts</p>
            </div>
            <div className="bg-ejn-gold/20 h-12 md:h-24 w-full rounded-b-lg border-x-2 border-b-2 border-ejn-gold/10"></div>
          </div>
        )}

        {top3[2] && (
          <div className="flex flex-col items-center w-full max-w-[160px] md:flex-1 md:max-w-[120px] order-3">
            <div className="relative mb-4">
              <Avatar name={top3[2].name} bgColor={top3[2].avatarCor} url={top3[2].avatarUrl} size="lg" className="ring-4 ring-orange-400" />
              <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-orange-400 rounded-full flex items-center justify-center text-white font-bold shadow-lg">3</div>
            </div>
            <div className="bg-white rounded-t-2xl w-full pt-4 pb-2 px-2 text-center apple-shadow">
               <p className="text-[10px] font-bold text-apple-text truncate">{top3[2].name.split(' ')[0]}</p>
               <p className="text-[9px] font-black text-ejn-medium">{top3[2].pontosTotais.toLocaleString()} pts</p>
            </div>
            <div className="bg-orange-100 h-6 md:h-12 w-full rounded-b-lg"></div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-6 apple-shadow border-l-4 border-ejn-gold flex flex-col justify-between">
           <p className="text-[10px] font-black text-apple-tertiary uppercase tracking-widest">Sua XP (Reputação)</p>
           <h3 className="text-3xl font-black text-apple-text mt-2">{user.xp.toLocaleString()} <span className="text-xs text-apple-tertiary font-bold">XP</span></h3>
           <p className="text-[10px] text-ejn-medium font-bold mt-2">Próximo Nível: {user.xpProximoNivel.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-2xl p-6 apple-shadow border-l-4 border-ejn-medium flex flex-col justify-between">
           <p className="text-[10px] font-black text-apple-tertiary uppercase tracking-widest">Saldo na Carteira</p>
           <h3 className="text-3xl font-black text-ejn-medium mt-2">{user.pontosTotais.toLocaleString()} <span className="text-xs text-apple-tertiary font-bold">COINS</span></h3>
           <p className="text-[10px] text-apple-secondary font-bold mt-2">Disponíveis para resgate</p>
        </div>
        <div className="bg-white rounded-2xl p-6 apple-shadow border-l-4 border-ejn-dark flex flex-col justify-between">
           <p className="text-[10px] font-black text-apple-tertiary uppercase tracking-widest">Posição Atual</p>
           <h3 className="text-3xl font-black text-ejn-dark mt-2">#{leaderboard.findIndex(u => u.isCurrent) + 1}</h3>
           <p className="text-[10px] text-green-500 font-bold mt-2">↑ Ranking Global</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl apple-shadow overflow-hidden">
        <div className="px-6 py-4 bg-apple-bg/50 border-b border-apple-border flex justify-between items-center">
          <h3 className="text-sm font-black text-apple-text uppercase tracking-widest">Classificação Geral (Pontos)</h3>
          <span className="text-[10px] font-bold text-apple-tertiary uppercase">Tempo Real</span>
        </div>
        <div className="divide-y divide-apple-border">
          {leaderboard.map((u, i) => (
            <div 
              key={u.id} 
              className={`flex items-center gap-4 px-4 md:px-6 py-4 apple-transition ${u.isCurrent ? 'bg-ejn-gold/10' : 'hover:bg-apple-bg'}`}
            >
              <span className={`w-6 md:w-8 text-center font-black text-sm ${i < 3 ? 'text-ejn-gold' : 'text-apple-tertiary'}`}>
                {i + 1}
              </span>
              <Avatar name={u.name} bgColor={u.avatarCor} url={u.avatarUrl} size="sm" className="hidden md:flex" />
              <Avatar name={u.name} bgColor={u.avatarCor} url={u.avatarUrl} size="xs" className="md:hidden" />
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-bold truncate ${u.isCurrent ? 'text-ejn-dark' : 'text-apple-text'}`}>
                  {u.name} {u.isCurrent && <span className="ml-1 text-[9px] bg-ejn-dark text-white px-2 py-0.5 rounded-full uppercase">Você</span>}
                </p>
                <p className="text-[10px] text-apple-secondary font-medium uppercase tracking-widest">Nível {u.nivel} <span className="hidden sm:inline">• Aluno EJN</span></p>
              </div>
              <div className="flex items-center gap-4">
                {!u.isCurrent && (
                  <button 
                    onClick={() => handleFollowClick(u.id)}
                    disabled={user.followingIds?.includes(u.id)}
                    className={`hidden sm:block text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full border apple-transition ${user.followingIds?.includes(u.id) ? 'bg-apple-bg text-apple-tertiary border-transparent cursor-default' : 'bg-white text-ejn-medium border-ejn-medium hover:bg-ejn-medium hover:text-white'}`}
                  >
                    {user.followingIds?.includes(u.id) ? 'Seguindo' : 'Seguir'}
                  </button>
                )}
                <div className="text-right min-w-[60px]">
                  <p className="text-sm font-black text-ejn-medium">{u.pontosTotais.toLocaleString()}</p>
                  <p className="text-[9px] font-bold text-apple-tertiary uppercase tracking-tighter">Pontos</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Ranking;