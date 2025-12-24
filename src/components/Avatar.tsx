'use client';

import { motion } from 'framer-motion';
import { getAvatarColor } from '@/lib/constants';

interface AvatarProps {
  name: string;
  avatarUrl?: string | null;
  index: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  claimed?: boolean;
  onClick?: () => void;
  draggable?: boolean;
}

const sizeClasses = {
  sm: 'w-10 h-10 text-sm',
  md: 'w-14 h-14 text-lg',
  lg: 'w-20 h-20 text-2xl',
  xl: 'w-28 h-28 text-3xl',
};

export function Avatar({
  name,
  avatarUrl,
  index,
  size = 'md',
  className = '',
  claimed = false,
  onClick,
  draggable = false,
}: AvatarProps) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const bgColor = getAvatarColor(index);

  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={`
        ${sizeClasses[size]}
        rounded-full flex items-center justify-center
        font-bold text-white cursor-pointer
        shadow-lg transition-all
        ${claimed ? 'ring-4 ring-[var(--success)] ring-offset-2 ring-offset-[var(--background)]' : ''}
        ${draggable ? 'cursor-grab active:cursor-grabbing' : ''}
        ${className}
      `}
      style={{
        backgroundColor: avatarUrl ? 'transparent' : bgColor,
        backgroundImage: avatarUrl ? `url(${avatarUrl})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
      onClick={onClick}
    >
      {!avatarUrl && initials}
    </motion.div>
  );
}

export function AvatarWithName({
  name,
  avatarUrl,
  index,
  size = 'md',
  claimed = false,
  onClick,
}: AvatarProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="flex flex-col items-center gap-2 cursor-pointer"
      onClick={onClick}
    >
      <Avatar
        name={name}
        avatarUrl={avatarUrl}
        index={index}
        size={size}
        claimed={claimed}
      />
      <span className="text-sm font-medium text-center max-w-20 truncate">
        {name}
      </span>
      {claimed && (
        <span className="text-xs text-[var(--success)]">✓ Connecté</span>
      )}
    </motion.div>
  );
}

