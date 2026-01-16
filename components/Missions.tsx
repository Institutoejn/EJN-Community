import React, { useState, useEffect } from 'react';
import { User, Mission, RewardItem } from '../types';
import { storage } from '../services/storage';

interface MissionsProps {
  user: User;
  onUpdateUser: (user: User) => void;
}

type Tab = 'TASKS' | 'REWARDS';

const Missions: React.FC<MissionsProps> = ({ user, onUpdateUser }) => {
  const [activeTab, setActiveTab] = useState<Tab>('TASKS');
  const [claiming, setClaiming] = useState<string | null>(null);
  const [selectedReward, setSelectedReward] = useState<RewardItem | null>(null);
  
  // Inicialização síncrona com cache
  const [missions, setMissions] = useState<Mission[]>(() => storage.getLocalMissions());
  const [rewards, setRewards] = useState<RewardItem[]>(() => storage.getLocalRewards());
  const [loading, setLoading] = useState(missions.length === 0 && rewards.length === 0);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [m, r] = await Promise.all([
          storage.getMissions(),
          storage.getRewards()
        ]);
        
        // Só atualiza se houver novidade
        setMissions(m);
        setRewards(r);
      } catch (error) {
        console.error("Erro ao carregar dados de missões:", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const handleClaim = (mission: Mission) => {
    if (claiming) return;
    
    setClaiming(mission.id);
    setTimeout(async () => {
      const updatedUser = {
        ...user,
        xp: user.xp + mission.rewardXP,
        pontosTotais: user.pontosTotais + mission.rewardCoins
      };
      
      onUpdateUser(updatedUser);
      await storage.saveUser(updatedUser);
      setClaiming(null);
    }, 1000);
  };

  const handleRedeem = async (reward: RewardItem) => {
    if (user.pontosTotais < reward.cost) {
      alert('Saldo insuficiente de EJN Coins.');
      return;
    }
    
    if (reward.stock <= 0) {
      alert('Ops! Este item acabou de esgotar.');
      return;
    }

    const confirmRedeem = confirm(`Deseja trocar ${reward.cost} EJN Coins por "${reward.title}"?`);
    if (confirmRedeem) {
      setClaiming(reward.id);
      
      try {
          // Chama transação segura do banco (RPC)
          const result = await storage.claimReward(reward.id, user.id);
          
          if (result.success) {
              const updatedUser = {
                ...user,
                pontosTotais: user.pontosTotais - reward.cost
              };
              
              onUpdateUser(updatedUser);
              // Atualiza lista localmente para refletir estoque
              setRewards(prev => prev.map(r => r.id === reward.id ? {...r, stock: r.stock - 1} : r));
              setSelectedReward(null);
              alert('Resgate realizado com sucesso! O item foi para a lista de entregas do administrador.');
          } else {
              alert(`Falha no resgate: ${result.message}`);
          }
      } catch (e) {
          alert('Erro de conexão ao processar resgate.');
      } finally {
          setClaiming(null);
      }
    }
  };

  if (loading) {
    return <div className="p-10 text-center text-apple-tertiary text-xs font-bold uppercase tracking-widest">Carregando desafios...</div>;
  }

  return (
    <div className="w-full space-y-6 animate-fadeIn pb-10">
      {selectedReward && (
        <div className="fixed inset-0 bg-ejn-dark/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-[32px] overflow-hidden apple-shadow animate-fadeIn my-auto">
            <div className="h-48 relative">
              <img src={selectedReward.imageUrl} alt={selectedReward.title} className="w-full h-full object-cover" />
              <button 
                onClick={() => setSelectedReward(null)}
                className="absolute top-4 right-4 bg-black/50 text-white w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/70 apple-transition"
              >
                ✕
              </button>
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-6">
                <h3 className="text-white text-2xl font-bold">{selectedReward.title}</h3>
              </div>
            </div>
            <div className="p-6 md:p-8 space-y-4">
              <div className="flex items-center gap-2">
                <span className="bg-ejn-gold text-ejn-dark px-3 py-1 rounded-full text-xs font-black">
                  {selectedReward.cost.toLocaleString()} EJN Coins
                </span>
                <span className={`${selectedReward.stock > 0 ? 'text-green-600' : 'text-red-500'} text-xs font-bold uppercase tracking-widest`}>
                    {selectedReward.stock > 0 ? `${selectedReward.stock} disponíveis` : 'ESGOTADO'}
                </span>
              </div>
              <p className="text-apple-text font-medium leading-relaxed text-sm md:text-base">
                {selectedReward.longDesc}
              </p>
              <div className="pt-4 flex flex-col md:flex-row gap-4">
                <button 
                  onClick={() => setSelectedReward(null)}
                  className="w-full md:flex-1 py-3 bg-apple-bg text-apple-text font-bold rounded-xl hover:bg-apple-border/20 apple-transition"
                >
                  Voltar
                </button>
                <button 
                  onClick={() => handleRedeem(selectedReward)}
                  disabled={user.pontosTotais < selectedReward.cost || selectedReward.stock <= 0 || claiming === selectedReward.id}
                  className={`w-full md:flex-[2] py-3 rounded-xl font-bold apple-transition ${user.pontosTotais >= selectedReward.cost && selectedReward.stock > 0 ? 'bg-ejn-dark text-white hover:bg-ejn-medium' : 'bg-apple-bg text-apple-tertiary cursor-not-allowed'}`}
                >
                  {claiming === selectedReward.id ? 'Processando...' : 
                   selectedReward.stock <= 0 ? 'Esgotado' :
                   user.pontosTotais >= selectedReward.cost ? 'Confirmar Resgate' : 'Saldo Insuficiente'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-ejn-dark rounded-3xl p-6 md:p-8 text-white flex flex-col md:flex-row justify-between items-center gap-4 shadow-xl text-center md:text-left">
        <div>
          <h2 className="text-xl md:text-2xl font-bold">Central de Desafios</h2>
          <p className="text-white/60 text-xs font-medium uppercase tracking-widest mt-1">Evolua seu negócio e ganhe prêmios</p>
        </div>
        <div className="bg-white/10 backdrop-blur-md rounded-2xl px-6 py-3 border border-white/10 flex items-center gap-4">
          <div className="text-right">
            <p className="text-[10px] font-black text-ejn-gold uppercase tracking-widest">Saldo Atual</p>
            <p className="text-xl font-black">{user.pontosTotais.toLocaleString()} <span className="text-[10px] text-ejn-gold font-bold">EJN</span></p>
          </div>
          <div className="w-10 h-10 bg-ejn-gold rounded-full flex items-center justify-center text-ejn-dark text-xl font-black shadow-lg">Z</div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-4 md:p-6 apple-shadow border-l-4 border-ejn-medium flex items-start gap-4">
        <div className="w-10 h-10 bg-ejn-medium/10 rounded-xl flex items-center justify-center shrink-0">
          <svg className="w-6 h-6 text-ejn-medium" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <h4 className="font-bold text-apple-text text-sm">Como pontuar?</h4>
          <p className="text-xs text-apple-secondary mt-1 leading-relaxed">
            Cada <strong>Post</strong> gera 50 XP, <strong>Comentários</strong> geram 5 XP. Complete as missões abaixo para ganhar bônus massivos de XP e <strong>EJN Coins</strong> para trocar por brindes exclusivos.
          </p>
        </div>
      </div>

      <div className="flex bg-white rounded-2xl p-1 apple-shadow">
        <button 
          onClick={() => setActiveTab('TASKS')}
          className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest rounded-xl apple-transition ${activeTab === 'TASKS' ? 'bg-ejn-gold text-ejn-dark' : 'text-apple-secondary hover:bg-apple-bg'}`}
        >
          Missões Ativas
        </button>
        <button 
          onClick={() => setActiveTab('REWARDS')}
          className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest rounded-xl apple-transition ${activeTab === 'REWARDS' ? 'bg-ejn-gold text-ejn-dark' : 'text-apple-secondary hover:bg-apple-bg'}`}
        >
          Loja de Brindes
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {activeTab === 'TASKS' ? (
          missions.map(m => (
            <div key={m.id} className="bg-white rounded-2xl p-5 apple-shadow flex flex-col justify-between group hover:scale-[1.02] apple-transition border border-apple-border/50">
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 bg-apple-bg rounded-2xl flex items-center justify-center text-2xl shadow-inner group-hover:bg-ejn-gold/10 apple-transition">{m.icon}</div>
                <div className="text-right">
                  <span className={`text-[10px] font-black px-2 py-1 rounded-md uppercase bg-apple-bg text-apple-tertiary`}>
                    PENDENTE
                  </span>
                </div>
              </div>
              <div>
                <h4 className="font-bold text-apple-text text-sm mb-1">{m.title}</h4>
                <p className="text-[11px] text-apple-secondary font-medium leading-snug mb-4">{m.desc}</p>
              </div>
              <div className="flex items-center justify-between mt-auto pt-4 border-t border-apple-bg">
                <div className="flex gap-3">
                  <div className="text-center">
                    <p className="text-[10px] font-black text-ejn-medium">+{m.rewardXP}</p>
                    <p className="text-[8px] font-bold text-apple-tertiary uppercase">XP</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] font-black text-ejn-gold">+{m.rewardCoins}</p>
                    <p className="text-[8px] font-bold text-apple-tertiary uppercase text-[7px]">EJN Coins</p>
                  </div>
                </div>
                <button 
                  onClick={() => handleClaim(m)}
                  disabled={claiming === m.id}
                  className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest apple-transition bg-ejn-dark text-white hover:bg-ejn-medium active:scale-95`}
                >
                  {claiming === m.id ? 'Resgatando...' : 'Resgatar'}
                </button>
              </div>
            </div>
          ))
        ) : (
          rewards.map(r => (
            <div key={r.id} className={`bg-white rounded-[24px] overflow-hidden apple-shadow flex flex-col group border border-apple-border/50 transition-all ${r.stock <= 0 ? 'opacity-60 grayscale' : 'hover:scale-[1.02]'}`}>
              <div className="h-40 relative overflow-hidden">
                <img src={r.imageUrl} alt={r.title} className="w-full h-full object-cover group-hover:scale-110 apple-transition" />
                <div className="absolute top-3 right-3 bg-ejn-dark/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10">
                   <p className="text-xs font-black text-ejn-gold">{r.cost.toLocaleString()} <span className="text-[9px] font-bold text-white/60">EJN</span></p>
                </div>
                {r.stock <= 0 && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <span className="bg-red-600 text-white font-black uppercase px-4 py-2 transform -rotate-12 rounded-lg border-2 border-white">Esgotado</span>
                    </div>
                )}
              </div>
              
              <div className="p-5 flex flex-col flex-1">
                <h4 className="font-bold text-apple-text text-sm mb-1">{r.title}</h4>
                <p className="text-[11px] text-apple-secondary font-medium leading-snug mb-6 flex-1">{r.desc}</p>
                
                <div className="flex gap-2">
                  <button 
                    onClick={() => setSelectedReward(r)}
                    className="flex-1 py-2.5 bg-apple-bg text-apple-text rounded-xl font-bold text-[10px] uppercase tracking-wider hover:bg-apple-border/20 apple-transition"
                  >
                    Detalhes
                  </button>
                  <button 
                    onClick={() => handleRedeem(r)}
                    disabled={user.pontosTotais < r.cost || r.stock <= 0}
                    className={`flex-[2] py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-[0.2em] apple-transition ${user.pontosTotais >= r.cost && r.stock > 0 ? 'bg-ejn-dark text-white hover:bg-ejn-gold hover:text-ejn-dark' : 'bg-apple-bg text-apple-tertiary cursor-not-allowed'}`}
                  >
                    {r.stock <= 0 ? 'Esgotado' : user.pontosTotais >= r.cost ? 'Resgatar' : 'Saldo Baixo'}
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="bg-ejn-gold/5 rounded-3xl p-8 text-center border border-dashed border-ejn-gold/30">
        <p className="text-xs font-bold text-ejn-medium uppercase tracking-widest max-w-xs mx-auto leading-relaxed">
          Novos desafios e brindes são adicionados toda segunda-feira às <span className="text-ejn-dark">09:00h</span>.
        </p>
      </div>
    </div>
  );
};

export default Missions;