import type { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

const variants = {
  primary: 'bg-game-accent hover:bg-game-accent/85 text-white shadow-md shadow-game-accent/20',
  secondary: 'bg-game-surface hover:bg-game-surface/80 text-white/90 border border-white/10',
  danger: 'bg-red-600 hover:bg-red-500 text-white shadow-md shadow-red-600/20',
};

const sizes = {
  sm: 'px-5 py-2 text-xs',
  md: 'px-7 py-3 text-sm',
  lg: 'px-9 py-4 text-base',
};

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`font-game font-bold tracking-wide rounded-2xl transition-all duration-200
        active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed
        ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
