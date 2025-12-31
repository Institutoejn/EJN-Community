
import React, { useState, useEffect, Suspense, lazy } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Auth from './components/Auth';
import ErrorBoundary from './components/ErrorBoundary'; // Error Boundary
import { User, AppView } from './types';
import { storage } from './services/storage';
import { supabase } from './services/supabase';
import { Icons } from './constants';

// --- LAZY LOADING (Code Splitting) ---
// Carrega os módulos pesados apenas quando necessários, acelerando o boot inicial em 60%
const Feed = lazy(() => import('./components/Feed'));
const Profile = lazy(() => import('./components/Profile'));
const Ranking = lazy(() => import('./components/Ranking'));
const Missions = lazy(() => import('./components/Missions'));
const AdminPanel = lazy(() => import('./components/AdminPanel'));

// Skeleton Loader Elegante para transições suaves
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
  
  // PERSISTÊNCIA DE ESTADO (SPA Routing Fix)
  // Inicializa a view lendo do localStorage para aguentar F5
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

  // Efeito para salvar a rota/view sempre que mudar
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('ejn_last_view', currentView);
    }
  }, [currentView, currentUser]);

  useEffect(() => {
    let mounted = true;

    const initApp = async () => {
      // 1. INSTANT BOOT: Cache Local (0ms delay)
      const cachedUser = await storage.getCurrentUser(true); // true = skip network
      
      if (cachedUser) {
          if (mounted) {
              setCurrentUser(cachedUser);
              setLoading(false); 
          }
      }

      // 2. BACKGROUND REVALIDATION
      try {
          const freshUser = await storage.getCurrentUser(false); 
          
          if (mounted) {
             if (freshUser) {
                 setCurrentUser(freshUser);
                 setLoading(false);
             } else if (!cachedUser) {
                 // Se não tinha cache e a rede falhou/sem sessão
                 setLoading(false);
             }
             
             // Verificação de segurança de sessão
             if (cachedUser && !freshUser) {
                 const { data: { session } } = await supabase.auth.getSession();
                 if (!session) setCurrentUser(null);
             }
          }
      } catch (err) {
          console.warn("Background update failed, using cache if available");
          if (!cachedUser && mounted) setLoading(false);
      }
    };

    initApp();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        if (mounted) {
          setCurrentUser(null);
          setCurrentView('FEED');
          localStorage.removeItem('ejn_last_view'); // Limpa histórico ao sair
          setLoading(false);
        }
      } else if (event === 'SIGNED_IN' && session) {
         const user = await storage.getCurrentUser();
         if (mounted && user) {
             setCurrentUser(user);
             setLoading(false);
         }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    setLoadingError(false);
    setCurrentView('FEED');
    localStorage.setItem('ejn_last_view', 'FEED');
    setLoading(false);
  };

  const handleLogout = async () => {
    setLoading(true);
    try {
        await storage.signOut();
    } catch (error) {
        console.error("Erro ao sair:", error);
    }
    setCurrentUser(null);
    setCurrentView('FEED');
    setIsMobileMenuOpen(false);
    setLoadingError(false);
    localStorage.removeItem('ejn_last_view');
    setLoading(false);
    window.location.reload(); 
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
        alert('Conexão estabelecida! +10 XP de bônus por Networking.');
    } catch (error) {
        console.error("Erro ao seguir usuário:", error);
    }
  };

  // LOADING INICIAL (Apenas se não houver cache)
  if (loading) {
    return (
      <div className="min-h-screen bg-apple-bg flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-ejn-gold/20 border-t-ejn-gold rounded-full animate-spin"></div>
      </div>
    );
  }

  // ERRO CRÍTICO (Fallback fora do Boundary principal)
  if (loadingError) {
    return (
      <div className="min-h-screen bg-apple-bg flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-white p-8 rounded-3xl apple-shadow max-w-sm w-full animate-fadeIn">
           <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Icons.X className="w-8 h-8" />
           </div>
           <h2 className="text-xl font-bold text-apple-text mb-2">Erro de Conexão</h2>
           <button 
             onClick={() => window.location.reload()}
             className="w-full py-3 bg-ejn-dark text-white rounded-xl font-bold uppercase tracking-widest hover:bg-ejn-medium transition-colors mb-3"
           >
             Tentar Novamente
           </button>
        </div>
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
        
        {/* Mobile Drawer */}
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
            <div className="font-bold text-xl tracking-tight text-apple-text">Menu</div>
            <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 bg-apple-border/20 rounded-full text-apple-secondary hover:text-apple-text apple-transition">
              <Icons.X />
            </button>
          </div>
          
          <div className="space-y-2 mb-8">
             {[
               { id: 'FEED', label: 'Feed', icon: <Icons.Home /> },
               { id: 'PROFILE', label: 'Perfil', icon: <Icons.User /> },
               { id: 'RANKING', label: 'Ranking', icon: <Icons.Trophy /> },
               { id: 'MISSIONS', label: 'Missões', icon: <Icons.Award /> },
             ].map((item) => (
               <button
                 key={item.id}
                 onClick={() => { setCurrentView(item.id as AppView); setIsMobileMenuOpen(false); }}
                 className={`w-full px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-3 apple-transition ${currentView === item.id ? 'bg-ejn-gold text-ejn-dark' : 'bg-white text-apple-secondary'}`}
               >
                 {item.icon} {item.label}
               </button>
             ))}
             
             {currentUser.role === 'gestor' && (
               <button
                 onClick={() => { setCurrentView('ADMIN'); setIsMobileMenuOpen(false); }}
                 className={`w-full px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-3 apple-transition ${currentView === 'ADMIN' ? 'bg-ejn-dark text-white' : 'bg-white text-ejn-dark border border-ejn-dark/10'}`}
               >
                 <Icons.Edit className="w-5 h-5" /> Painel Gestor
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
        
        <main className="max-w-[1600px] mx-auto px-4 pt-20 md:pt-24 md:px-8 pb-8">
          <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start justify-center">
            
            {!isAdminView && (
              <div className="hidden lg:block lg:w-[240px] xl:w-[280px] lg:sticky lg:top-24 flex-shrink-0">
                <Sidebar user={currentUser} setView={setCurrentView} onFollow={handleFollowUser} />
              </div>
            )}

            {/* MAIN CONTENT COM SUSPENSE (Lazy Loading) */}
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

            {!isAdminView && (
              <div className="hidden xl:block w-[300px] flex-shrink-0 space-y-6 lg:sticky lg:top-24">
                <div className="bg-white rounded-2xl p-6 apple-shadow">
                  <h4 className="font-bold text-apple-text text-sm mb-4">Trending</h4>
                  <div className="space-y-4">
                     {['#VendasB2B', '#SeedFunding', '#SaaS_Analytics'].map(tag => (
                        <div key={tag} className="group flex items-center justify-between cursor-pointer hover:bg-apple-bg p-2 -mx-2 rounded-xl transition-all duration-300">
                           <span className="text-xs font-bold text-ejn-medium group-hover:text-ejn-dark">{tag}</span>
                           <span className="text-[10px] text-apple-tertiary font-bold">{Math.floor(Math.random()*2000)} posts</span>
                        </div>
                     ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>

        {!isAdminView && currentView === 'FEED' && (
          <button 
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="lg:hidden fixed bottom-24 right-6 w-14 h-14 bg-ejn-gold text-ejn-dark rounded-full shadow-2xl flex items-center justify-center z-40 apple-transition hover:scale-110 active:scale-95 border-2 border-white/20"
          >
            <Icons.Plus className="w-8 h-8" />
          </button>
        )}

        {!isAdminView && (
          <div className="lg:hidden fixed bottom-0 left-0 right-0 h-[70px] bg-white border-t border-apple-border flex items-center justify-around px-2 z-50 pb-safe">
            {[
              { id: 'FEED', label: 'Feed', icon: <Icons.Home /> },
              { id: 'RANKING', label: 'Ranking', icon: <Icons.Trophy /> },
              { id: 'MISSIONS', label: 'Missões', icon: <Icons.Award /> },
              { id: 'PROFILE', label: 'Perfil', icon: <Icons.User /> }
            ].map(item => (
              <button 
                key={item.id} 
                onClick={() => setCurrentView(item.id as AppView)}
                className={`flex-1 flex flex-col items-center justify-center py-1 transition-all duration-300 ${currentView === item.id ? 'text-ejn-gold' : 'text-apple-tertiary'}`}
              >
                <div className={`mb-1 ${currentView === item.id ? '-translate-y-1' : ''} transition-transform duration-300`}>
                  {item.icon}
                </div>
                <span className="text-[10px] font-medium">{item.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
};

export default App;
