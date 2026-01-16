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

// --- LAZY LOADING ---
// As views são carregadas sob demanda, mas faremos um "warm up" delas
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
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<AppView>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ejn_last_view');
      return (saved as AppView) || 'FEED';
    }
    return 'FEED';
  });

  const [loading, setLoading] = useState(true);
  const [loadingError, setLoadingError] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('ejn_last_view', currentView);
    }
  }, [currentView, currentUser]);

  useEffect(() => {
    let mounted = true;

    // --- SAFETY TIMEOUT (Solução para o loop infinito) ---
    // Se em 7 segundos o app não decidir se está logado ou não, forçamos o estado.
    const safetyTimeout = setTimeout(() => {
        if (mounted && loading) {
            console.warn("⚠️ Carregamento demorou muito. Forçando liberação da UI.");
            setLoading(false);
            // Se não carregou usuário até agora, pode ser um token inválido travado
            if (!currentUser) {
                storage.signOut().catch(() => {});
            }
        }
    }, 7000);

    const initApp = async () => {
      // 1. Tenta carga instantânea do cache
      const cachedUser = await storage.getCurrentUser(true);
      if (cachedUser) {
          if (mounted) {
              setCurrentUser(cachedUser);
              setLoading(false); 
              // Dispara atualização em background
              preFetchData();
              // Aquece os componentes Lazy para navegação rápida
              warmUpViews();
          }
      }

      // 2. Verifica sessão real no servidor
      try {
          // Timeout de 5s para a chamada de rede específica
          const freshUserPromise = storage.getCurrentUser(false);
          const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000));
          
          const freshUser = await Promise.race([freshUserPromise, timeoutPromise]) as User | null;

          if (mounted) {
             if (freshUser) {
                 if (freshUser.status === 'suspended') {
                    handleLogout(); 
                    return;
                 }
                 setCurrentUser(freshUser);
                 preFetchData(); 
             } else if (!cachedUser) {
                 // Se não tem cache e o freshUser veio nulo (ou timeout), assume deslogado
                 setCurrentUser(null);
             }
             setLoading(false);
          }
      } catch (err) {
          console.error("Erro na inicialização:", err);
          if (!cachedUser && mounted) {
             setLoading(false);
          }
      }
    };

    initApp();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        if (mounted) {
          setCurrentUser(null);
          setCurrentView('FEED');
          setLoading(false);
        }
      } else if (event === 'SIGNED_IN' && session) {
         // Não ativa loading aqui para evitar piscar a tela se já tivermos o user em cache
         const user = await storage.getCurrentUser();
         if (mounted && user) {
             if (user.status === 'suspended') {
                alert('Sua conta foi suspensa pela administração.');
                await storage.signOut();
                return;
             }
             setCurrentUser(user);
             setLoading(false);
             preFetchData();
             warmUpViews();
         } else if (mounted) {
             // Caso raro: Logou no Auth mas falhou em pegar o perfil
             setLoading(false);
         }
      }
    });

    return () => {
      mounted = false;
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
    };
  }, []);

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
           alert("Sessão encerrada: Sua conta foi suspensa por um administrador.");
           handleLogout();
        } else if (newUser.role !== currentUser.role) {
           setCurrentUser(prev => prev ? { ...prev, role: newUser.role } : null);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser?.id]);

  // Carrega dados em background para popular o localStorage/Cache
  const preFetchData = () => {
    // Isso garante que quando o usuário clicar em Ranking/Missões, os dados já estarão lá
    storage.getUsers().catch(() => {});
    storage.getMissions().catch(() => {});
    storage.getRewards().catch(() => {});
    storage.getTrending().catch(() => {});
  };

  // Força o import dos componentes lazy em background para evitar spinners na navegação
  const warmUpViews = () => {
    setTimeout(() => {
        import('./components/Ranking');
        import('./components/Missions');
        import('./components/Profile');
        import('./components/AdminPanel');
    }, 2000); // 2 segundos após carga inicial
  };

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    setLoadingError(false);
    setCurrentView('FEED');
    localStorage.setItem('ejn_last_view', 'FEED');
    setLoading(false);
    preFetchData();
    warmUpViews();
  };

  const handleLogout = async () => {
    setLoading(true);
    try {
        await storage.signOut();
        setCurrentUser(null);
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = window.location.origin;
    } catch (error) {
        console.error("Erro ao sair:", error);
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
        console.error("Erro ao seguir usuário:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-apple-bg flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-ejn-gold/20 border-t-ejn-gold rounded-full animate-spin"></div>
        <p className="text-xs font-bold text-apple-tertiary animate-pulse">Autenticando...</p>
        <button 
           onClick={() => setLoading(false)} 
           className="mt-4 text-[10px] text-red-500 font-bold hover:underline"
        >
           Demorando muito? Cancelar
        </button>
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
        {isMobileMenuOpen && (
          <div 
            className="fixed inset-0 bg-black/30 backdrop-blur-md z-[100] transition-opacity duration-300 lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}
        
        <div className={`
          fixed top-0 left-0 bottom-0 w-[280px] bg-apple-bg z-[101] shadow-2xl transition-transform duration-300 ease-out p-6 overflow-y-auto lg:hidden
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        `}>
          <div className="flex justify-between items-center mb-8">
            <div className="font-bold text-xl tracking-tight text-apple-text">Opções</div>
            <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 bg-apple-border/20 rounded-full text-apple-secondary hover:text-apple-text apple-transition">
              <Icons.X />
            </button>
          </div>
          
          <div className="space-y-2 mb-8">
             {currentUser.role === 'gestor' && (
               <button
                 onClick={() => { setCurrentView('ADMIN'); setIsMobileMenuOpen(false); }}
                 className={`w-full px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-3 apple-transition ${currentView === 'ADMIN' ? 'bg-ejn-dark text-white' : 'bg-white text-ejn-dark border border-ejn-dark/10 shadow-sm'}`}
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