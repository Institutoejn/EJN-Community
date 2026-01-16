import React, { useState, useEffect, Suspense, lazy } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Auth from './components/Auth';
import BottomNav from './components/BottomNav'; 
import RightSidebar from './components/RightSidebar'; 
import ErrorBoundary from './components/ErrorBoundary';
import { User, AppView } from './types';
import { storage } from './services/storage';
import { supabase } from './services/supabase';
import { Icons } from './constants';

// --- LAZY LOADING OTIMIZADO ---
const Feed = lazy(() => import('./components/Feed'));
const Profile = lazy(() => import('./components/Profile'));
const Ranking = lazy(() => import('./components/Ranking'));
const Missions = lazy(() => import('./components/Missions'));
const AdminPanel = lazy(() => import('./components/AdminPanel'));

const PageSkeleton = () => (
  <div className="w-full animate-pulse space-y-6">
    <div className="bg-white h-48 rounded-3xl w-full opacity-50"></div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
       <div className="bg-white h-32 rounded-3xl opacity-50"></div>
       <div className="bg-white h-32 rounded-3xl opacity-50"></div>
       <div className="bg-white h-32 rounded-3xl opacity-50"></div>
    </div>
  </div>
);

const App: React.FC = () => {
  // ⚡ CARGA INSTANTÂNEA: Inicializa direto do localStorage, sem esperar Promise
  const [currentUser, setCurrentUser] = useState<User | null>(() => storage.getLocalCurrentUser());
  
  // Se já temos usuário local, não mostramos loading. Se não temos, mostramos apenas até verificar auth.
  const [loading, setLoading] = useState(() => !storage.getLocalCurrentUser());
  
  const [currentView, setCurrentView] = useState<AppView>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('ejn_last_view') as AppView) || 'FEED';
    }
    return 'FEED';
  });

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('ejn_last_view', currentView);
    }
  }, [currentView, currentUser]);

  useEffect(() => {
    let mounted = true;

    // --- SAFETY TIMEOUT ---
    // Mesmo com a lógica otimizada, se a rede travar no Auth, liberamos em 4s
    const safetyTimeout = setTimeout(() => {
        if (mounted && loading) {
            setLoading(false);
        }
    }, 4000);

    const initApp = async () => {
      // Background Refresh: Verifica se o usuário local ainda é válido no servidor
      try {
          // Se já temos usuário local, isso roda em background sem bloquear UI
          const freshUser = await storage.getCurrentUser(false);
          
          if (mounted) {
             if (freshUser) {
                 if (freshUser.status === 'suspended') {
                    handleLogout(); 
                    return;
                 }
                 // Atualiza silenciosamente os dados (XP, nível, etc)
                 if (JSON.stringify(freshUser) !== JSON.stringify(currentUser)) {
                    setCurrentUser(freshUser);
                 }
                 preFetchData(); 
             } else if (!currentUser) {
                 // Se não tinha local e o remoto veio null, libera a tela de login
                 setLoading(false);
             } else {
                 // Tinha local, mas remoto falhou/null -> Possível logout ou erro de rede
                 // Mantemos o local se for erro de rede, deslogamos se for 401
                 const { data } = await supabase.auth.getSession();
                 if (!data.session) {
                     handleLogout();
                 }
             }
             
             // Garante que loading saia se ainda estiver
             if (!currentUser) setLoading(false);
          }
      } catch (err) {
          console.error("Erro na verificação de sessão:", err);
          if (mounted) setLoading(false);
      }
    };

    initApp();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        if (mounted) {
          setCurrentUser(null);
          setLoading(false);
        }
      } else if (event === 'SIGNED_IN' && session) {
         // Login bem sucedido via Auth Component ou recuperação de sessão
         if (!currentUser) {
            const user = await storage.getCurrentUser();
            if (mounted && user) {
                setCurrentUser(user);
                setLoading(false);
                preFetchData();
                warmUpViews();
            }
         }
      }
    });

    // Pré-carrega views para navegação instantânea
    if (currentUser) warmUpViews();

    return () => {
      mounted = false;
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
    };
  }, []);

  // Monitora mudanças críticas no usuário em tempo real
  useEffect(() => {
    if (!currentUser) return;
    const channel = supabase.channel(`security-${currentUser.id}`)
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'users',
        filter: `id=eq.${currentUser.id}`
      }, (payload) => {
        const newUser = payload.new as any;
        if (newUser.status === 'suspended') {
           alert("Sessão encerrada: Sua conta foi suspensa.");
           handleLogout();
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentUser?.id]);

  const preFetchData = () => {
    // Dispara requests em paralelo sem await
    storage.getUsers().catch(() => {});
    storage.getMissions().catch(() => {});
    storage.getRewards().catch(() => {});
    storage.getTrending().catch(() => {});
  };

  const warmUpViews = () => {
    // Import dinâmico em background
    setTimeout(() => {
        import('./components/Ranking');
        import('./components/Missions');
        import('./components/Profile');
    }, 1000);
  };

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    setCurrentView('FEED');
    setLoading(false);
    preFetchData();
  };

  const handleLogout = async () => {
    try {
        await storage.signOut();
        setCurrentUser(null);
        localStorage.clear(); 
        window.location.href = window.location.origin;
    } catch (error) {
        localStorage.clear();
        window.location.href = window.location.origin;
    }
  };

  const handleUpdateUser = (updatedUser: User) => {
    setCurrentUser(updatedUser);
  };

  const handleFollowUser = async (targetId: string) => {
    if (!currentUser || currentUser.id === targetId) return;
    if (currentUser.followingIds.includes(targetId)) return;

    // Optimistic Update
    const updatedUser: User = {
      ...currentUser,
      followingCount: currentUser.followingCount + 1,
      followingIds: [...currentUser.followingIds, targetId],
      xp: currentUser.xp + 10
    };
    handleUpdateUser(updatedUser);

    try {
        await storage.followUser(currentUser.id, targetId);
        await storage.saveUser(updatedUser);
    } catch (error) {
        console.error("Erro ao seguir:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-apple-bg flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-ejn-gold/20 border-t-ejn-gold rounded-full animate-spin"></div>
        <p className="text-xs font-bold text-apple-tertiary animate-pulse">Carregando...</p>
      </div>
    );
  }

  if (!currentUser) {
    return <Auth onLoginSuccess={handleLoginSuccess} />;
  }

  const isAdminView = currentView === 'ADMIN';

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-apple-bg selection:bg-ejn-gold selection:text-ejn-dark relative font-sans pb-20 lg:pb-0">
        {/* Mobile Menu Overlay */}
        {isMobileMenuOpen && (
          <div 
            className="fixed inset-0 bg-black/30 backdrop-blur-md z-[100] transition-opacity duration-300 lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}
        
        {/* Sidebar Mobile */}
        <div className={`
          fixed top-0 left-0 bottom-0 w-[280px] bg-apple-bg z-[101] shadow-2xl transition-transform duration-300 ease-out p-6 overflow-y-auto lg:hidden
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        `}>
          <div className="flex justify-between items-center mb-8">
            <div className="font-bold text-xl tracking-tight text-apple-text">Menu</div>
            <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 bg-apple-border/20 rounded-full text-apple-secondary">
              <Icons.X />
            </button>
          </div>
          
          <div className="space-y-2 mb-8">
             {currentUser.role === 'gestor' && (
               <button
                 onClick={() => { setCurrentView('ADMIN'); setIsMobileMenuOpen(false); }}
                 className={`w-full px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-3 apple-transition ${currentView === 'ADMIN' ? 'bg-ejn-dark text-white' : 'bg-white text-ejn-dark border border-ejn-dark/10'}`}
               >
                 <Icons.Edit className="w-5 h-5" /> Painel do Gestor
               </button>
             )}
          </div>
          <Sidebar user={currentUser} setView={(v) => { setCurrentView(v); setIsMobileMenuOpen(false); }} onFollow={handleFollowUser} />
        </div>

        <Header 
          user={currentUser} 
          currentView={currentView} 
          setView={setCurrentView} 
          onLogout={handleLogout}
          onToggleMenu={() => setIsMobileMenuOpen(true)}
        />
        
        {!isAdminView && <BottomNav currentView={currentView} setView={setCurrentView} user={currentUser} />}

        <main className="max-w-[1600px] mx-auto px-4 pt-20 md:pt-24 md:px-8 pb-24 md:pb-8">
          <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start justify-center">
            {!isAdminView && (
              <div className="hidden lg:block lg:w-[240px] xl:w-[280px] lg:sticky lg:top-24 flex-shrink-0">
                <Sidebar user={currentUser} setView={setCurrentView} onFollow={handleFollowUser} />
              </div>
            )}

            <div className="w-full flex-grow flex justify-center max-w-full min-w-0">
              <div className={`w-full ${isAdminView ? 'max-w-7xl' : 'max-w-2xl xl:max-w-3xl'}`}>
                <Suspense fallback={<PageSkeleton />}>
                  {currentView === 'FEED' && <Feed user={currentUser} onUpdateUser={handleUpdateUser} onFollow={handleFollowUser} />}
                  {currentView === 'PROFILE' && <Profile user={currentUser} onUpdateUser={handleUpdateUser} />}
                  {currentView === 'RANKING' && <Ranking user={currentUser} onFollow={handleFollowUser} />}
                  {currentView === 'MISSIONS' && <Missions user={currentUser} onUpdateUser={handleUpdateUser} />}
                  {currentView === 'ADMIN' && <AdminPanel currentUser={currentUser} onClose={() => setCurrentView('FEED')} />}
                </Suspense>
              </div>
            </div>

            {!isAdminView && <RightSidebar />}
          </div>
        </main>
      </div>
    </ErrorBoundary>
  );
};

export default App;