import React from 'react';
import { motion } from 'framer-motion';

export default function Button({
  children,
  variant = 'primary',
  className = '',
  ...props
}) {
  const base =
    'inline-flex items-center justify-center rounded-lg text-sm font-semibold px-5 py-2.5 transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed';

  const variants = {
    primary: 
      'bg-primary text-slate-100 hover:bg-primary/90 hover:shadow-glow-primary border border-primary/50',
    accent:
      'bg-accent text-dark-900 hover:bg-accent/90 hover:shadow-glow-accent border border-accent/20',
    outline:
      'border border-dark-600 text-slate-100 hover:border-primary/40 hover:text-primary hover:shadow-glow-primary',
    ghost: 'text-slate-300 hover:bg-dark-700/40 hover:text-primary',
    danger: 'bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20',
    success: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20',
  };

  return (
    <motion.button 
      whileTap={{ scale: 0.96, y: 1 }}
      whileHover={{ y: -1 }}
      className={`${base} ${variants[variant]} ${className}`} 
      {...props}
    >
      {children}
    </motion.button>
  );
}

