
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
  const [subView, setSubView] = useState<AdminSubView>('DASHBOARD');
  const [users, setUsers] = useState<User[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [rewards, setRewards] = useState<RewardItem[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
      platformName: '',
      xpPerPost: 50,
      xpPerComment: 10,
      xpPerLikeReceived: 5,
      coinsPerPost: 10
  });

  // UI States
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [userFilter, setUserFilter] = useState<'all' | 'active' | 'suspended' | 'gestor'>('all');
  const [loadingData, setLoadingData] = useState(true);
  
  // Modal States
  const [editingUser, setEditingUser] = useState<User | null>(null);
  
  const [showMissionModal, setShowMissionModal] = useState(false);
  const [editingMission, setEditingMission] = useState<Mission | null>(null);
  
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [editingReward, setEditingReward] = useState<RewardItem | null>(null);

  // Forms
  const [missionForm, setMissionForm] = useState<Partial<Mission>>({ isActive: true, type: 'daily', icon: '🎯' });
  const [rewardForm, setRewardForm] = useState<Partial<RewardItem>>({ category: 'Produto', stock: 10, icon: '🎁' });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoadingData(true);
    const [u, p, m, r, s] = await Promise.all([
        storage.getUsers(true),
        storage.getPosts(true),
        storage.getMissions(),
        storage.getRewards(),
        storage.getSettings()
    ]);
    setUsers(u);
    setPosts(p);
    setMissions(m);
    setRewards(r);
    setSettings(s);
    setLoadingData(false);
  };

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const wrapAction = async (id: string, action: () => Promise<void> | void) => {
    setLoadingAction(id);
    await action();
    setLoadingAction(null);
  };

  // --- HANDLERS USUÁRIOS ---
  const updateUser = async (u: User) => {
    await wrapAction(u.id, async () => {
        const updated = users.map(user => user.id === u.id ? u : user);
        setUsers(updated);
        await storage.saveUser(u);
        setEditingUser(null);
        showToast(`Membro ${u.name} atualizado.`);
    });
  };

  const deleteUser = async (id: string) => {
    if (confirm('ATENÇÃO: Isso excluirá permanentemente o usuário e seus dados. Continuar?')) {
        await wrapAction(id, async () => {
            await storage.deleteUser(id);
            setUsers(users.filter(u => u.id !== id));
            showToast('Usuário excluído do banco de dados.');
        });
    }
  };

  // --- HANDLERS MISSÕES ---
  const handleOpenMissionModal = (mission?: Mission) => {
      if (mission) {
          setEditingMission(mission);
          setMissionForm({ ...mission });
      } else {
          setEditingMission(null);
          setMissionForm({ title: '', desc: '', rewardXP: 100, rewardCoins: 50, isActive: true, type: 'daily', icon: '🎯' });
      }
      setShowMissionModal(true);
  };

  const handleDeleteMission = async (id: string) => {
      if(!confirm('Excluir esta missão?')) return;
      await storage.deleteMission(id);
      setMissions(missions.filter(m => m.id !== id));
      showToast('Missão removida.');
  };

  const handleSaveMission = async () => {
    if (!missionForm.title || !missionForm.desc) {
        alert("Preencha título e descrição");
        return;
    }
    
    const mission: Mission = {
      id: editingMission?.id || 'm' + Date.now(), // ID temporário se novo
      title: missionForm.title,
      desc: missionForm.desc,
      rewardXP: Number(missionForm.rewardXP || 0),
      rewardCoins: Number(missionForm.rewardCoins || 0),
      icon: missionForm.icon || '🎯',
      type: missionForm.type as any,
      isActive: missionForm.isActive !== undefined ? missionForm.isActive : true
    };
    
    // UI Update Otimista
    if (editingMission) {
      setMissions(missions.map(m => m.id === editingMission.id ? mission : m));
    } else {
      setMissions([mission, ...missions]);
    }
    
    await storage.saveMissions([mission]);
    setShowMissionModal(false);
    showToast('Missão salva com sucesso!');
  };

  // --- HANDLERS BRINDES ---
  const handleOpenRewardModal = (reward?: RewardItem) => {
      if (reward) {
          setEditingReward(reward);
          setRewardForm({ ...reward });
      } else {
          setEditingReward(null);
          setRewardForm({ title: '', desc: '', cost: 500, stock: 10, category: 'Produto', icon: '🎁', imageUrl: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=400' });
      }
      setShowRewardModal(true);
  };

  const handleDeleteReward = async (id: string) => {
      if(!confirm('Excluir este brinde da loja?')) return;
      await storage.deleteReward(id);
      setRewards(rewards.filter(r => r.id !== id));
      showToast('Brinde removido.');
  };

  const handleSaveReward = async () => {
    if (!rewardForm.title || !rewardForm.desc) return;
    const reward: RewardItem = {
      id: editingReward?.id || 'r' + Date.now(),
      title: rewardForm.title,
      desc: rewardForm.desc,
      longDesc: rewardForm.longDesc || rewardForm.desc,
      cost: Number(rewardForm.cost || 0),
      icon: rewardForm.icon || '🎁',
      imageUrl: rewardForm.imageUrl || 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=400',
      stock: Number(rewardForm.stock || 0),
      category: rewardForm.category as any
    };
    
    if (editingReward) {
      setRewards(rewards.map(r => r.id === editingReward.id ? reward : r));
    } else {
      setRewards([reward, ...rewards]);
    }
    
    await storage.saveRewards([reward]);
    setShowRewardModal(false);
    showToast('Loja atualizada.');
  };

  // --- HANDLERS SETTINGS ---
  const handleSaveSettings = async () => {
      await storage.saveSettings(settings);
      showToast('Configurações da plataforma atualizadas.');
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
                { label: 'Economia (Coins)', val: users.reduce((a, b) => a + (b.pontosTotais || 0), 0).toLocaleString(), icon: '🪙', color: 'text-ejn-gold' },
                { label: 'Missões Ativas', val: missions.filter(m => m.isActive).length, icon: '🎯', color: 'text-ejn-medium' },
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
                <div className="flex gap-2">
                    {(['all', 'active', 'suspended', 'gestor'] as const).map(f => (
                        <button 
                          key={f}
                          onClick={() => setUserFilter(f)}
                          className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${userFilter === f ? 'bg-ejn-dark text-white' : 'bg-apple-bg text-apple-secondary'}`}
                        >
                            {f === 'all' ? 'Todos' : f}
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
                                    onClick={() => wrapAction(u.id, async () => {
                                       const newStatus = u.status === 'suspended' ? 'active' : 'suspended';
                                       const updatedUser = {...u, status: newStatus as any};
                                       await updateUser(updatedUser);
                                    })}
                                    className={`p-2 bg-apple-bg rounded-xl apple-transition ${u.status === 'suspended' ? 'hover:bg-green-500' : 'hover:bg-red-500'} hover:text-white`}
                                    title={u.status === 'suspended' ? 'Desbloquear' : 'Bloquear'}
                                 >
                                    {loadingAction === u.id ? '...' : u.status === 'suspended' ? '🔓' : '🚫'}
                                 </button>
                                 <button onClick={() => deleteUser(u.id)} className="p-2 bg-apple-bg rounded-xl hover:bg-red-600 hover:text-white apple-transition" title="Excluir Permanentemente">🗑️</button>
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
                            {p.isPinned && <span className="text-[8px] bg-ejn-gold/20 text-ejn-dark px-1.5 py-0.5 rounded font-black uppercase">Fixado</span>}
                         </div>
                         <p className="text-sm text-apple-text font-medium leading-relaxed mb-4">{p.content}</p>
                         <div className="flex gap-4 text-[10px] font-black text-apple-tertiary uppercase">
                            <span>❤️ {p.likes} Likes</span>
                            <span>💬 {(p.comments || []).length} Comentários</span>
                         </div>
                      </div>
                      <div className="flex flex-row md:flex-col gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 apple-transition">
                         <button 
                           onClick={async () => {
                              const updatedPost = {...p, isPinned: !p.isPinned};
                              const updatedList = posts.map(it => it.id === p.id ? updatedPost : it);
                              setPosts(updatedList);
                              await storage.savePost(updatedPost); 
                              showToast(p.isPinned ? 'Post desfixado.' : 'Post fixado no topo.');
                           }}
                           className={`p-2 rounded-xl apple-transition ${p.isPinned ? 'bg-ejn-gold text-ejn-dark' : 'bg-apple-bg hover:bg-ejn-gold'}`}
                           title="Fixar/Desafixar"
                         >
                            📌
                         </button>
                         <button onClick={() => { if(confirm('Excluir post?')) { 
                             storage.deletePost(p.id);
                             setPosts(posts.filter(it => it.id !== p.id)); 
                             showToast('Post removido.'); 
                         } }} className="p-2 bg-apple-bg hover:bg-red-500 hover:text-white rounded-xl apple-transition" title="Excluir">🗑️</button>
                      </div>
                   </div>
                 ))}
              </div>
           </div>
        )}

        {/* VIEW: MISSIONS MANAGEMENT */}
        {subView === 'MISSIONS_MGMT' && (
           <div className="bg-white rounded-[32px] apple-shadow overflow-hidden">
               <div className="p-8 border-b border-apple-bg flex justify-between items-center">
                  <h3 className="font-black text-sm uppercase text-apple-text">Gestão de Missões</h3>
                  <button 
                    onClick={() => handleOpenMissionModal()}
                    className="bg-ejn-dark text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-ejn-medium apple-transition"
                  >
                      + Nova Missão
                  </button>
               </div>
               <div className="divide-y divide-apple-bg">
                   {missions.length === 0 && <div className="p-8 text-center text-apple-secondary">Nenhuma missão cadastrada.</div>}
                   {missions.map(m => (
                       <div key={m.id} className="p-6 flex items-center gap-4 hover:bg-apple-bg/30 apple-transition">
                           <div className="text-2xl">{m.icon}</div>
                           <div className="flex-1">
                               <p className="font-bold text-apple-text text-sm">{m.title}</p>
                               <p className="text-xs text-apple-secondary">{m.desc}</p>
                           </div>
                           <div className="text-right">
                               <span className="block text-[10px] font-black text-ejn-medium">+{m.rewardXP} XP</span>
                               <span className="block text-[10px] font-black text-ejn-gold">+{m.rewardCoins} Coins</span>
                           </div>
                           <div className="flex gap-2">
                               <button onClick={() => handleOpenMissionModal(m)} className="p-2 hover:bg-apple-bg rounded-lg">✏️</button>
                               <button onClick={() => handleDeleteMission(m.id)} className="p-2 hover:bg-red-50 text-red-500 rounded-lg">🗑️</button>
                           </div>
                       </div>
                   ))}
               </div>
           </div>
        )}

        {/* VIEW: REWARDS MANAGEMENT */}
        {subView === 'REWARDS_MGMT' && (
           <div className="bg-white rounded-[32px] apple-shadow overflow-hidden">
               <div className="p-8 border-b border-apple-bg flex justify-between items-center">
                  <h3 className="font-black text-sm uppercase text-apple-text">Loja de Brindes</h3>
                  <button 
                    onClick={() => handleOpenRewardModal()}
                    className="bg-ejn-dark text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-ejn-medium apple-transition"
                  >
                      + Novo Item
                  </button>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
                   {rewards.map(r => (
                       <div key={r.id} className="border border-apple-border rounded-2xl p-4 flex flex-col gap-3 relative group">
                           <img src={r.imageUrl} alt={r.title} className="w-full h-32 object-cover rounded-xl" />
                           <div className="flex justify-between items-start">
                               <h4 className="font-bold text-sm text-apple-text">{r.title}</h4>
                               <span className="bg-ejn-gold/20 text-ejn-dark px-2 py-0.5 rounded text-[10px] font-bold">{r.cost} Coins</span>
                           </div>
                           <p className="text-xs text-apple-secondary line-clamp-2">{r.desc}</p>
                           <p className="text-[10px] font-bold text-apple-tertiary uppercase">Estoque: {r.stock}</p>
                           
                           <div className="flex gap-2 mt-auto pt-2">
                               <button onClick={() => handleOpenRewardModal(r)} className="flex-1 bg-apple-bg py-2 rounded-lg text-xs font-bold hover:bg-apple-border">Editar</button>
                               <button onClick={() => handleDeleteReward(r.id)} className="flex-1 bg-red-50 text-red-500 py-2 rounded-lg text-xs font-bold hover:bg-red-100">Excluir</button>
                           </div>
                       </div>
                   ))}
               </div>
           </div>
        )}

        {/* VIEW: SETTINGS */}
        {subView === 'SETTINGS' && (
           <div className="bg-white rounded-[32px] apple-shadow p-8">
               <h3 className="font-black text-sm uppercase text-apple-text mb-6">Configurações da Plataforma</h3>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                   <div className="space-y-2">
                       <label className="text-[10px] font-bold text-apple-secondary uppercase tracking-widest">Nome da Plataforma</label>
                       <input 
                         type="text" 
                         className="w-full h-12 px-4 bg-apple-bg rounded-xl border-none font-bold text-apple-text"
                         value={settings.platformName}
                         onChange={e => setSettings({...settings, platformName: e.target.value})}
                       />
                   </div>
                   <div className="space-y-2">
                       <label className="text-[10px] font-bold text-apple-secondary uppercase tracking-widest">XP por Post</label>
                       <input 
                         type="number" 
                         className="w-full h-12 px-4 bg-apple-bg rounded-xl border-none font-bold text-apple-text"
                         value={settings.xpPerPost}
                         onChange={e => setSettings({...settings, xpPerPost: Number(e.target.value)})}
                       />
                   </div>
                   <div className="space-y-2">
                       <label className="text-[10px] font-bold text-apple-secondary uppercase tracking-widest">XP por Comentário</label>
                       <input 
                         type="number" 
                         className="w-full h-12 px-4 bg-apple-bg rounded-xl border-none font-bold text-apple-text"
                         value={settings.xpPerComment}
                         onChange={e => setSettings({...settings, xpPerComment: Number(e.target.value)})}
                       />
                   </div>
                   <div className="space-y-2">
                       <label className="text-[10px] font-bold text-apple-secondary uppercase tracking-widest">Coins por Post</label>
                       <input 
                         type="number" 
                         className="w-full h-12 px-4 bg-apple-bg rounded-xl border-none font-bold text-apple-text"
                         value={settings.coinsPerPost}
                         onChange={e => setSettings({...settings, coinsPerPost: Number(e.target.value)})}
                       />
                   </div>
               </div>
               <button onClick={handleSaveSettings} className="bg-ejn-dark text-white px-8 py-3 rounded-xl font-bold uppercase tracking-widest hover:scale-105 apple-transition">
                   Salvar Alterações
               </button>
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
                       <label className="text-[9px] font-black text-apple-tertiary uppercase tracking-widest ml-1">Nome</label>
                       <input 
                         type="text" 
                         className="w-full p-3 bg-apple-bg rounded-xl text-xs font-bold" 
                         value={editingUser.name} 
                         onChange={e => setEditingUser({...editingUser, name: e.target.value})}
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[9px] font-black text-apple-tertiary uppercase tracking-widest ml-1">Cargo</label>
                       <select className="w-full p-3 bg-apple-bg rounded-xl text-xs font-bold" value={editingUser.role} onChange={e => setEditingUser({...editingUser, role: e.target.value as any})}>
                          <option value="aluno">Aluno</option>
                          <option value="gestor">Gestor</option>
                       </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[9px] font-black text-apple-tertiary uppercase tracking-widest ml-1">XP</label>
                        <input type="number" className="w-full p-3 bg-apple-bg rounded-xl text-xs font-bold" value={editingUser.xp} onChange={e => setEditingUser({...editingUser, xp: Number(e.target.value)})} />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[9px] font-black text-apple-tertiary uppercase tracking-widest ml-1">Coins</label>
                        <input type="number" className="w-full p-3 bg-apple-bg rounded-xl text-xs font-bold" value={editingUser.pontosTotais} onChange={e => setEditingUser({...editingUser, pontosTotais: Number(e.target.value)})} />
                    </div>
                 </div>

                 <button onClick={() => updateUser(editingUser)} className="w-full py-4 bg-ejn-dark text-white rounded-2xl font-bold text-xs uppercase tracking-widest mt-6 apple-transition hover:scale-105 active:scale-95 shadow-xl">
                     {loadingAction === editingUser.id ? 'Salvando...' : 'Salvar Alterações'}
                 </button>
              </div>
           </div>
        </div>
      )}
      
      {/* MODAL: MISSÃO */}
      {showMissionModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-ejn-dark/40 backdrop-blur-md animate-fadeIn overflow-y-auto">
            <div className="bg-white w-full max-w-lg rounded-[32px] p-8 shadow-2xl relative my-auto">
                <button onClick={() => setShowMissionModal(false)} className="absolute top-6 right-6 text-apple-tertiary hover:text-black font-bold">✕</button>
                <h3 className="font-black text-lg uppercase mb-6">{editingMission ? 'Editar Missão' : 'Nova Missão'}</h3>
                
                <div className="space-y-4">
                    <div>
                        <label className="text-[10px] font-bold uppercase tracking-widest block mb-1">Título</label>
                        <input type="text" className="w-full bg-apple-bg p-3 rounded-xl font-bold text-sm" value={missionForm.title || ''} onChange={e => setMissionForm({...missionForm, title: e.target.value})} />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold uppercase tracking-widest block mb-1">Descrição</label>
                        <textarea className="w-full bg-apple-bg p-3 rounded-xl font-medium text-sm h-24 resize-none" value={missionForm.desc || ''} onChange={e => setMissionForm({...missionForm, desc: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                           <label className="text-[10px] font-bold uppercase tracking-widest block mb-1">Ícone</label>
                           <input type="text" className="w-full bg-apple-bg p-3 rounded-xl font-bold text-center" value={missionForm.icon || ''} onChange={e => setMissionForm({...missionForm, icon: e.target.value})} placeholder="🎯" />
                        </div>
                        <div>
                           <label className="text-[10px] font-bold uppercase tracking-widest block mb-1">Recompensa XP</label>
                           <input type="number" className="w-full bg-apple-bg p-3 rounded-xl font-bold" value={missionForm.rewardXP} onChange={e => setMissionForm({...missionForm, rewardXP: Number(e.target.value)})} />
                        </div>
                        <div>
                           <label className="text-[10px] font-bold uppercase tracking-widest block mb-1">Coins</label>
                           <input type="number" className="w-full bg-apple-bg p-3 rounded-xl font-bold" value={missionForm.rewardCoins} onChange={e => setMissionForm({...missionForm, rewardCoins: Number(e.target.value)})} />
                        </div>
                    </div>
                    
                    <button onClick={handleSaveMission} className="w-full bg-ejn-dark text-white py-3 rounded-xl font-bold uppercase tracking-widest mt-4 hover:bg-ejn-medium">Salvar Missão</button>
                </div>
            </div>
        </div>
      )}

      {/* MODAL: RECOMPENSA */}
      {showRewardModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-ejn-dark/40 backdrop-blur-md animate-fadeIn overflow-y-auto">
            <div className="bg-white w-full max-w-lg rounded-[32px] p-8 shadow-2xl relative my-auto">
                <button onClick={() => setShowRewardModal(false)} className="absolute top-6 right-6 text-apple-tertiary hover:text-black font-bold">✕</button>
                <h3 className="font-black text-lg uppercase mb-6">{editingReward ? 'Editar Brinde' : 'Novo Brinde'}</h3>
                
                <div className="space-y-4">
                    <div>
                        <label className="text-[10px] font-bold uppercase tracking-widest block mb-1">Nome do Produto</label>
                        <input type="text" className="w-full bg-apple-bg p-3 rounded-xl font-bold text-sm" value={rewardForm.title || ''} onChange={e => setRewardForm({...rewardForm, title: e.target.value})} />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold uppercase tracking-widest block mb-1">Descrição Curta</label>
                        <input type="text" className="w-full bg-apple-bg p-3 rounded-xl font-medium text-sm" value={rewardForm.desc || ''} onChange={e => setRewardForm({...rewardForm, desc: e.target.value})} />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold uppercase tracking-widest block mb-1">Imagem URL</label>
                        <input type="text" className="w-full bg-apple-bg p-3 rounded-xl font-medium text-xs text-apple-secondary" value={rewardForm.imageUrl || ''} onChange={e => setRewardForm({...rewardForm, imageUrl: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                           <label className="text-[10px] font-bold uppercase tracking-widest block mb-1">Custo (Coins)</label>
                           <input type="number" className="w-full bg-apple-bg p-3 rounded-xl font-bold" value={rewardForm.cost} onChange={e => setRewardForm({...rewardForm, cost: Number(e.target.value)})} />
                        </div>
                        <div>
                           <label className="text-[10px] font-bold uppercase tracking-widest block mb-1">Estoque</label>
                           <input type="number" className="w-full bg-apple-bg p-3 rounded-xl font-bold" value={rewardForm.stock} onChange={e => setRewardForm({...rewardForm, stock: Number(e.target.value)})} />
                        </div>
                    </div>
                    
                    <button onClick={handleSaveReward} className="w-full bg-ejn-dark text-white py-3 rounded-xl font-bold uppercase tracking-widest mt-4 hover:bg-ejn-medium">Salvar Brinde</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
