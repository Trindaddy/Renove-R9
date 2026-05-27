import React from 'react';
import { motion } from 'framer-motion';
import { Laptop, CheckCircle, Warning, XCircle } from '@phosphor-icons/react';

export default function DashboardCards({ stats, alerta }) {
  if (!stats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => (
          <div key={i} className={`glass-card p-5 h-32 shimmer ${i === 1 ? 'md:col-span-2' : ''}`} />
        ))}
      </div>
    );
  }

  const percentual = stats.percentual_disponivel || 0;
  const barColor = percentual < 10 ? 'bg-accent' : percentual < 30 ? 'bg-peach' : 'bg-primary';
  const barGlow = percentual < 10 ? 'shadow-glow-accent' : 'shadow-glow-primary';

  return (
    <motion.div 
      initial="hidden" 
      animate="visible" 
      variants={{
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
      }}
      className="space-y-4"
    >
      {/* Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Card 1 - Destaque */}
        <motion.div
          variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}
          className="glass-card p-6 md:col-span-2 relative overflow-hidden group border-primary/20 hover:border-primary/40 transition-all duration-500"
        >
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-primary/10 blur-3xl opacity-50 group-hover:opacity-80 transition-opacity" />
          <div className="relative h-full flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <Laptop weight="duotone" className="text-3xl text-primary glow-text-primary" />
              <span className="text-[10px] uppercase tracking-widest text-slate-400">Prontos para uso</span>
            </div>
            <div>
              <p className="text-5xl font-black tracking-tighter text-slate-100 mb-1">
                {stats.disponiveis || 0}
              </p>
              <p className="text-sm text-slate-400 font-medium">Notebooks Disponíveis</p>
            </div>
          </div>
        </motion.div>

        {/* Card 2 */}
        <motion.div
          variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}
          className="glass-card p-5 relative overflow-hidden group border-dark-600 hover:border-slate-500/30 transition-all duration-500"
        >
          <div className="flex items-center justify-between mb-3">
            <CheckCircle weight="duotone" className="text-2xl text-slate-300" />
            <span className="text-[10px] uppercase tracking-wider text-slate-500">Unidades</span>
          </div>
          <p className="text-3xl font-black tracking-tight text-slate-100">{stats.total || 0}</p>
          <p className="text-xs text-slate-400 mt-1 font-medium">Total Cadastrado</p>
        </motion.div>

        {/* Card 3 */}
        <motion.div
          variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}
          className="glass-card p-5 relative overflow-hidden group border-accent/20 hover:border-accent/40 transition-all duration-500"
        >
          <div className="absolute -top-10 -right-10 w-24 h-24 rounded-full bg-accent/10 blur-2xl opacity-50 group-hover:opacity-80 transition-opacity" />
          <div className="flex items-center justify-between mb-3">
            <Warning weight="duotone" className="text-2xl text-accent glow-text-accent" />
            <span className="text-[10px] uppercase tracking-wider text-slate-500">Empréstimos</span>
          </div>
          <p className="text-3xl font-black tracking-tight text-accent glow-text-accent">{stats.emprestados || 0}</p>
          <p className="text-xs text-slate-400 mt-1 font-medium">Em Uso</p>
        </motion.div>
      </div>

      {/* Availability Bar (Futuristic style) */}
      <motion.div 
        variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}
        className="glass-card p-5 border-dark-600"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <span className="text-[10px] uppercase tracking-[0.25em] text-slate-400 font-bold">Saúde do Parque</span>
            {alerta?.alerta_ativo && (
              <span className="px-2.5 py-1 rounded-sm bg-accent/10 border border-accent/30 text-accent text-[10px] font-bold uppercase tracking-widest animate-pulse-slow">
                Escassez Detectada
              </span>
            )}
          </div>
          <span className={`text-xl font-black font-mono tracking-tighter ${percentual < 10 ? 'text-accent glow-text-accent' : 'text-primary glow-text-primary'}`}>
            {percentual.toFixed(1)}%
          </span>
        </div>
        
        {/* Progress Bar Container */}
        <div className="h-2.5 w-full bg-dark-900 rounded-sm overflow-hidden border border-dark-700 p-[1px]">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.max(percentual, 3)}%` }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className={`h-full rounded-sm ${barColor} ${barGlow}`}
          />
        </div>
        
        <div className="flex justify-between mt-2 font-mono">
          <span className="text-[10px] text-dark-500">0%</span>
          <span className="text-[10px] text-dark-500">50%</span>
          <span className="text-[10px] text-dark-500">100%</span>
        </div>
      </motion.div>
    </motion.div>
  );
}

