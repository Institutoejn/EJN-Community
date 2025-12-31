
import React, { useState, useEffect, Suspense, lazy } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Auth from './components/Auth';
import BottomNav from './components/BottomNav'; // Importando a nova barra
import ErrorBoundary from './components/ErrorBoundary';
import { User, AppView } from './types';
import { storage } from './services/storage';
import { supabase } from './services/supabase';
import { Icons } from './constants';

// --- LAZY LOADING ---
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

    const initApp = async () => {
      const cachedUser = await storage.getCurrentUser(true);
      if (cachedUser) {
          if (mounted) {
              setCurrentUser(cachedUser);
              setLoading(false); 
          }
      }

      try {
          const freshUser = await storage.getCurrentUser(false); 
          if (mounted) {
             if (freshUser) {
                 setCurrentUser(freshUser);
             } else if (!cachedUser) {
                 setCurrentUser(null);
             }
             setLoading(false);
          }
      } catch (err) {
          if (!cachedUser && mounted) setLoading(false);
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
        {/* Drawer Mobile (Lateral) - Mantido para funções extras e Admin */}
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
        
        {/* Barra de Navegação Inferior (Exclusiva Mobile) */}
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
      </div>
    </ErrorBoundary>
  );
};

export default App;
