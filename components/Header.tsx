
import React, { useState, useRef, useEffect } from 'react';
import { Icons } from '../constants';
import { User, AppView, Notification } from '../types';

interface HeaderProps {
  user: User;
  currentView: AppView;
  setView: (view: AppView) => void;
  onLogout: () => void;
  onToggleMenu?: () => void;
}

const Header: React.FC<HeaderProps> = ({ user, currentView, setView, onLogout, onToggleMenu }) => {
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([
    { id: '1', type: 'XP', title: 'XP Recebido!', content: '50 XP por publicar.', timestamp: 'Há 2 min', isRead: false }
  ]);

  const notificationRef = useRef<HTMLDivElement>(null);
  const unreadCount = notifications.filter(n => !n.isRead).length;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isAdminView = currentView === 'ADMIN';

  return (
    <header className="fixed top-0 left-0 right-0 h-16 glass z-50 border-b border-apple-border flex items-center px-4 md:px-8">
      <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Hamburger Menu Button (Mobile Only) */}
          <button 
            onClick={onToggleMenu}
            className="lg:hidden p-2 text-apple-text hover:bg-apple-bg rounded-full transition-colors"
          >
            <Icons.Menu />
          </button>

          <div onClick={() => setView('FEED')} className="flex items-center gap-2 cursor-pointer group">
            <div className="w-8 h-8 md:w-9 md:h-9 bg-ejn-dark rounded-xl flex items-center justify-center font-bold text-ejn-gold shadow-sm group-hover:scale-105 transition-transform">E</div>
            <span className="font-bold text-base md:text-lg tracking-tight text-apple-text">
              {isAdminView ? <span className="text-ejn-medium">Gestão <span className="hidden sm:inline">Administrativa</span></span> : <>Rede <span className="text-ejn-medium">EJN</span></>}
            </span>
          </div>
        </div>

        <nav className="hidden lg:flex items-center gap-1">
          {!isAdminView ? (
            // Menu Normal do Aluno
            <>
              {[
                { id: 'FEED', label: 'Feed', icon: <Icons.Home /> },
                { id: 'PROFILE', label: 'Perfil', icon: <Icons.User /> },
                { id: 'RANKING', label: 'Ranking', icon: <Icons.Trophy /> },
                { id: 'MISSIONS', label: 'Missões', icon: <Icons.Award /> },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setView(item.id as AppView)}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 apple-transition ${currentView === item.id ? 'bg-ejn-gold text-ejn-dark' : 'text-apple-secondary hover:bg-apple-bg hover:text-apple-text'}`}
                >
                  {item.icon} {item.label}
                </button>
              ))}
              
              {user.role === 'gestor' && (
                <button
                  onClick={() => setView('ADMIN')}
                  className="ml-4 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 border-2 border-dashed text-ejn-dark border-ejn-dark/30 hover:bg-ejn-dark hover:text-white apple-transition"
                >
                  ⚙️ Painel Admin
                </button>
              )}
            </>
          ) : (
            // Menu Simplificado do Admin (Apenas Voltar)
            <button
              onClick={() => setView('FEED')}
              className="px-6 py-2 bg-ejn-dark text-white rounded-full text-xs font-bold uppercase tracking-widest hover:scale-105 active:scale-95 apple-transition"
            >
              ← Voltar para a Rede
            </button>
          )}
        </nav>

        <div className="flex items-center gap-2 md:gap-3">
          <div className="relative" ref={notificationRef}>
            <button onClick={() => setIsNotificationsOpen(!isNotificationsOpen)} className={`p-2 rounded-full relative ${isNotificationsOpen ? 'bg-ejn-gold text-ejn-dark scale-110' : 'text-apple-secondary hover:text-ejn-gold hover:bg-apple-bg'}`}>
              <Icons.Bell className="w-5 h-5" />
              {unreadCount > 0 && <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>}
            </button>
            {isNotificationsOpen && (
              <div className="absolute right-0 mt-3 w-72 md:w-80 bg-white rounded-3xl apple-shadow border border-apple-border overflow-hidden animate-fadeIn z-[60]">
                <div className="px-6 py-4 bg-apple-bg/50 border-b border-apple-border flex justify-between items-center text-xs font-black uppercase">Notificações</div>
                <div className="max-h-[300px] overflow-y-auto">
                   {notifications.map(n => <div key={n.id} className="p-4 border-b border-apple-bg hover:bg-apple-bg cursor-pointer text-xs">{n.title}</div>)}
                </div>
              </div>
            )}
          </div>
          <button onClick={onLogout} className="text-apple-secondary hover:text-red-500 p-2 rounded-full hover:bg-red-50 transition-colors"><Icons.Logout className="w-5 h-5" /></button>
        </div>
      </div>
    </header>
  );
};

export default Header;
