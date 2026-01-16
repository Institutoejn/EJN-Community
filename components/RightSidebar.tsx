import React, { useEffect, useState } from 'react';
import { TrendingTopic } from '../types';
import { storage } from '../services/storage';

interface RightSidebarProps {
  onTagClick?: (tag: string) => void;
}

const RightSidebar: React.FC<RightSidebarProps> = ({ onTagClick }) => {
  const [trends, setTrends] = useState<TrendingTopic[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrending = async () => {
      try {
        const data = await storage.getTrending();
        setTrends(data);
      } catch (e) {
        console.error("Failed to load trending topics");
      } finally {
        setLoading(false);
      }
    };
    fetchTrending();
  }, []);

  return (
    <div className="hidden xl:block w-[300px] flex-shrink-0 space-y-6 lg:sticky lg:top-24 animate-fadeIn">
      <div className="bg-white rounded-2xl p-6 apple-shadow">
        <h4 className="font-bold text-apple-text text-sm mb-4 flex items-center gap-2">
           <span>🔥</span> Trending Topics
        </h4>
        
        {loading ? (
            <div className="space-y-4">
                {[1,2,3].map(i => (
                    <div key={i} className="animate-pulse flex justify-between">
                        <div className="h-4 bg-gray-200 rounded w-24"></div>
                        <div className="h-4 bg-gray-200 rounded w-8"></div>
                    </div>
                ))}
            </div>
        ) : trends.length === 0 ? (
            <div className="text-center py-4">
                <p className="text-xs text-apple-secondary">Nenhuma hashtag em alta ainda. Seja o primeiro a usar uma!</p>
            </div>
        ) : (
            <div className="space-y-2">
                {trends.map(t => (
                <div 
                    key={t.tag} 
                    onClick={() => onTagClick && onTagClick(t.tag)}
                    className="group flex items-center justify-between cursor-pointer hover:bg-apple-bg p-2 -mx-2 rounded-xl transition-all duration-300"
                >
                    <span className="text-xs font-bold text-ejn-medium group-hover:text-ejn-dark">{t.tag}</span>
                    <span className="text-[10px] text-apple-tertiary font-bold bg-apple-bg group-hover:bg-white px-2 py-1 rounded-md">{t.count} posts</span>
                </div>
                ))}
            </div>
        )}
      </div>

      <div className="bg-ejn-gold/10 rounded-2xl p-6 border border-dashed border-ejn-gold/30">
        <p className="text-[10px] font-bold text-ejn-medium uppercase tracking-widest text-center">
            Use hashtags (#) nos seus posts para aparecer aqui!
        </p>
      </div>
    </div>
  );
};

export default RightSidebar;
