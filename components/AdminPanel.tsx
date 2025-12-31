
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
      platformName: '', xpPerPost: 50, xpPerComment: 10, xpPerLikeReceived: 5, coinsPerPost: 10
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

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoadingData(true);
    try {
      const [u, p, m, r, s] = await Promise.all([
          storage.getUsers(true), storage.getPosts(true), storage.getMissions(), storage.getRewards(), storage.getSettings()
      ]);
      setUsers(u); setPosts(p); setMissions(m); setRewards(r); setSettings(s);
    } catch (e) {
      showToast("Erro ao carregar dados", "error");
    } finally {
      setLoadingData(false);
    }
  };

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const wrapAction = async (id: string, action: () => Promise<void> | void) => {
    setLoadingAction(id);
    try {
      await action();
    } catch (e) {
      showToast("Falha na operação", "error");
    } finally {
      setLoadingAction(null);
    }
  };

  // --- USUÁRIOS ---
  const handleUpdateUser = async (u: User) => {
    await wrapAction(u.id, async () => {
        await storage.saveUser(u);
        setUsers(users.map(user => user.id === u.id ? u : user));
        setEditingUser(null);
        showToast(`Perfil de ${u.name} atualizado.`);
    });
  };

  const handleDeleteUser = async (id: string) => {
    if (confirm('Deseja excluir permanentemente este usuário?')) {
        await wrapAction(id, async () => {
            await storage.deleteUser(id);
            setUsers(users.filter(u => u.id !== id));
            showToast('Usuário removido do sistema.');
        });
    }
  };

  // --- POSTS ---
  const handleDeletePost = async (id: string) => {
    if (confirm('Excluir esta publicação?')) {
        await wrapAction(id, async () => {
            await storage.deletePost(id);
            setPosts(posts.filter(p => p.id !== id));
            showToast('Post removido.');
        });
    }
  };

  // --- MISSÕES ---
  const handleOpenMissionModal = (mission?: Mission) => {
      if (mission) { setEditingMission(mission); setMissionForm({ ...mission }); }
      else { setEditingMission(null); setMissionForm({ title: '', desc: '', rewardXP: 100, rewardCoins: 50, isActive: true, type: 'daily', icon: '🎯' }); }
      setShowMissionModal(true);
  };

  const handleSaveMission = async () => {
    if (!missionForm.title || !missionForm.desc) return;
    const mission: Mission = {
      id: editingMission?.id || '',
      title: missionForm.title!, desc: missionForm.desc!,
      rewardXP: Number(missionForm.rewardXP || 0), rewardCoins: Number(missionForm.rewardCoins || 0),
      icon: missionForm.icon || '🎯', type: (missionForm.type as any) || 'daily', isActive: missionForm.isActive ?? true
    };
    await wrapAction('mission-save', async () => {
        await storage.saveMission(mission);
        await loadData(); // Recarrega para obter IDs corretos
        setShowMissionModal(false);
        showToast('Missão salva.');
    });
  };

  const handleDeleteMission = async (id: string) => {
      if(!confirm('Excluir esta missão?')) return;
      await wrapAction(id, async () => {
          await storage.deleteMission(id);
          setMissions(missions.filter(m => m.id !== id));
          showToast('Missão removida.');
      });
  };

  // --- RECOMPENSAS ---
  const handleOpenRewardModal = (reward?: RewardItem) => {
      if (reward) { setEditingReward(reward); setRewardForm({ ...reward }); }
      else { setEditingReward(null); setRewardForm({ title: '', desc: '', cost: 500, stock: 10, category: 'Produto', icon: '🎁', imageUrl: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=400' }); }
      setShowRewardModal(true);
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
        showToast('Loja atualizada.');
    });
  };

  const handleDeleteReward = async (id: string) => {
      if(!confirm('Remover este item da loja?')) return;
      await wrapAction(id, async () => {
          await storage.deleteReward(id);
          setRewards(rewards.filter(r => r.id !== id));
          showToast('Item removido.');
      });
  };

  const handleSaveSettings = async () => {
      await wrapAction('settings-save', async () => {
          await storage.saveSettings(settings);
          showToast('Ajustes salvos com sucesso.');
      });
  };

  const filteredUsers = users.filter(u => {
    if (userFilter === 'all') return true;
    if (userFilter === 'active') return u.status !== 'suspended';
    if (userFilter === 'suspended') return u.status === 'suspended';
    if (userFilter === 'gestor') return u.role === 'gestor';
    return true;
  });

  if (loadingData) return <div className="p-20 text-center font-bold text-apple-secondary animate-pulse">Sincronizando com o banco de dados...</div>;

  return (
    <div className="w-full flex flex-col lg:flex-row gap-8 animate-fadeIn pb-24 relative">
      {toast && (
        <div className={`fixed top-20 right-8 z-[110] px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-slideIn ${toast.type === 'success' ? 'bg-ejn-dark text-white' : 'bg-red-500 text-white'}`}>
           <span className="text-xs font-bold uppercase tracking-widest">{toast.message}</span>
        </div>
      )}

      <aside className="w-full lg:w-[240px] flex flex-col gap-2 shrink-0">
        <div className="bg-ejn-dark rounded-3xl p-6 text-white mb-4 shadow-xl">
           <p className="text-[10px] font-black uppercase tracking-widest text-ejn-gold mb-1">Painel do Gestor</p>
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
              <span>{item.icon}</span> <span className="hidden md:inline">{item.label}</span>
            </button>
          ))}
        </div>
      </aside>

      <section className="flex-1 min-w-0">
        {subView === 'DASHBOARD' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Alunos', val: users.length, icon: '👥', color: 'text-blue-500' },
              { label: 'Posts', val: posts.length, icon: '🔥', color: 'text-orange-500' },
              { label: 'Circulação', val: users.reduce((a, b) => a + (b.pontosTotais || 0), 0), icon: '🪙', color: 'text-ejn-gold' },
              { label: 'Missões', val: missions.filter(m => m.isActive).length, icon: '🎯', color: 'text-ejn-medium' },
            ].map((c, i) => (
              <div key={i} className="bg-white p-6 rounded-[32px] apple-shadow">
                <h3 className={`text-2xl font-black ${c.color}`}>{c.val}</h3>
                <p className="text-[10px] font-bold text-apple-secondary uppercase tracking-wider">{c.label}</p>
              </div>
            ))}
          </div>
        )}

        {subView === 'USERS' && (
          <div className="bg-white rounded-[32px] apple-shadow overflow-hidden">
             <div className="p-8 border-b border-apple-bg flex justify-between items-center">
                <h3 className="font-black text-sm uppercase">Lista de Membros</h3>
                <div className="flex gap-2">
                    {['all', 'active', 'suspended'].map(f => (
                        <button key={f} onClick={() => setUserFilter(f as any)} className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${userFilter === f ? 'bg-ejn-dark text-white' : 'bg-apple-bg text-apple-secondary'}`}>
                            {f === 'all' ? 'Todos' : f}
                        </button>
                    ))}
                </div>
             </div>
             <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[700px]">
                   <tbody className="divide-y divide-apple-bg">
                      {filteredUsers.map(u => (
                        <tr key={u.id} className="hover:bg-apple-bg/30 apple-transition">
                           <td className="px-8 py-5 flex items-center gap-3">
                              <Avatar name={u.name} bgColor={u.avatarCor} size="sm" url={u.avatarUrl} />
                              <div><p className="text-sm font-bold">{u.name}</p><p className="text-[10px] text-apple-secondary">{u.email}</p></div>
                           </td>
                           <td className="px-8 py-5">
                              <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${u.status === 'suspended' ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-600'}`}>
                                 {u.status === 'suspended' ? 'Suspenso' : 'Ativo'}
                              </span>
                           </td>
                           <td className="px-8 py-5 text-right flex justify-end gap-2">
                              <button onClick={() => setEditingUser(u)} className="p-2 bg-apple-bg rounded-xl hover:bg-ejn-dark hover:text-white apple-transition">✏️</button>
                              <button onClick={() => handleDeleteUser(u.id)} className="p-2 bg-apple-bg rounded-xl hover:bg-red-600 hover:text-white apple-transition">🗑️</button>
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
              <div className="p-8 border-b border-apple-bg"><h3 className="font-black text-sm uppercase">Moderação</h3></div>
              <div className="divide-y divide-apple-bg">
                 {posts.map(p => (
                   <div key={p.id} className="p-6 flex gap-4 group hover:bg-apple-bg/20">
                      <div className="flex-1">
                         <p className="text-[10px] font-black text-ejn-medium uppercase mb-1">{p.userName}</p>
                         <p className="text-sm font-medium leading-relaxed">{p.content}</p>
                      </div>
                      <div className="flex gap-2">
                         <button onClick={() => handleDeletePost(p.id)} className="p-2 bg-apple-bg hover:bg-red-500 hover:text-white rounded-xl apple-transition">🗑️</button>
                      </div>
                   </div>
                 ))}
              </div>
           </div>
        )}

        {subView === 'MISSIONS_MGMT' && (
           <div className="bg-white rounded-[32px] apple-shadow overflow-hidden">
               <div className="p-8 border-b border-apple-bg flex justify-between items-center">
                  <h3 className="font-black text-sm uppercase">Missões</h3>
                  <button onClick={() => handleOpenMissionModal()} className="bg-ejn-dark text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest">+ Nova</button>
               </div>
               <div className="divide-y divide-apple-bg">
                   {missions.map(m => (
                       <div key={m.id} className="p-6 flex items-center gap-4 hover:bg-apple-bg/30">
                           <div className="text-2xl">{m.icon}</div>
                           <div className="flex-1"><p className="font-bold text-sm">{m.title}</p><p className="text-xs text-apple-secondary">{m.desc}</p></div>
                           <div className="flex gap-2">
                               <button onClick={() => handleOpenMissionModal(m)} className="p-2 hover:bg-apple-bg rounded-lg">✏️</button>
                               <button onClick={() => handleDeleteMission(m.id)} className="p-2 hover:bg-red-50 text-red-500 rounded-lg">🗑️</button>
                           </div>
                       </div>
                   ))}
               </div>
           </div>
        )}

        {subView === 'REWARDS_MGMT' && (
           <div className="bg-white rounded-[32px] apple-shadow overflow-hidden">
               <div className="p-8 border-b border-apple-bg flex justify-between items-center">
                  <h3 className="font-black text-sm uppercase">Loja</h3>
                  <button onClick={() => handleOpenRewardModal()} className="bg-ejn-dark text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest">+ Novo Item</button>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
                   {rewards.map(r => (
                       <div key={r.id} className="border border-apple-border rounded-2xl p-4 flex flex-col gap-3">
                           <img src={r.imageUrl} alt={r.title} className="w-full h-32 object-cover rounded-xl" />
                           <h4 className="font-bold text-sm">{r.title}</h4>
                           <div className="flex gap-2">
                               <button onClick={() => handleOpenRewardModal(r)} className="flex-1 bg-apple-bg py-2 rounded-lg text-xs font-bold">Editar</button>
                               <button onClick={() => handleDeleteReward(r.id)} className="flex-1 bg-red-50 text-red-500 py-2 rounded-lg text-xs font-bold">Excluir</button>
                           </div>
                       </div>
                   ))}
               </div>
           </div>
        )}

        {subView === 'SETTINGS' && (
           <div className="bg-white rounded-[32px] apple-shadow p-8">
               <h3 className="font-black text-sm uppercase mb-6">Configurações Gerais</h3>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                   <div className="space-y-2">
                       <label className="text-[10px] font-bold text-apple-secondary uppercase">Nome da Plataforma</label>
                       <input type="text" className="w-full h-12 px-4 bg-apple-bg rounded-xl" value={settings.platformName} onChange={e => setSettings({...settings, platformName: e.target.value})} />
                   </div>
                   <div className="space-y-2">
                       <label className="text-[10px] font-bold text-apple-secondary uppercase">XP por Post</label>
                       <input type="number" className="w-full h-12 px-4 bg-apple-bg rounded-xl" value={settings.xpPerPost} onChange={e => setSettings({...settings, xpPerPost: Number(e.target.value)})} />
                   </div>
               </div>
               <button onClick={handleSaveSettings} className="bg-ejn-dark text-white px-8 py-3 rounded-xl font-bold uppercase tracking-widest hover:scale-105 apple-transition">Salvar Ajustes</button>
           </div>
        )}
      </section>

      {editingUser && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-ejn-dark/40 backdrop-blur-md">
           <div className="bg-white w-full max-w-lg rounded-[40px] p-10 apple-shadow relative">
              <button onClick={() => setEditingUser(null)} className="absolute top-6 right-8 font-black">✕</button>
              <h3 className="text-xl font-black mb-8 uppercase">Editar Membro</h3>
              <div className="space-y-4">
                 <input type="text" className="w-full p-4 bg-apple-bg rounded-2xl font-bold" value={editingUser.name} onChange={e => setEditingUser({...editingUser, name: e.target.value})} />
                 <select className="w-full p-4 bg-apple-bg rounded-2xl font-bold" value={editingUser.role} onChange={e => setEditingUser({...editingUser, role: e.target.value as any})}>
                    <option value="aluno">Aluno</option><option value="gestor">Gestor</option>
                 </select>
                 <button onClick={() => handleUpdateUser(editingUser)} className="w-full py-4 bg-ejn-dark text-white rounded-2xl font-bold uppercase">Salvar Alterações</button>
              </div>
           </div>
        </div>
      )}

      {showMissionModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-ejn-dark/40 backdrop-blur-md">
            <div className="bg-white w-full max-w-lg rounded-[32px] p-8 shadow-2xl relative">
                <button onClick={() => setShowMissionModal(false)} className="absolute top-6 right-6 font-bold">✕</button>
                <h3 className="font-black text-lg uppercase mb-6">{editingMission ? 'Editar Missão' : 'Nova Missão'}</h3>
                <div className="space-y-4">
                    <input type="text" placeholder="Título" className="w-full bg-apple-bg p-4 rounded-xl font-bold" value={missionForm.title || ''} onChange={e => setMissionForm({...missionForm, title: e.target.value})} />
                    <textarea placeholder="Descrição" className="w-full bg-apple-bg p-4 rounded-xl h-24" value={missionForm.desc || ''} onChange={e => setMissionForm({...missionForm, desc: e.target.value})} />
                    <button onClick={handleSaveMission} className="w-full bg-ejn-dark text-white py-4 rounded-xl font-bold uppercase">Salvar Missão</button>
                </div>
            </div>
        </div>
      )}

      {showRewardModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-ejn-dark/40 backdrop-blur-md">
            <div className="bg-white w-full max-w-lg rounded-[32px] p-8 shadow-2xl relative">
                <button onClick={() => setShowRewardModal(false)} className="absolute top-6 right-6 font-bold">✕</button>
                <h3 className="font-black text-lg uppercase mb-6">{editingReward ? 'Editar Item' : 'Novo Item'}</h3>
                <div className="space-y-4">
                    <input type="text" placeholder="Nome" className="w-full bg-apple-bg p-4 rounded-xl font-bold" value={rewardForm.title || ''} onChange={e => setRewardForm({...rewardForm, title: e.target.value})} />
                    <input type="number" placeholder="Custo (Coins)" className="w-full bg-apple-bg p-4 rounded-xl font-bold" value={rewardForm.cost || 0} onChange={e => setRewardForm({...rewardForm, cost: Number(e.target.value)})} />
                    <button onClick={handleSaveReward} className="w-full bg-ejn-dark text-white py-4 rounded-xl font-bold uppercase">Salvar Brinde</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
