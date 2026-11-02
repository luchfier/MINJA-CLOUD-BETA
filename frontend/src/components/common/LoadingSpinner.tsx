import React from 'react';

export interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  label?: string;
  sublabel?: string;
  isOverlay?: boolean;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'lg',
  label,
  sublabel,
  isOverlay = false,
}) => {
  const sizeClasses = {
    sm: 'w-6 h-6 border-2',
    md: 'w-10 h-10 border-3',
    lg: 'w-16 h-16 border-4',
    xl: 'w-24 h-24 border-[5px]',
  }[size];

  const content = (
    <div className="flex flex-col items-center justify-center gap-4 text-center select-none">
      <div className="relative">
        {/* Glow behind spinner */}
        <div className="absolute inset-0 rounded-full blur-xl bg-amber-500/20" />
        <div
          className={`${sizeClasses} border-amber-500/20 border-t-amber-500 rounded-full animate-spin`}
        />
      </div>

      {label && (
        <h4 className="text-xl font-bold text-white tracking-wide mt-2">
          {label}
        </h4>
      )}

      {sublabel && (
        <p className="text-sm text-slate-400 max-w-sm">
          {sublabel}
        </p>
      )}
    </div>
  );

  if (isOverlay) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md">
        {content}
      </div>
    );
  }

  return content;
};
