import React, { useState, useEffect } from 'react';
import { User, Post, Mission, RewardItem, AdminSubView, AppSettings } from '../types';
import { storage } from '../services/storage';
import Avatar from './Avatar';
import { Icons } from '../constants';

interface AdminPanelProps {
  currentUser: User;
  onClose: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ currentUser, onClose }) => {
  const [subView, setSubView] = useState<AdminSubView | 'CLAIMS'>('DASHBOARD');
  const [users, setUsers] = useState<User[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [rewards, setRewards] = useState<RewardItem[]>([]);
  const [claims, setClaims] = useState<any[]>([]); 
  const [settings, setSettings] = useState<AppSettings>({
      platformName: 'Instituto EJN', 
      xpPerPost: 50, coinsPerPost: 10,
      xpPerComment: 10, coinsPerComment: 2,
      xpPerLikeReceived: 5, coinsPerLikeReceived: 1
  });

  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [userFilter, setUserFilter] = useState<'all' | 'active' | 'suspended' | 'gestor'>('all');
  const [loadingData, setLoadingData] = useState(true);
  
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showMissionModal, setShowMissionModal] = useState(false);
  const [editingMission, setEditingMission] = useState<Mission | null>(null);
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [editingReward, setEditingReward] = useState<RewardItem | null>(null);

  const [missionForm, setMissionForm] = useState<Partial<Mission>>({ isActive: true, type: 'daily', icon: '🎯' });
  const [rewardForm, setRewardForm] = useState<Partial<RewardItem>>({ category: 'Produto', stock: 10, icon: '🎁' });

  useEffect(() => { 
    loadData(); 
  }, []);

  const loadData = async () => {
    setLoadingData(true);
    try {
      // Force refresh true para garantir dados em tempo real
      const u = await storage.getUsers(true).catch(() => []);
      const p = await storage.getPosts(true).catch(() => []);
      const m = await storage.getMissions().catch(() => []);
      const r = await storage.getRewards().catch(() => []);
      const s = await storage.getSettings().catch(() => settings);
      const c = await storage.getClaims().catch(() => []); 

      setUsers(u); 
      setPosts(p); 
      setMissions(m); 
      setRewards(r); 
      setSettings(s);
      setClaims(c);
    } catch (e) {
      showToast("Erro na sincronização cloud", "error");
    } finally {
      setLoadingData(false);
    }
  };

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const wrapAction = async (id: string, action: () => Promise<void> | void) => {
    setLoadingAction(id);
    try {
      await action();
    } catch (e: any) {
      console.error("Erro na ação do Admin:", e);
      const errorMsg = e.message || "Ação negada pelo servidor";
      showToast(errorMsg.includes('foreign key') ? "Erro: Dados vinculados." : errorMsg, "error");
    } finally {
      setLoadingAction(null);
    }
  };

  const handleUpdateUser = async (u: User) => {
    await wrapAction(u.id, async () => {
        await storage.saveUser(u);
        setUsers(prev => prev.map(user => user.id === u.id ? u : user));
        setEditingUser(null);
        showToast(`Perfil de ${u.name} sincronizado.`);
    });
  };

  const handleDeleteUser = async (id: string) => {
    if (id === currentUser.id) { showToast("Erro: auto-exclusão.", "error"); return; }
    if (confirm('ATENÇÃO: Deseja excluir este membro permanentemente?')) {
        await wrapAction(id, async () => {
            await storage.deleteUser(id);
            setUsers(prev => prev.filter(u => u.id !== id));
            showToast('Membro removido.');
        });
    }
  };

  const handleDeletePost = async (id: string) => {
    if (confirm('Remover post?')) {
        await wrapAction(id, async () => {
            await storage.deletePost(id);
            setPosts(prev => prev.filter(p => p.id !== id));
            showToast('Post removido.');
        });
    }
  };

  const handleSaveMission = async () => {
    if (!missionForm.title) return;
    const mission: Mission = {
      id: editingMission?.id || '',
      title: missionForm.title!, desc: missionForm.desc || '',
      rewardXP: Number(missionForm.rewardXP || 0), rewardCoins: Number(missionForm.rewardCoins || 0),
      icon: missionForm.icon || '🎯', type: (missionForm.type as any) || 'daily', isActive: missionForm.isActive ?? true
    };
    await wrapAction('mission-save', async () => {
        await storage.saveMission(mission);
        await loadData();
        setShowMissionModal(false);
        showToast('Missão salva.');
    });
  };

  const handleDeleteMission = async (id: string) => {
      if(!confirm('Excluir missão?')) return;
      await wrapAction(id, async () => {
          await storage.deleteMission(id);
          setMissions(prev => prev.filter(m => m.id.toString() !== id.toString()));
          showToast('Missão removida.');
      });
  };

  const handleSaveReward = async () => {
    if (!rewardForm.title) return;
    const reward: RewardItem = {
      id: editingReward?.id || '',
      title: rewardForm.title!, desc: rewardForm.desc || '', longDesc: rewardForm.longDesc || rewardForm.desc || '',
      cost: Number(rewardForm.cost || 0), icon: rewardForm.icon || '🎁', imageUrl: rewardForm.imageUrl || '',
      stock: Number(rewardForm.stock || 0), category: (rewardForm.category as any) || 'Produto'
    };
    await wrapAction('reward-save', async () => {
        await storage.saveReward(reward);
        await loadData();
        setShowRewardModal(false);
        showToast('Estoque atualizado.');
    });
  };

  const handleDeleteReward = async (id: string) => {
      if(!confirm('Remover item?')) return;
      await wrapAction(id, async () => {
          await storage.deleteReward(id);
          setRewards(prev => prev.filter(r => r.id.toString() !== id.toString()));
          showToast('Item removido.');
      });
  };

  const handleSaveSettings = async () => {
      await wrapAction('settings-save', async () => {
          await storage.saveSettings(settings);
          showToast('Regras de negócio atualizadas com sucesso!');
      });
  };

  const handleOpenMissionModal = (mission?: Mission) => {
    if (mission) {
      setEditingMission(mission);
      setMissionForm({ ...mission });
    } else {
      setEditingMission(null);
      setMissionForm({ isActive: true, type: 'daily', icon: '🎯' });
    }
    setShowMissionModal(true);
  };

  const handleOpenRewardModal = (reward?: RewardItem) => {
    if (reward) {
      setEditingReward(reward);
      setRewardForm({ ...reward });
    } else {
      setEditingReward(null);
      setRewardForm({ category: 'Produto', stock: 10, icon: '🎁' });
    }
    setShowRewardModal(true);
  };

  const filteredUsers = users.filter(u => {
    if (userFilter === 'all') return true;
    if (userFilter === 'active') return u.status !== 'suspended';
    if (userFilter === 'suspended') return u.status === 'suspended';
    if (userFilter === 'gestor') return u.role === 'gestor';
    return true;
  });

  if (loadingData && !users.length) return (
    <div className="w-full h-[60vh] flex flex-col items-center justify-center animate-fadeIn">
        <div className="w-12 h-12 border-4 border-ejn-gold/20 border-t-ejn-gold rounded-full animate-spin mb-4"></div>
        <p className="font-bold text-apple-secondary animate-pulse uppercase tracking-widest text-[10px]">Sincronizando EJN Cloud...</p>
    </div>
  );

  return (
    <div className="w-full flex flex-col lg:flex-row gap-8 animate-fadeIn pb-24 relative">
      {toast && (
        <div className={`fixed top-24 right-8 z-[110] px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-slideIn ${toast.type === 'success' ? 'bg-ejn-dark text-white' : 'bg-red-600 text-white'}`}>
           <span className="text-[11px] font-bold uppercase tracking-widest leading-relaxed max-w-[250px]">{toast.message}</span>
        </div>
      )}

      <aside className="w-full lg:w-[240px] flex flex-col gap-2 shrink-0">
        <div className="bg-ejn-dark rounded-3xl p-6 text-white mb-4 shadow-xl">
           <p className="text-[10px] font-black uppercase tracking-widest text-ejn-gold mb-1">Painel do Gestor</p>
           <h2 className="text-lg font-bold">Instituto EJN</h2>
        </div>
        <div className="flex flex-row lg:flex-col overflow-x-auto lg:overflow-visible gap-2 pb-2 lg:pb-0">
          {[
            { id: 'DASHBOARD', label: 'Dashboard', icon: '📊' },
            { id: 'USERS', label: 'Usuários', icon: '👥' },
            { id: 'POSTS', label: 'Posts', icon: '📝' },
            { id: 'MISSIONS_MGMT', label: 'Missões', icon: '🎯' },
            { id: 'REWARDS_MGMT', label: 'Brindes', icon: '🎁' },
            { id: 'CLAIMS', label: 'Entregas', icon: '🚚' }, 
            { id: 'SETTINGS', label: 'Ajustes', icon: '⚙️' },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setSubView(item.id as any)}
              className={`flex-shrink-0 lg:w-full text-left px-5 py-3 rounded-2xl text-sm font-bold flex items-center gap-3 apple-transition ${subView === item.id ? 'bg-ejn-gold text-ejn-dark shadow-md' : 'bg-white text-apple-secondary hover:bg-apple-bg hover:text-apple-text'}`}
            >
              <span>{item.icon}</span> <span className="hidden md:inline">{item.label}</span>
            </button>
          ))}
        </div>
      </aside>

      <section className="flex-1 min-w-0">
        {subView === 'DASHBOARD' && (
          <div>
              <div className="flex justify-between items-center mb-6">
                 <h2 className="text-lg font-bold text-apple-text">Visão Geral em Tempo Real</h2>
                 <button onClick={loadData} className="text-xs font-bold bg-white px-4 py-2 rounded-full border hover:bg-apple-bg">
                    ↻ Atualizar Agora
                 </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Alunos Ativos', val: users.filter(u => u.status !== 'suspended').length, icon: '👥', color: 'text-blue-500' },
                  { label: 'Saques Pendentes', val: claims.filter(c => c.status === 'pending').length, icon: '📦', color: 'text-red-500' },
                  { label: 'Pontos Circulando', val: users.reduce((a, b) => a + (b.pontosTotais || 0), 0), icon: '🪙', color: 'text-ejn-gold' },
                  { label: 'Estoque Total', val: rewards.reduce((a,b) => a + b.stock, 0), icon: '🎁', color: 'text-ejn-medium' },
                ].map((c, i) => (
                  <div key={i} className="bg-white p-6 rounded-[32px] apple-shadow">
                    <h3 className={`text-2xl font-black ${c.color}`}>{c.val.toLocaleString()}</h3>
                    <p className="text-[10px] font-bold text-apple-secondary uppercase tracking-wider">{c.label}</p>
                  </div>
                ))}
              </div>
          </div>
        )}

        {/* LISTA DE REIVINDICAÇÕES */}
        {subView === 'CLAIMS' && (
           <div className="bg-white rounded-[32px] apple-shadow overflow-hidden">
               <div className="p-8 border-b border-apple-bg flex justify-between items-center">
                  <h3 className="font-black text-sm uppercase">Fila de Entregas</h3>
                  <button onClick={loadData} className="text-xs font-bold text-ejn-medium">↻ Atualizar</button>
               </div>
               <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[600px]">
                   <thead className="bg-apple-bg text-[10px] font-black uppercase text-apple-tertiary tracking-widest">
                       <tr>
                           <th className="px-6 py-3">Aluno</th>
                           <th className="px-6 py-3">Item Resgatado</th>
                           <th className="px-6 py-3">Valor</th>
                           <th className="px-6 py-3">Data</th>
                           <th className="px-6 py-3">Status</th>
                       </tr>
                   </thead>
                   <tbody className="divide-y divide-apple-bg">
                       {claims.map(c => (
                           <tr key={c.id} className="hover:bg-apple-bg/30">
                               <td className="px-6 py-4 font-bold text-sm text-apple-text">{c.users?.name || 'Desconhecido'}</td>
                               <td className="px-6 py-4 font-bold text-ejn-dark">{c.reward_title || 'Item Removido'}</td>
                               <td className="px-6 py-4 text-xs font-bold text-ejn-gold">{c.cost_paid} Coins</td>
                               <td className="px-6 py-4 text-xs text-apple-secondary">{new Date(c.created_at).toLocaleDateString()}</td>
                               <td className="px-6 py-4">
                                   <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${c.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                                       {c.status === 'pending' ? 'Pendente' : 'Entregue'}
                                   </span>
                               </td>
                           </tr>
                       ))}
                       {claims.length === 0 && (
                           <tr><td colSpan={5} className="p-8 text-center text-apple-secondary text-xs">Nenhum resgate registrado ainda.</td></tr>
                       )}
                   </tbody>
                </table>
               </div>
           </div>
        )}

        {subView === 'USERS' && (
          <div className="bg-white rounded-[32px] apple-shadow overflow-hidden">
             <div className="p-8 border-b border-apple-bg flex flex-col md:flex-row justify-between items-center gap-4">
                <h3 className="font-black text-sm uppercase">Base de Membros ({filteredUsers.length})</h3>
                <div className="flex flex-wrap gap-2 justify-center">
                    {[
                      { id: 'all', label: 'Todos' },
                      { id: 'active', label: 'Ativos' },
                      { id: 'suspended', label: 'Suspensos' },
                      { id: 'gestor', label: 'Gestores' }
                    ].map(f => (
                        <button key={f.id} onClick={() => setUserFilter(f.id as any)} className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider apple-transition ${userFilter === f.id ? 'bg-ejn-dark text-white shadow-md' : 'bg-apple-bg text-apple-secondary hover:bg-apple-border/20'}`}>
                            {f.label}
                        </button>
                    ))}
                </div>
             </div>
             <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[700px]">
                   <tbody className="divide-y divide-apple-bg">
                      {filteredUsers.map(u => (
                        <tr key={u.id} className={`hover:bg-apple-bg/30 apple-transition ${u.id === currentUser.id ? 'bg-ejn-gold/5' : ''}`}>
                           <td className="px-8 py-5 flex items-center gap-3">
                              <Avatar name={u.name} bgColor={u.avatarCor} size="sm" url={u.avatarUrl} />
                              <div>
                                <p className="text-sm font-bold flex items-center gap-2">
                                  {u.name}
                                  {u.id === currentUser.id && <span className="text-[8px] bg-ejn-dark text-white px-2 py-0.5 rounded-full">VOCÊ</span>}
                                </p>
                                <p className="text-[10px] text-apple-secondary">{u.email}</p>
                              </div>
                           </td>
                           <td className="px-8 py-5">
                              <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${u.status === 'suspended' ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-600'}`}>
                                 {u.status === 'suspended' ? 'Suspenso' : 'Ativo'}
                              </span>
                           </td>
                           <td className="px-8 py-5 text-right flex justify-end gap-2">
                              <button onClick={() => setEditingUser(u)} className="p-2.5 bg-apple-bg rounded-xl hover:bg-ejn-dark hover:text-white apple-transition shadow-sm" title="Editar Perfil">✏️</button>
                              <button 
                                onClick={() => handleDeleteUser(u.id)} 
                                disabled={loadingAction === u.id || u.id === currentUser.id}
                                className={`p-2.5 rounded-xl apple-transition shadow-sm ${u.id === currentUser.id ? 'bg-gray-100 text-gray-300 cursor-not-allowed' : 'bg-apple-bg hover:bg-red-600 hover:text-white'}`}
                              >
                                {loadingAction === u.id ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : '🗑️'}
                              </button>
                           </td>
                        </tr>
                      ))}
                   </tbody>
                </table>
             </div>
          </div>
        )}

        {subView === 'POSTS' && (
           <div className="bg-white rounded-[32px] apple-shadow overflow-hidden">
              <div className="p-8 border-b border-apple-bg"><h3 className="font-black text-sm uppercase">Moderação de Conteúdo</h3></div>
              <div className="divide-y divide-apple-bg">
                 {posts.map(p => (
                   <div key={p.id} className="p-6 flex gap-4 group hover:bg-apple-bg/20">
                      <div className="flex-1">
                         <p className="text-[10px] font-black text-ejn-medium uppercase mb-1">{p.userName}</p>
                         <p className="text-sm font-medium leading-relaxed">{p.content}</p>
                         <p className="text-[9px] text-apple-tertiary mt-1">{new Date(p.timestamp).toLocaleString()}</p>
                      </div>
                      <div className="flex gap-2">
                         <button 
                           onClick={() => handleDeletePost(p.id)} 
                           disabled={loadingAction === p.id}
                           className="p-2 bg-apple-bg hover:bg-red-500 hover:text-white rounded-xl apple-transition disabled:opacity-30"
                         >
                            {loadingAction === p.id ? '...' : '🗑️'}
                         </button>
                      </div>
                   </div>
                 ))}
              </div>
           </div>
        )}

        {subView === 'MISSIONS_MGMT' && (
           <div className="bg-white rounded-[32px] apple-shadow overflow-hidden">
               <div className="p-8 border-b border-apple-bg flex justify-between items-center">
                  <h3 className="font-black text-sm uppercase">Gestão de Missões</h3>
                  <button onClick={() => handleOpenMissionModal()} className="bg-ejn-dark text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest">+ Nova Missão</button>
               </div>
               <div className="divide-y divide-apple-bg">
                   {missions.map(m => (
                       <div key={m.id} className="p-6 flex items-center gap-4 hover:bg-apple-bg/30">
                           <div className="text-2xl">{m.icon}</div>
                           <div className="flex-1">
                              <p className="font-bold text-sm">{m.title}</p>
                              <p className="text-xs text-apple-secondary">{m.desc}</p>
                           </div>
                           <div className="flex gap-2">
                               <button onClick={() => handleOpenMissionModal(m)} className="p-2 hover:bg-apple-bg rounded-lg">✏️</button>
                               <button 
                                onClick={() => handleDeleteMission(m.id)} 
                                disabled={loadingAction === m.id}
                                className="p-2 hover:bg-red-50 text-red-500 rounded-lg disabled:opacity-30"
                               >
                                  {loadingAction === m.id ? '...' : '🗑️'}
                               </button>
                           </div>
                       </div>
                   ))}
               </div>
           </div>
        )}

        {subView === 'REWARDS_MGMT' && (
           <div className="bg-white rounded-[32px] apple-shadow overflow-hidden">
               <div className="p-8 border-b border-apple-bg flex justify-between items-center">
                  <h3 className="font-black text-sm uppercase">Estoque da Loja</h3>
                  <button onClick={() => handleOpenRewardModal()} className="bg-ejn-dark text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest">+ Novo Item</button>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
                   {rewards.map(r => (
                       <div key={r.id} className="border border-apple-border rounded-2xl p-4 flex flex-col gap-3 group animate-fadeIn">
                           <div className="h-32 bg-apple-bg rounded-xl overflow-hidden mb-2 relative">
                              <img 
                                src={r.imageUrl} 
                                alt={r.title} 
                                className="w-full h-full object-cover" 
                                onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=400'; }}
                              />
                              <div className="absolute top-2 right-2 bg-ejn-dark text-white text-[10px] font-bold px-2 py-1 rounded-md">
                                  Estoque: {r.stock}
                              </div>
                           </div>
                           <h4 className="font-bold text-sm truncate">{r.title}</h4>
                           <p className="text-[10px] text-apple-secondary font-bold uppercase">{r.cost} EJN Coins</p>
                           <div className="flex gap-2 mt-auto">
                               <button onClick={() => handleOpenRewardModal(r)} className="flex-1 bg-apple-bg py-2 rounded-lg text-[10px] font-black uppercase hover:bg-ejn-dark hover:text-white apple-transition">Editar</button>
                               <button 
                                onClick={() => handleDeleteReward(r.id)} 
                                disabled={loadingAction === r.id}
                                className="flex-1 bg-red-50 text-red-500 py-2 rounded-lg text-[10px] font-black uppercase hover:bg-red-500 hover:text-white apple-transition disabled:opacity-30"
                               >
                                  {loadingAction === r.id ? '...' : 'Excluir'}
                               </button>
                           </div>
                       </div>
                   ))}
               </div>
           </div>
        )}

        {subView === 'SETTINGS' && (
           <div className="bg-white rounded-[32px] apple-shadow p-8">
               <h3 className="font-black text-sm uppercase mb-6">Controle Geral de Pontuação</h3>
               <div className="bg-ejn-gold/5 border border-ejn-gold/20 rounded-xl p-4 mb-6">
                    <p className="text-xs text-ejn-dark font-medium leading-relaxed">
                        ⚠️ <strong>Atenção:</strong> Alterações nestas taxas entram em vigor <strong>instantaneamente</strong> para todas as novas ações realizadas na plataforma. O histórico de pontos já distribuídos não será alterado.
                    </p>
               </div>
               
               <div className="space-y-8">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2 col-span-full">
                            <label className="text-[10px] font-bold text-apple-secondary uppercase">Nome da Plataforma</label>
                            <input type="text" className="w-full h-12 px-4 bg-apple-bg rounded-xl font-bold" value={settings.platformName} onChange={e => setSettings({...settings, platformName: e.target.value})} />
                        </div>
                   </div>
                   
                   <div className="border-t border-apple-bg pt-6">
                        <h4 className="font-black text-xs uppercase text-apple-text mb-4">Recompensas por Publicação</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-apple-secondary uppercase">XP (Reputação)</label>
                                <input type="number" className="w-full h-12 px-4 bg-apple-bg rounded-xl font-bold" value={settings.xpPerPost} onChange={e => setSettings({...settings, xpPerPost: Number(e.target.value)})} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-apple-secondary uppercase">Moedas (Loja)</label>
                                <input type="number" className="w-full h-12 px-4 bg-apple-bg rounded-xl font-bold" value={settings.coinsPerPost} onChange={e => setSettings({...settings, coinsPerPost: Number(e.target.value)})} />
                            </div>
                        </div>
                   </div>

                   <div className="border-t border-apple-bg pt-6">
                        <h4 className="font-black text-xs uppercase text-apple-text mb-4">Recompensas por Comentário</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-apple-secondary uppercase">XP (Reputação)</label>
                                <input type="number" className="w-full h-12 px-4 bg-apple-bg rounded-xl font-bold" value={settings.xpPerComment} onChange={e => setSettings({...settings, xpPerComment: Number(e.target.value)})} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-apple-secondary uppercase">Moedas (Loja)</label>
                                <input type="number" className="w-full h-12 px-4 bg-apple-bg rounded-xl font-bold" value={settings.coinsPerComment} onChange={e => setSettings({...settings, coinsPerComment: Number(e.target.value)})} />
                            </div>
                        </div>
                   </div>

                   <div className="border-t border-apple-bg pt-6">
                        <h4 className="font-black text-xs uppercase text-apple-text mb-4">Recompensas por Receber Like</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-apple-secondary uppercase">XP (Reputação)</label>
                                <input type="number" className="w-full h-12 px-4 bg-apple-bg rounded-xl font-bold" value={settings.xpPerLikeReceived} onChange={e => setSettings({...settings, xpPerLikeReceived: Number(e.target.value)})} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-apple-secondary uppercase">Moedas (Loja)</label>
                                <input type="number" className="w-full h-12 px-4 bg-apple-bg rounded-xl font-bold" value={settings.coinsPerLikeReceived} onChange={e => setSettings({...settings, coinsPerLikeReceived: Number(e.target.value)})} />
                            </div>
                        </div>
                   </div>
               </div>

               <div className="mt-8 pt-8 border-t border-apple-bg">
                    <button onClick={handleSaveSettings} className="w-full bg-ejn-dark text-white px-8 py-4 rounded-xl font-bold uppercase tracking-widest hover:scale-[1.02] apple-transition shadow-lg">
                        Salvar Todas as Configurações
                    </button>
               </div>
           </div>
        )}
      </section>

      {/* MODAIS DE EDIÇÃO (Manter código existente) */}
      {editingUser && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-ejn-dark/40 backdrop-blur-md">
           <div className="bg-white w-full max-w-lg rounded-[40px] p-10 apple-shadow relative animate-fadeIn">
              <button onClick={() => setEditingUser(null)} className="absolute top-6 right-8 font-black text-apple-tertiary">✕</button>
              <h3 className="text-xl font-black mb-8 uppercase tracking-tight">Editar Membro</h3>
              <div className="space-y-4">
                 <div>
                    <label className="text-[10px] font-bold uppercase text-apple-tertiary">Nome Completo</label>
                    <input type="text" className="w-full p-4 bg-apple-bg rounded-2xl font-bold mt-1" value={editingUser.name} onChange={e => setEditingUser({...editingUser, name: e.target.value})} />
                 </div>
                 <div>
                    <label className="text-[10px] font-bold uppercase text-apple-tertiary">Acesso</label>
                    <select className="w-full p-4 bg-apple-bg rounded-2xl font-bold mt-1" value={editingUser.role} onChange={e => setEditingUser({...editingUser, role: e.target.value as any})}>
                       <option value="aluno">Aluno</option><option value="gestor">Gestor</option>
                    </select>
                 </div>
                 <button onClick={() => handleUpdateUser(editingUser)} className="w-full py-4 bg-ejn-dark text-white rounded-2xl font-bold uppercase tracking-widest shadow-xl hover:bg-ejn-medium">Confirmar Alterações</button>
              </div>
           </div>
        </div>
      )}

      {showMissionModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-ejn-dark/40 backdrop-blur-md">
            <div className="bg-white w-full max-w-lg rounded-[32px] p-8 shadow-2xl relative animate-fadeIn">
                <button onClick={() => setShowMissionModal(false)} className="absolute top-6 right-6 font-bold text-apple-tertiary">✕</button>
                <h3 className="font-black text-lg uppercase mb-6">{editingMission ? 'Editar Desafio' : 'Novo Desafio'}</h3>
                <div className="space-y-4">
                    <input type="text" placeholder="Título da Missão" className="w-full bg-apple-bg p-4 rounded-xl font-bold" value={missionForm.title || ''} onChange={e => setMissionForm({...missionForm, title: e.target.value})} />
                    <textarea placeholder="Descrição detalhada para o aluno..." className="w-full bg-apple-bg p-4 rounded-xl h-24 font-medium" value={missionForm.desc || ''} onChange={e => setMissionForm({...missionForm, desc: e.target.value})} />
                    <div className="grid grid-cols-2 gap-4">
                       <input type="number" placeholder="XP" className="bg-apple-bg p-3 rounded-xl font-bold" value={missionForm.rewardXP || ''} onChange={e => setMissionForm({...missionForm, rewardXP: Number(e.target.value)})} />
                       <input type="number" placeholder="EJN Coins" className="bg-apple-bg p-3 rounded-xl font-bold" value={missionForm.rewardCoins || ''} onChange={e => setMissionForm({...missionForm, rewardCoins: Number(e.target.value)})} />
                    </div>
                    <button onClick={handleSaveMission} className="w-full bg-ejn-dark text-white py-4 rounded-xl font-bold uppercase tracking-widest hover:bg-ejn-medium">Publicar Missão</button>
                </div>
            </div>
        </div>
      )}

      {showRewardModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-ejn-dark/40 backdrop-blur-md">
            <div className="bg-white w-full max-w-lg rounded-[32px] p-8 shadow-2xl relative animate-fadeIn">
                <button onClick={() => setShowRewardModal(false)} className="absolute top-6 right-6 font-bold text-apple-tertiary">✕</button>
                <h3 className="font-black text-lg uppercase mb-6">{editingReward ? 'Ajustar Brinde' : 'Inserir no Estoque'}</h3>
                <div className="space-y-4">
                    <input type="text" placeholder="Nome do Produto/Serviço" className="w-full bg-apple-bg p-4 rounded-xl font-bold" value={rewardForm.title || ''} onChange={e => setRewardForm({...rewardForm, title: e.target.value})} />
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase text-apple-tertiary">Preço (Coins)</label>
                            <input type="number" className="w-full bg-apple-bg p-4 rounded-xl font-bold" value={rewardForm.cost || ''} onChange={e => setRewardForm({...rewardForm, cost: Number(e.target.value)})} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase text-apple-tertiary">Estoque Inicial</label>
                            <input type="number" className="w-full bg-apple-bg p-4 rounded-xl font-bold" value={rewardForm.stock || ''} onChange={e => setRewardForm({...rewardForm, stock: Number(e.target.value)})} />
                        </div>
                    </div>
                    <input type="text" placeholder="URL da Imagem" className="w-full bg-apple-bg p-4 rounded-xl text-xs font-medium" value={rewardForm.imageUrl || ''} onChange={e => setRewardForm({...rewardForm, imageUrl: e.target.value})} />
                    <button onClick={handleSaveReward} className="w-full bg-ejn-dark text-white py-4 rounded-xl font-bold uppercase tracking-widest hover:bg-ejn-gold hover:text-ejn-dark">Salvar Item</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;