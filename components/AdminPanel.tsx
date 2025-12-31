
import React, { useState, useEffect } from 'react';
import { User, Post, Mission, RewardItem, AdminSubView, AppSettings } from '../types';
import { storage } from '../services/storage';
import Avatar from './Avatar';

interface AdminPanelProps {
  currentUser: User;
  onClose: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ currentUser, onClose }) => {
  const [subView, setSubView] = useState<AdminSubView>('DASHBOARD');
  const [users, setUsers] = useState<User[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [rewards, setRewards] = useState<RewardItem[]>([]);
  const [settings, setSettings] = useState<AppSettings>(storage.getSettings());

  // UI States
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [userFilter, setUserFilter] = useState<'all' | 'active' | 'suspended' | 'gestor'>('all');
  
  // Modal States
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showMissionModal, setShowMissionModal] = useState(false);
  const [editingMission, setEditingMission] = useState<Mission | null>(null);
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [editingReward, setEditingReward] = useState<RewardItem | null>(null);

  // Form States
  const [missionForm, setMissionForm] = useState<Partial<Mission>>({ isActive: true, type: 'daily', icon: '🎯' });
  const [rewardForm, setRewardForm] = useState<Partial<RewardItem>>({ category: 'Produto', stock: 10, icon: '🎁' });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setUsers(storage.getUsers());
    setPosts(storage.getPosts());
    setMissions(storage.getMissions());
    setRewards(storage.getRewards());
  };

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const wrapAction = async (id: string, action: () => void) => {
    setLoading(id);
    await new Promise(r => setTimeout(r, 600)); // Simular latência
    action();
    setLoading(null);
  };

  // HANDLERS USUÁRIOS
  const updateUser = (u: User) => {
    const updated = users.map(user => user.id === u.id ? u : user);
    setUsers(updated);
    storage.updateUsersList(updated);
    setEditingUser(null);
    showToast(`Membro ${u.name} atualizado.`);
  };

  const deleteUser = (id: string) => {
    if (confirm('Tem certeza que deseja excluir permanentemente este usuário?')) {
      const updated = users.filter(u => u.id !== id);
      setUsers(updated);
      storage.updateUsersList(updated);
      showToast('Usuário removido do sistema.');
    }
  };

  // HANDLERS MISSÕES
  const handleSaveMission = () => {
    if (!missionForm.title || !missionForm.desc) return;
    const mission: Mission = {
      id: editingMission?.id || 'm' + Date.now(),
      title: missionForm.title,
      desc: missionForm.desc,
      rewardXP: Number(missionForm.rewardXP || 0),
      rewardCoins: Number(missionForm.rewardCoins || 0),
      icon: missionForm.icon || '🎯',
      type: missionForm.type as any,
      isActive: true
    };
    
    let updated;
    if (editingMission) {
      updated = missions.map(m => m.id === editingMission.id ? mission : m);
    } else {
      updated = [...missions, mission];
    }
    
    setMissions(updated);
    storage.saveMissions(updated);
    setShowMissionModal(false);
    setEditingMission(null);
    setMissionForm({ isActive: true, type: 'daily', icon: '🎯' });
    showToast('Missão salva com sucesso!');
  };

  // HANDLERS BRINDES
  const handleSaveReward = () => {
    if (!rewardForm.title || !rewardForm.desc) return;
    const reward: RewardItem = {
      id: editingReward?.id || 'r' + Date.now(),
      title: rewardForm.title,
      desc: rewardForm.desc,
      longDesc: rewardForm.longDesc || rewardForm.desc,
      cost: Number(rewardForm.cost || 0),
      icon: rewardForm.icon || '🎁',
      imageUrl: rewardForm.imageUrl || 'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=400',
      stock: Number(rewardForm.stock || 0),
      category: rewardForm.category as any
    };
    
    let updated;
    if (editingReward) {
      updated = rewards.map(r => r.id === editingReward.id ? reward : r);
    } else {
      updated = [...rewards, reward];
    }
    
    setRewards(updated);
    storage.saveRewards(updated);
    setShowRewardModal(false);
    setEditingReward(null);
    setRewardForm({ category: 'Produto', stock: 10, icon: '🎁' });
    showToast('Brinde atualizado na loja.');
  };

  // FILTROS
  const filteredUsers = users.filter(u => {
    if (userFilter === 'all') return true;
    if (userFilter === 'active') return u.status !== 'suspended';
    if (userFilter === 'suspended') return u.status === 'suspended';
    if (userFilter === 'gestor') return u.role === 'gestor';
    return true;
  });

  return (
    <div className="w-full flex flex-col lg:flex-row gap-8 animate-fadeIn pb-24 relative">
      
      {/* Toast Feedback */}
      {toast && (
        <div className={`fixed top-20 right-8 z-[100] px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-slideIn ${toast.type === 'success' ? 'bg-ejn-dark text-white' : 'bg-red-500 text-white'}`}>
           <div className={`w-2 h-2 rounded-full ${toast.type === 'success' ? 'bg-ejn-gold' : 'bg-white animate-pulse'}`}></div>
           <span className="text-xs font-bold uppercase tracking-widest">{toast.message}</span>
        </div>
      )}

      {/* Sidebar Admin */}
      <aside className="w-full lg:w-[240px] flex flex-col gap-2 shrink-0">
        <div className="bg-ejn-dark rounded-3xl p-6 text-white mb-4 shadow-xl">
           <p className="text-[10px] font-black uppercase tracking-widest text-ejn-gold mb-1">Administração</p>
           <h2 className="text-lg font-bold">Escola Jovens</h2>
        </div>
        
        <div className="flex flex-row lg:flex-col overflow-x-auto lg:overflow-visible gap-2 pb-2 lg:pb-0">
          {[
            { id: 'DASHBOARD', label: 'Dashboard', icon: '📊' },
            { id: 'USERS', label: 'Usuários', icon: '👥' },
            { id: 'POSTS', label: 'Posts', icon: '📝' },
            { id: 'MISSIONS_MGMT', label: 'Missões', icon: '🎯' },
            { id: 'REWARDS_MGMT', label: 'Brindes', icon: '🎁' },
            { id: 'SETTINGS', label: 'Ajustes', icon: '⚙️' },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setSubView(item.id as AdminSubView)}
              className={`flex-shrink-0 lg:w-full text-left px-5 py-3 rounded-2xl text-sm font-bold flex items-center gap-3 apple-transition ${subView === item.id ? 'bg-ejn-gold text-ejn-dark shadow-md' : 'bg-white text-apple-secondary hover:bg-apple-bg hover:text-apple-text'}`}
            >
              <span className="text-lg">{item.icon}</span> <span className="hidden md:inline">{item.label}</span>
            </button>
          ))}
        </div>
      </aside>

      {/* Main Area */}
      <section className="flex-1 min-w-0">
        
        {/* VIEW: DASHBOARD */}
        {subView === 'DASHBOARD' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Total de Alunos', val: users.length, icon: '👥', color: 'text-blue-500' },
                { label: 'Novos Posts', val: posts.length, icon: '🔥', color: 'text-orange-500' },
                { label: 'Economia Interna', val: users.reduce((a, b) => a + b.pontosTotais, 0).toLocaleString(), icon: '🪙', color: 'text-ejn-gold' },
                { label: 'Missões Ativas', val: missions.length, icon: '🎯', color: 'text-ejn-medium' },
              ].map((c, i) => (
                <div key={i} className="bg-white p-6 rounded-[32px] apple-shadow flex flex-col justify-center">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-2xl">{c.icon}</span>
                  </div>
                  <h3 className={`text-2xl font-black ${c.color}`}>{c.val}</h3>
                  <p className="text-[10px] font-bold text-apple-secondary uppercase tracking-wider">{c.label}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
               <div className="lg:col-span-2 bg-white rounded-[32px] p-8 apple-shadow">
                  <div className="flex justify-between items-center mb-6">
                     <h3 className="font-black text-sm uppercase text-apple-text">Crescimento (7 dias)</h3>
                     <span className="text-[10px] font-bold text-green-500 bg-green-50 px-2 py-1 rounded-full">+12%</span>
                  </div>
                  <div className="h-48 flex items-end justify-between gap-3 px-2">
                     {[34, 56, 45, 89, 67, 95, 120].map((h, i) => (
                       <div key={i} className="flex-1 bg-ejn-dark/5 rounded-t-xl relative group hover:bg-ejn-gold/20 apple-transition" style={{ height: `${(h/120)*100}%` }}>
                          <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 bg-ejn-dark text-white text-[8px] px-1.5 py-0.5 rounded font-black apple-transition">+{h}</div>
                       </div>
                     ))}
                  </div>
                  <div className="flex justify-between text-[9px] font-black text-apple-tertiary uppercase mt-4">
                     <span>Seg</span><span>Ter</span><span>Qua</span><span>Qui</span><span>Sex</span><span>Sab</span><span>Dom</span>
                  </div>
               </div>

               <div className="bg-white rounded-[32px] p-8 apple-shadow flex flex-col gap-4">
                  <h3 className="font-black text-sm uppercase text-apple-text mb-2">Ações Rápidas</h3>
                  <button onClick={() => setShowMissionModal(true)} className="w-full py-3 bg-apple-bg hover:bg-ejn-gold hover:text-ejn-dark rounded-2xl text-xs font-black uppercase tracking-widest apple-transition flex items-center justify-center gap-2">🎯 Criar Missão</button>
                  <button onClick={() => setShowRewardModal(true)} className="w-full py-3 bg-apple-bg hover:bg-ejn-medium hover:text-white rounded-2xl text-xs font-black uppercase tracking-widest apple-transition flex items-center justify-center gap-2">🎁 Novo Brinde</button>
                  <button onClick={() => showToast('Funcionalidade em desenvolvimento: Anúncios')} className="w-full py-3 bg-apple-bg hover:bg-ejn-dark hover:text-white rounded-2xl text-xs font-black uppercase tracking-widest apple-transition flex items-center justify-center gap-2">📢 Novo Anúncio</button>
               </div>
            </div>

            <div className="bg-white rounded-[32px] p-8 apple-shadow">
               <h3 className="font-black text-sm uppercase text-apple-text mb-6">Atividade Recente</h3>
               <div className="space-y-4">
                  {posts.slice(0, 5).map(p => (
                    <div key={p.id} className="flex items-center gap-4 py-3 border-b border-apple-bg last:border-0">
                       <Avatar name={p.userName} bgColor="bg-gray-200" size="xs" />
                       <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-bold text-apple-text truncate"><span className="text-ejn-medium">{p.userName}</span> publicou um novo insight.</p>
                          <p className="text-[9px] text-apple-tertiary uppercase">{new Date(p.timestamp).toLocaleTimeString()}</p>
                       </div>
                       <div className="text-[10px] font-black text-ejn-gold">+50 XP</div>
                    </div>
                  ))}
               </div>
            </div>
          </div>
        )}

        {/* VIEW: USUÁRIOS */}
        {subView === 'USERS' && (
          <div className="bg-white rounded-[32px] apple-shadow overflow-hidden">
             <div className="p-8 border-b border-apple-bg flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                   <h3 className="font-black text-sm uppercase text-apple-text">Gestão de Alunos</h3>
                   <p className="text-[10px] text-apple-secondary font-bold uppercase tracking-widest mt-1">{users.length} membros</p>
                </div>
                <div className="flex gap-2 bg-apple-bg p-1 rounded-2xl overflow-x-auto max-w-full">
                   {['all', 'active', 'suspended', 'gestor'].map(f => (
                     <button 
                       key={f} 
                       onClick={() => setUserFilter(f as any)}
                       className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest apple-transition whitespace-nowrap ${userFilter === f ? 'bg-white text-ejn-dark shadow-sm' : 'text-apple-tertiary hover:text-apple-text'}`}
                     >
                       {f === 'all' ? 'Todos' : f === 'active' ? 'Ativos' : f === 'suspended' ? 'Inativos' : 'Gestores'}
                     </button>
                   ))}
                </div>
             </div>

             <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[800px]">
                   <thead>
                      <tr className="bg-apple-bg/50 text-[10px] font-black text-apple-tertiary uppercase tracking-[0.2em]">
                         <th className="px-8 py-4">Membro</th>
                         <th className="px-8 py-4">Status</th>
                         <th className="px-8 py-4">Gamificação</th>
                         <th className="px-8 py-4 text-right">Ações</th>
                   </tr>
                   </thead>
                   <tbody className="divide-y divide-apple-bg">
                      {filteredUsers.map(u => (
                        <tr key={u.id} className="hover:bg-apple-bg/30 apple-transition group">
                           <td className="px-8 py-5">
                              <div className="flex items-center gap-3">
                                 <Avatar name={u.name} bgColor={u.avatarCor} size="sm" url={u.avatarUrl} />
                                 <div>
                                    <p className="text-sm font-bold text-apple-text">{u.name}</p>
                                    <p className="text-[10px] text-apple-secondary font-medium">{u.email}</p>
                                 </div>
                              </div>
                           </td>
                           <td className="px-8 py-5">
                              <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${u.status === 'suspended' ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-600'}`}>
                                 {u.status === 'suspended' ? 'Suspenso' : 'Ativo'}
                              </span>
                           </td>
                           <td className="px-8 py-5">
                              <div className="flex items-center gap-4">
                                 <div>
                                    <p className="text-xs font-black text-ejn-medium">{u.xp} XP</p>
                                    <p className="text-[9px] font-bold text-apple-tertiary uppercase">Nível {u.nivel}</p>
                                 </div>
                                 <div>
                                    <p className="text-xs font-black text-ejn-gold">{u.pontosTotais} EJN</p>
                                    <p className="text-[9px] font-bold text-apple-tertiary uppercase">Coins</p>
                                 </div>
                              </div>
                           </td>
                           <td className="px-8 py-5 text-right">
                              <div className="flex justify-end gap-2">
                                 <button onClick={() => setEditingUser(u)} className="p-2 bg-apple-bg rounded-xl hover:bg-ejn-dark hover:text-white apple-transition" title="Editar">✏️</button>
                                 <button 
                                    onClick={() => wrapAction(u.id, () => {
                                       const updated = users.map(user => user.id === u.id ? {...user, status: user.status === 'suspended' ? 'active' : 'suspended' as any} : user);
                                       setUsers(updated);
                                       storage.updateUsersList(updated);
                                       showToast(`Membro ${u.status === 'suspended' ? 'reativado' : 'suspenso'}.`);
                                    })}
                                    className={`p-2 bg-apple-bg rounded-xl apple-transition ${u.status === 'suspended' ? 'hover:bg-green-500' : 'hover:bg-red-500'} hover:text-white`}
                                 >
                                    {loading === u.id ? '...' : u.status === 'suspended' ? '🔓' : '🚫'}
                                 </button>
                                 <button onClick={() => deleteUser(u.id)} className="p-2 bg-apple-bg rounded-xl hover:bg-black hover:text-white apple-transition">🗑️</button>
                              </div>
                           </td>
                        </tr>
                      ))}
                   </tbody>
                </table>
             </div>
          </div>
        )}

        {/* VIEW: POSTS */}
        {subView === 'POSTS' && (
           <div className="bg-white rounded-[32px] apple-shadow overflow-hidden">
              <div className="p-8 border-b border-apple-bg">
                 <h3 className="font-black text-sm uppercase text-apple-text">Moderação de Feed</h3>
              </div>
              <div className="divide-y divide-apple-bg">
                 {posts.map(p => (
                   <div key={p.id} className="p-4 md:p-8 flex gap-4 md:gap-6 group hover:bg-apple-bg/20 apple-transition flex-col md:flex-row">
                      <div className="w-16 h-16 bg-apple-bg rounded-2xl overflow-hidden shrink-0 shadow-inner hidden md:block">
                         {p.imageUrl ? <img src={p.imageUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-apple-tertiary text-2xl font-black">P</div>}
                      </div>
                      <div className="flex-1">
                         <div className="flex items-center gap-2 mb-2">
                            <span className="text-[10px] font-black text-ejn-medium uppercase tracking-widest">{p.userName}</span>
                            <span className="text-apple-tertiary">•</span>
                            <span className="text-[9px] text-apple-secondary font-bold uppercase">{new Date(p.timestamp).toLocaleDateString()}</span>
                            {p.isPinned && <span className="text-[8px] bg-ejn-gold/20 text-ejn-dark px-1.5 py-0.5 rounded font-black uppercase">Fixado</span>}
                         </div>
                         <p className="text-sm text-apple-text font-medium leading-relaxed mb-4">{p.content}</p>
                         <div className="flex gap-4 text-[10px] font-black text-apple-tertiary uppercase">
                            <span>❤️ {p.likes} Likes</span>
                            <span>💬 {p.comments.length} Comentários</span>
                         </div>
                      </div>
                      <div className="flex flex-row md:flex-col gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 apple-transition">
                         <button 
                           onClick={() => {
                              const updated = posts.map(it => it.id === p.id ? {...it, isPinned: !it.isPinned} : it);
                              setPosts(updated);
                              storage.updatePosts(updated);
                              showToast(p.isPinned ? 'Post desfixado.' : 'Post fixado no topo.');
                           }}
                           className={`p-2 rounded-xl apple-transition ${p.isPinned ? 'bg-ejn-gold text-ejn-dark' : 'bg-apple-bg hover:bg-ejn-gold'}`}
                         >
                            📌
                         </button>
                         <button onClick={() => { if(confirm('Excluir post?')) { setPosts(posts.filter(it => it.id !== p.id)); storage.updatePosts(posts.filter(it => it.id !== p.id)); showToast('Post removido.'); } }} className="p-2 bg-apple-bg hover:bg-red-500 hover:text-white rounded-xl apple-transition">🗑️</button>
                      </div>
                   </div>
                 ))}
              </div>
           </div>
        )}

        {/* VIEW: MISSÕES */}
        {subView === 'MISSIONS_MGMT' && (
           <div className="space-y-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center px-4 gap-4">
                 <div>
                    <h3 className="font-black text-sm uppercase text-apple-text">Central de Desafios</h3>
                    <p className="text-[10px] text-apple-secondary font-bold uppercase mt-1">Configure as recompensas da rede</p>
                 </div>
                 <button onClick={() => { setEditingMission(null); setMissionForm({isActive: true, type: 'daily', icon: '🎯'}); setShowMissionModal(true); }} className="bg-ejn-dark text-white px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] apple-transition hover:scale-105 active:scale-95 shadow-xl w-full md:w-auto">Nova Missão</button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {missions.map(m => (
                   <div key={m.id} className="bg-white p-6 rounded-[32px] apple-shadow border border-apple-border/50 group flex flex-col justify-between">
                      <div className="flex justify-between items-start mb-6">
                         <div className="w-14 h-14 bg-apple-bg rounded-[20px] flex items-center justify-center text-3xl group-hover:bg-ejn-gold/10 apple-transition">{m.icon}</div>
                         <div className="flex gap-1">
                            <button onClick={() => { setEditingMission(m); setMissionForm(m); setShowMissionModal(true); }} className="p-2 bg-apple-bg rounded-xl hover:bg-ejn-dark hover:text-white apple-transition">✏️</button>
                            <button onClick={() => { if(confirm('Excluir missão?')) { const u = missions.filter(it => it.id !== m.id); setMissions(u); storage.saveMissions(u); showToast('Missão removida.'); } }} className="p-2 bg-apple-bg rounded-xl hover:bg-red-500 hover:text-white apple-transition">🗑️</button>
                         </div>
                      </div>
                      <div>
                         <h4 className="font-bold text-apple-text text-base mb-1">{m.title}</h4>
                         <p className="text-xs text-apple-secondary font-medium leading-relaxed mb-6">{m.desc}</p>
                      </div>
                      <div className="flex justify-between items-center pt-4 border-t border-apple-bg">
                         <div className="flex gap-3">
                            <span className="text-[10px] font-black text-ejn-medium">+{m.rewardXP} XP</span>
                            <span className="text-[10px] font-black text-ejn-gold">+{m.rewardCoins} EJN</span>
                         </div>
                         <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${m.type === 'daily' ? 'bg-blue-50 text-blue-500' : 'bg-purple-50 text-purple-500'}`}>{m.type}</span>
                      </div>
                   </div>
                 ))}
              </div>
           </div>
        )}

        {/* VIEW: BRINDES */}
        {subView === 'REWARDS_MGMT' && (
           <div className="space-y-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center px-4 gap-4">
                 <h3 className="font-black text-sm uppercase text-apple-text">Catálogo de Brindes</h3>
                 <button onClick={() => { setEditingReward(null); setRewardForm({category: 'Produto', stock: 10, icon: '🎁'}); setShowRewardModal(true); }} className="bg-ejn-medium text-white px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] apple-transition hover:scale-105 active:scale-95 shadow-xl w-full md:w-auto">Novo Item</button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                 {rewards.map(r => (
                   <div key={r.id} className="bg-white rounded-[32px] overflow-hidden apple-shadow group flex flex-col border border-apple-border/50">
                      <div className="h-32 relative bg-apple-bg overflow-hidden">
                         <img src={r.imageUrl} className="w-full h-full object-cover group-hover:scale-110 apple-transition" />
                         <div className="absolute top-2 right-2 flex gap-1">
                            <button onClick={() => { setEditingReward(r); setRewardForm(r); setShowRewardModal(true); }} className="p-2 bg-white/90 rounded-xl shadow text-xs hover:bg-ejn-dark hover:text-white apple-transition">✏️</button>
                            <button onClick={() => { if(confirm('Excluir brinde?')) { const u = rewards.filter(it => it.id !== r.id); setRewards(u); storage.saveRewards(u); showToast('Item removido da loja.'); } }} className="p-2 bg-white/90 rounded-xl shadow text-xs hover:bg-red-500 hover:text-white apple-transition">🗑️</button>
                         </div>
                      </div>
                      <div className="p-5 flex-1 flex flex-col">
                         <h4 className="font-bold text-xs text-apple-text truncate mb-1">{r.title}</h4>
                         <p className="text-ejn-gold font-black text-[11px] mb-4">{r.cost.toLocaleString()} EJN</p>
                         <div className="mt-auto flex justify-between items-center pt-3 border-t border-apple-bg">
                            <span className="text-[9px] font-bold text-apple-tertiary uppercase">Estoque: {r.stock}</span>
                            <span className="text-[8px] bg-apple-bg text-apple-secondary px-2 py-0.5 rounded font-black uppercase">{r.category}</span>
                         </div>
                      </div>
                   </div>
                 ))}
              </div>
           </div>
        )}

        {/* VIEW: SETTINGS */}
        {subView === 'SETTINGS' && (
           <div className="bg-white rounded-[40px] p-6 md:p-10 apple-shadow max-w-2xl mx-auto">
              <h3 className="font-black text-base uppercase text-apple-text mb-10">Preferências da Plataforma</h3>
              <form onSubmit={(e) => { e.preventDefault(); storage.saveSettings(settings); showToast('Ajustes salvos.'); }} className="space-y-8">
                 <div className="space-y-3">
                    <label className="text-[10px] font-black text-apple-tertiary uppercase tracking-[0.2em] ml-1">Nome da Plataforma</label>
                    <input type="text" className="w-full p-4 bg-apple-bg rounded-2xl font-bold text-sm focus:ring-2 focus:ring-ejn-gold/20 outline-none apple-transition" value={settings.platformName} onChange={e => setSettings({...settings, platformName: e.target.value})} />
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                       <label className="text-[10px] font-black text-apple-tertiary uppercase tracking-[0.2em] ml-1">XP por Post</label>
                       <input type="number" className="w-full p-4 bg-apple-bg rounded-2xl font-bold text-sm outline-none" value={settings.xpPerPost} onChange={e => setSettings({...settings, xpPerPost: Number(e.target.value)})} />
                    </div>
                    <div className="space-y-3">
                       <label className="text-[10px] font-black text-apple-tertiary uppercase tracking-[0.2em] ml-1">XP por Comentário</label>
                       <input type="number" className="w-full p-4 bg-apple-bg rounded-2xl font-bold text-sm outline-none" value={settings.xpPerComment} onChange={e => setSettings({...settings, xpPerComment: Number(e.target.value)})} />
                    </div>
                 </div>
                 <div className="pt-8">
                    <button type="submit" className="w-full py-4 bg-ejn-dark text-white rounded-[24px] font-bold text-sm apple-transition hover:scale-[1.02] shadow-2xl active:scale-95">Salvar Configurações</button>
                 </div>
              </form>
           </div>
        )}

      </section>

      {/* MODAL: EDITAR USUÁRIO */}
      {editingUser && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-ejn-dark/40 backdrop-blur-md animate-fadeIn overflow-y-auto">
           <div className="bg-white w-full max-w-lg rounded-[40px] p-6 md:p-10 apple-shadow relative my-auto">
              <button onClick={() => setEditingUser(null)} className="absolute top-6 right-8 text-apple-tertiary hover:text-ejn-dark font-black">FECHAR</button>
              <h3 className="text-xl font-black text-ejn-dark uppercase tracking-tight mb-8">Editar Membro</h3>
              
              <div className="space-y-6">
                 <div className="flex items-center gap-4 mb-4">
                    <Avatar name={editingUser.name} bgColor={editingUser.avatarCor} size="lg" url={editingUser.avatarUrl} />
                    <div>
                       <p className="font-bold text-lg">{editingUser.name}</p>
                       <p className="text-xs text-apple-secondary font-medium uppercase tracking-widest">Nível {editingUser.nivel}</p>
                    </div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <label className="text-[9px] font-black text-apple-tertiary uppercase tracking-widest ml-1">Cargo</label>
                       <select className="w-full p-3 bg-apple-bg rounded-xl text-xs font-bold" value={editingUser.role} onChange={e => setEditingUser({...editingUser, role: e.target.value as any})}>
                          <option value="aluno">Aluno</option>
                          <option value="gestor">Gestor</option>
                       </select>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[9px] font-black text-apple-tertiary uppercase tracking-widest ml-1">Status</label>
                       <select className="w-full p-3 bg-apple-bg rounded-xl text-xs font-bold" value={editingUser.status} onChange={e => setEditingUser({...editingUser, status: e.target.value as any})}>
                          <option value="active">Ativo</option>
                          <option value="suspended">Suspenso</option>
                       </select>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[9px] font-black text-apple-tertiary uppercase tracking-widest ml-1">XP Atual</label>
                       <input type="number" className="w-full p-3 bg-apple-bg rounded-xl text-xs font-bold" value={editingUser.xp} onChange={e => setEditingUser({...editingUser, xp: Number(e.target.value)})} />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[9px] font-black text-apple-tertiary uppercase tracking-widest ml-1">EJN Coins</label>
                       <input type="number" className="w-full p-3 bg-apple-bg rounded-xl text-xs font-bold" value={editingUser.pontosTotais} onChange={e => setEditingUser({...editingUser, pontosTotais: Number(e.target.value)})} />
                    </div>
                 </div>

                 <button onClick={() => updateUser(editingUser)} className="w-full py-4 bg-ejn-dark text-white rounded-2xl font-bold text-xs uppercase tracking-widest mt-6 apple-transition hover:scale-105 active:scale-95 shadow-xl">Salvar Alterações</button>
              </div>
           </div>
        </div>
      )}

      {/* MODAL: MISSÃO */}
      {showMissionModal && (
         <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-ejn-dark/40 backdrop-blur-md animate-fadeIn overflow-y-auto">
            <div className="bg-white w-full max-w-lg rounded-[40px] p-6 md:p-10 apple-shadow my-auto">
               <h3 className="text-xl font-black text-ejn-dark uppercase tracking-tight mb-8">{editingMission ? 'Editar Missão' : 'Nova Missão'}</h3>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input type="text" placeholder="Título" className="md:col-span-2 p-4 bg-apple-bg rounded-2xl text-sm" value={missionForm.title || ''} onChange={e => setMissionForm({...missionForm, title: e.target.value})} />
                  <textarea placeholder="Descrição Completa" className="md:col-span-2 p-4 bg-apple-bg rounded-2xl text-sm h-24 resize-none" value={missionForm.desc || ''} onChange={e => setMissionForm({...missionForm, desc: e.target.value})} />
                  <input type="number" placeholder="XP" className="p-4 bg-apple-bg rounded-2xl text-sm" value={missionForm.rewardXP || ''} onChange={e => setMissionForm({...missionForm, rewardXP: Number(e.target.value)})} />
                  <input type="number" placeholder="EJN Coins" className="p-4 bg-apple-bg rounded-2xl text-sm" value={missionForm.rewardCoins || ''} onChange={e => setMissionForm({...missionForm, rewardCoins: Number(e.target.value)})} />
                  <select className="p-4 bg-apple-bg rounded-2xl text-sm" value={missionForm.type} onChange={e => setMissionForm({...missionForm, type: e.target.value as any})}>
                     <option value="daily">Diária</option>
                     <option value="achievement">Conquista</option>
                     <option value="special">Evento</option>
                  </select>
                  <input type="text" placeholder="Ícone" className="p-4 bg-apple-bg rounded-2xl text-sm" value={missionForm.icon || ''} onChange={e => setMissionForm({...missionForm, icon: e.target.value})} />
               </div>
               <div className="flex gap-4 mt-8">
                  <button onClick={() => setShowMissionModal(false)} className="flex-1 py-4 text-xs font-black text-apple-secondary uppercase tracking-widest">Cancelar</button>
                  <button onClick={handleSaveMission} className="flex-1 py-4 bg-ejn-gold text-ejn-dark rounded-2xl font-black text-xs uppercase tracking-widest apple-transition hover:scale-105 active:scale-95 shadow-lg">Salvar Missão</button>
               </div>
            </div>
         </div>
      )}

      {/* MODAL: BRINDE */}
      {showRewardModal && (
         <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-ejn-dark/40 backdrop-blur-md animate-fadeIn overflow-y-auto">
            <div className="bg-white w-full max-w-lg rounded-[40px] p-6 md:p-10 apple-shadow my-auto">
               <h3 className="text-xl font-black text-ejn-dark uppercase tracking-tight mb-8">{editingReward ? 'Editar Brinde' : 'Novo Brinde'}</h3>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input type="text" placeholder="Nome" className="md:col-span-2 p-4 bg-apple-bg rounded-2xl text-sm" value={rewardForm.title || ''} onChange={e => setRewardForm({...rewardForm, title: e.target.value})} />
                  <input type="number" placeholder="Custo (EJN)" className="p-4 bg-apple-bg rounded-2xl text-sm" value={rewardForm.cost || ''} onChange={e => setRewardForm({...rewardForm, cost: Number(e.target.value)})} />
                  <input type="number" placeholder="Estoque" className="p-4 bg-apple-bg rounded-2xl text-sm" value={rewardForm.stock || ''} onChange={e => setRewardForm({...rewardForm, stock: Number(e.target.value)})} />
                  <input type="text" placeholder="URL Imagem" className="md:col-span-2 p-4 bg-apple-bg rounded-2xl text-sm" value={rewardForm.imageUrl || ''} onChange={e => setRewardForm({...rewardForm, imageUrl: e.target.value})} />
                  <select className="md:col-span-2 p-4 bg-apple-bg rounded-2xl text-sm" value={rewardForm.category} onChange={e => setRewardForm({...rewardForm, category: e.target.value as any})}>
                     <option value="Mentoria">Mentoria</option>
                     <option value="Badge">Badge</option>
                     <option value="Evento">Evento</option>
                     <option value="Produto">Produto</option>
                  </select>
               </div>
               <div className="flex gap-4 mt-8">
                  <button onClick={() => setShowRewardModal(false)} className="flex-1 py-4 text-xs font-black text-apple-secondary uppercase tracking-widest">Cancelar</button>
                  <button onClick={handleSaveReward} className="flex-1 py-4 bg-ejn-medium text-white rounded-2xl font-black text-xs uppercase tracking-widest apple-transition hover:scale-105 active:scale-95 shadow-lg">Salvar Brinde</button>
               </div>
            </div>
         </div>
      )}

    </div>
  );
};

export default AdminPanel;
