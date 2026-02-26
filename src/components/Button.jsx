import React from 'react';

export default function Button({
  children,
  variant = 'primary',
  className = '',
  ...props
}) {
  const base =
    'inline-flex items-center justify-center rounded-md text-sm font-medium px-4 py-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed';

  const variants = {
    primary: 'bg-senac-orange text-slate-950 hover:bg-orange-400',
    outline:
      'border border-slate-700 text-slate-100 hover:border-senac-orange hover:text-senac-orange',
    ghost: 'text-slate-200 hover:bg-slate-800/60'
  };

  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}

