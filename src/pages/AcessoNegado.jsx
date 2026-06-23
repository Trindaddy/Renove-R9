import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldWarning, ArrowLeft } from '@phosphor-icons/react';
import { motion } from 'framer-motion';

export default function AcessoNegado() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-950 px-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full relative group"
      >
        {/* Glow Effect */}
        <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-red-500/20 to-orange-500/20 blur-xl opacity-75 transition-all group-hover:opacity-100 duration-500" />
        
        {/* Card Content */}
        <div className="relative bg-dark-900/60 border border-dark-600/40 backdrop-blur-xl p-8 rounded-2xl text-center flex flex-col items-center">
          
          {/* Animated Warning Icon */}
          <motion.div 
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
            className="h-16 w-16 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center text-red-400 mb-6 shadow-[0_0_15px_rgba(239,68,68,0.1)]"
          >
            <ShieldWarning className="h-9 w-9" weight="duotone" />
          </motion.div>

          <h1 className="text-2xl font-black text-slate-100 mb-2 uppercase tracking-wide">
            Acesso Restrito
          </h1>
          <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest bg-red-500/10 border border-red-500/20 px-2.5 py-1 rounded-full mb-6">
            Erro 403 - Forbidden
          </span>

          <p className="text-sm text-slate-400 mb-8 leading-relaxed">
            Seu perfil atual não possui as permissões necessárias para acessar este recurso. Se você acredita que isso é um equívoco, entre em contato com a equipe de TI do Renove.
          </p>

          <Link
            to="/"
            className="flex items-center justify-center gap-2 w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-primary to-primary-hover hover:from-primary-hover hover:to-primary text-white text-xs font-semibold uppercase tracking-wider transition-all duration-300 shadow-lg shadow-primary/20 hover:shadow-primary/30"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar ao Painel</span>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
