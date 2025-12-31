
import React, { useState } from 'react';
import { User } from '../types';
import { Icons } from '../constants';

interface MissionsProps {
  user: User;
  onUpdateUser: (user: User) => void;
}

type Tab = 'TASKS' | 'REWARDS';

interface Reward {
  id: string;
  title: string;
  cost: number;
  desc: string;
  longDesc: string;
  icon: string;
  imageUrl: string;
}

const Missions: React.FC<MissionsProps> = ({ user, onUpdateUser }) => {
  const [activeTab, setActiveTab] = useState<Tab>('TASKS');
  const [claiming, setClaiming] = useState<string | null>(null);
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);

  const missions = [
    { id: 'm1', title: 'Primeiro Passo', desc: 'Complete seu perfil com bio e localização.', reward: 150, points: 50, icon: '👤', status: user.bio ? 'CONCLUÍDA' : 'PENDENTE' },
    { id: 'm2', title: 'Networking Ativo', desc: 'Faça sua primeira publicação no feed.', reward: 200, points: 100, icon: '📢', status: user.postsCount > 0 ? 'CONCLUÍDA' : 'PENDENTE' },
    { id: 'm3', title: 'Engajador', desc: 'Curta 5 publicações de outros colegas.', reward: 100, points: 30, icon: '❤️', status: 'PENDENTE' },
    { id: 'm4', title: 'Mestre do Pitch', desc: 'Receba 10 curtidas em uma única publicação.', reward: 500, points: 200, icon: '🔥', status: 'PENDENTE' },
  ];

  const rewards: Reward[] = [
    { 
      id: 'r1', 
      title: 'Mentoria Express', 
      cost: 1500, 
      desc: '15 minutos de call estratégica com um mentor EJN.', 
      longDesc: 'Uma oportunidade exclusiva de tirar suas dúvidas diretamente com um mentor experiente do Instituto. Ideal para destravar processos de vendas, validar ideias de produto ou receber feedback sobre seu pitch de negócios.',
      icon: '📞',
      imageUrl: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&q=80&w=400'
    },
    { 
      id: 'r2', 
      title: 'Badge de Destaque', 
      cost: 500, 
      desc: 'Badge exclusiva "Acelerado" no seu perfil.', 
      longDesc: 'Destaque-se na multidão! Esta badge dourada aparecerá ao lado do seu nome em todas as suas publicações e no seu perfil, sinalizando para toda a rede que você é um membro altamente ativo e engajado.',
      icon: '✨',
      imageUrl: 'https://images.unsplash.com/photo-1579546678181-9822b9518301?auto=format&fit=crop&q=80&w=400'
    },
    { 
      id: 'r3', 
      title: 'Análise de LinkedIn', 
      cost: 2500, 
      desc: 'Revisão completa do seu perfil profissional.', 
      longDesc: 'O LinkedIn é sua vitrine para o mundo. Nossa equipe de especialistas fará uma auditoria completa no seu perfil, sugerindo melhorias na sua headline, bio, experiência e estratégia de conteúdo para atrair mais investidores e parceiros.',
      icon: '👔',
      imageUrl: 'https://images.unsplash.com/photo-1611944212129-29977ae1398c?auto=format&fit=crop&q=80&w=400'
    },
    { 
      id: 'r4', 
      title: 'Ingresso Workshop', 
      cost: 4000, 
      desc: 'Acesso ao próximo workshop presencial da EJN.', 
      longDesc: 'Garanta seu lugar na primeira fila! Resgate este brinde para ganhar um ingresso VIP para o nosso próximo evento presencial. Networking de alto nível, palestras exclusivas e happy hour com grandes players do mercado.',
      icon: '🎟️',
      imageUrl: 'https://images.unsplash.com/photo-1540575861501-7ad0582373f2?auto=format&fit=crop&q=80&w=400'
    },
  ];

  const handleClaim = (mission: any) => {
    if (mission.status === 'CONCLUÍDA' || claiming) return;
    
    setClaiming(mission.id);
    setTimeout(() => {
      onUpdateUser({
        ...user,
        xp: user.xp + mission.reward,
        pontosTotais: user.pontosTotais + mission.points
      });
      setClaiming(null);
    }, 1000);
  };

  const handleRedeem = (reward: Reward) => {
    if (user.pontosTotais < reward.cost) {
      alert('Saldo insuficiente de EJN Coins.');
      return;
    }
    
    const confirmRedeem = confirm(`Deseja trocar ${reward.cost} EJN Coins por "${reward.title}"?`);
    if (confirmRedeem) {
      onUpdateUser({
        ...user,
        pontosTotais: user.pontosTotais - reward.cost
      });
      setSelectedReward(null);
      alert('Resgate solicitado com sucesso! Nossa equipe entrará em contato através do seu e-mail cadastrado.');
    }
  };

  return (
    <div className="w-full space-y-6 animate-fadeIn pb-10">
      {/* Modal de Detalhes do Brinde */}
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
                <span className="text-apple-tertiary text-xs font-bold uppercase tracking-widest">Brinde Exclusivo</span>
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
                  disabled={user.pontosTotais < selectedReward.cost}
                  className={`w-full md:flex-[2] py-3 rounded-xl font-bold apple-transition ${user.pontosTotais >= selectedReward.cost ? 'bg-ejn-dark text-white hover:bg-ejn-medium' : 'bg-apple-bg text-apple-tertiary cursor-not-allowed'}`}
                >
                  {user.pontosTotais >= selectedReward.cost ? 'Confirmar Resgate' : 'Saldo Insuficiente'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header com Saldo */}
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

      {/* Card de Regras */}
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

      {/* Tabs */}
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

      {/* Content */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {activeTab === 'TASKS' ? (
          missions.map(m => (
            <div key={m.id} className="bg-white rounded-2xl p-5 apple-shadow flex flex-col justify-between group hover:scale-[1.02] apple-transition border border-apple-border/50">
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 bg-apple-bg rounded-2xl flex items-center justify-center text-2xl shadow-inner group-hover:bg-ejn-gold/10 apple-transition">{m.icon}</div>
                <div className="text-right">
                  <span className={`text-[10px] font-black px-2 py-1 rounded-md uppercase ${m.status === 'CONCLUÍDA' ? 'bg-green-100 text-green-600' : 'bg-apple-bg text-apple-tertiary'}`}>
                    {m.status}
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
                    <p className="text-[10px] font-black text-ejn-medium">+{m.reward}</p>
                    <p className="text-[8px] font-bold text-apple-tertiary uppercase">XP</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] font-black text-ejn-gold">+{m.points}</p>
                    <p className="text-[8px] font-bold text-apple-tertiary uppercase text-[7px]">EJN Coins</p>
                  </div>
                </div>
                <button 
                  onClick={() => handleClaim(m)}
                  disabled={m.status === 'CONCLUÍDA' || claiming === m.id}
                  className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest apple-transition ${m.status === 'CONCLUÍDA' ? 'bg-apple-bg text-apple-tertiary cursor-not-allowed' : 'bg-ejn-dark text-white hover:bg-ejn-medium active:scale-95'}`}
                >
                  {claiming === m.id ? 'Resgatando...' : m.status === 'CONCLUÍDA' ? 'Coletado' : 'Resgatar'}
                </button>
              </div>
            </div>
          ))
        ) : (
          rewards.map(r => (
            <div key={r.id} className="bg-white rounded-[24px] overflow-hidden apple-shadow flex flex-col group border border-apple-border/50 hover:scale-[1.02] apple-transition">
              <div className="h-40 relative overflow-hidden">
                <img src={r.imageUrl} alt={r.title} className="w-full h-full object-cover group-hover:scale-110 apple-transition" />
                <div className="absolute top-3 right-3 bg-ejn-dark/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10">
                   <p className="text-xs font-black text-ejn-gold">{r.cost.toLocaleString()} <span className="text-[9px] font-bold text-white/60">EJN</span></p>
                </div>
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
                    disabled={user.pontosTotais < r.cost}
                    className={`flex-[2] py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-[0.2em] apple-transition ${user.pontosTotais >= r.cost ? 'bg-ejn-dark text-white hover:bg-ejn-gold hover:text-ejn-dark' : 'bg-apple-bg text-apple-tertiary cursor-not-allowed'}`}
                  >
                    {user.pontosTotais >= r.cost ? 'Resgatar' : 'Saldo Insuficiente'}
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer Motivacional */}
      <div className="bg-ejn-gold/5 rounded-3xl p-8 text-center border border-dashed border-ejn-gold/30">
        <p className="text-xs font-bold text-ejn-medium uppercase tracking-widest max-w-xs mx-auto leading-relaxed">
          Novos desafios e brindes são adicionados toda segunda-feira às <span className="text-ejn-dark">09:00h</span>.
        </p>
      </div>
    </div>
  );
};

export default Missions;
