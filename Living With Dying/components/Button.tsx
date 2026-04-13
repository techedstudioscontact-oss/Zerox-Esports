import React from 'react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'glass';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading,
  className = '',
  disabled,
  onClick,
  ...props
}) => {

  const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!disabled && !isLoading) {
      try {
        await Haptics.impact({ style: ImpactStyle.Light });
      } catch (err) {
        // Ignore haptics error on web
      }
    }
    if (onClick) onClick(e);
  };

  const baseStyles = "inline-flex items-center justify-center rounded-lg font-medium transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-95 hover:scale-[1.02] hover:-translate-y-0.5 hover:shadow-lg";

  const variants = {
    primary: "bg-gradient-to-r from-purple-600 to-accent text-white hover:shadow-[0_0_20px_rgba(225,29,72,0.5)] border border-transparent",
    secondary: "bg-surfaceHighlight text-white hover:bg-zinc-800 border border-zinc-700",
    outline: "bg-transparent border border-zinc-600 text-zinc-300 hover:border-textMain hover:text-white",
    danger: "bg-red-900/50 text-red-200 border border-red-800 hover:bg-red-900",
    glass: "bg-white/10 backdrop-blur-md text-white border border-white/10 hover:bg-white/20"
  };

  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-5 py-2.5 text-sm",
    lg: "px-8 py-3.5 text-base font-bold tracking-wide"
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={isLoading || disabled}
      onClick={handleClick}
      {...props}
    >
      {isLoading ? (
        <span className="flex items-center gap-2">
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Loading...
        </span>
      ) : children}
    </button>
  );
};
