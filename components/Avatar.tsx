
import React from 'react';

interface AvatarProps {
  name: string;
  bgColor: string;
  url?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const Avatar: React.FC<AvatarProps> = ({ name, bgColor, url, size = 'md', className = "" }) => {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const sizeClasses = {
    xs: 'w-8 h-8 text-[10px]',
    sm: 'w-10 h-10 text-xs',
    md: 'w-12 h-12 text-sm',
    lg: 'w-20 h-20 text-xl font-semibold',
    xl: 'w-32 h-32 text-3xl font-bold'
  };

  return (
    <div className={`
      ${sizeClasses[size]} 
      ${url ? 'bg-apple-bg' : bgColor} 
      rounded-full 
      flex items-center justify-center 
      text-white 
      shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)]
      shrink-0
      overflow-hidden
      ${className}
    `}>
      {url ? (
        <img 
          src={url} 
          alt={name} 
          className="w-full h-full object-cover" 
          loading="lazy"
          decoding="async"
        />
      ) : (
        initials
      )}
    </div>
  );
};

export default Avatar;
