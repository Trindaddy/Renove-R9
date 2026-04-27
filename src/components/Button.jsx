import React from 'react';

export default function Button({
  children,
  variant = 'primary',
  className = '',
  ...props
}) {
  const base =
    'inline-flex items-center justify-center rounded-lg text-sm font-semibold px-5 py-2.5 transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]';

  const variants = {
    primary: 
      'bg-alert text-navy-900 hover:bg-alert/90 hover:shadow-glow-alert border border-alert/20',
    outline:
      'border border-navy-500/50 text-slate-100 hover:border-cyan/40 hover:text-cyan hover:shadow-glow-cyan',
    ghost: 'text-slate-300 hover:bg-navy-600/40 hover:text-cyan',
    danger: 'bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20',
    success: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20',
    cyan: 'bg-cyan-dim text-cyan border border-cyan/20 hover:bg-cyan/20 hover:shadow-glow-cyan',
  };

  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}

