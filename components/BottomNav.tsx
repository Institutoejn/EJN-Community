
import React from 'react';
import { AppView, User } from '../types';
import { Icons } from '../constants';

interface BottomNavProps {
  currentView: AppView;
  setView: (view: AppView) => void;
  user: User;
}

const BottomNav: React.FC<BottomNavProps> = ({ currentView, setView, user }) => {
  const navItems = [
    { id: 'FEED', label: 'Feed', icon: <Icons.Home /> },
    { id: 'RANKING', label: 'Rank', icon: <Icons.Trophy /> },
    { id: 'MISSIONS', label: 'Missões', icon: <Icons.Award /> },
    { id: 'PROFILE', label: 'Perfil', icon: <Icons.User /> },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-16 glass border-t border-apple-border z-[90] flex items-center justify-around px-2 pb-safe">
      {navItems.map((item) => {
        const isActive = currentView === item.id;
        return (
          <button
            key={item.id}
            onClick={() => setView(item.id as AppView)}
            className="flex flex-col items-center justify-center gap-1 w-16 h-full relative"
          >
            <div className={`apple-transition ${isActive ? 'text-ejn-gold scale-110' : 'text-apple-secondary'}`}>
              {item.icon}
            </div>
            <span className={`text-[9px] font-bold uppercase tracking-wider apple-transition ${isActive ? 'text-ejn-dark' : 'text-apple-tertiary'}`}>
              {item.label}
            </span>
            {isActive && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-ejn-gold rounded-full" />
            )}
          </button>
        );
      })}
    </nav>
  );
};

export default BottomNav;
