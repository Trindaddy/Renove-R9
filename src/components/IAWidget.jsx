import React, { useEffect, useState, useCallback } from 'react';
import api from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, TrendingUp, Warning, Users, Package, CheckCircle, ArrowsClockwise } from '@phosphor-icons/react';

const PRIORITY_CONFIG = {
  critica: { color: 'text-red-400', bg: 'bg-red-950/30 border-red-800/30', dot: 'bg-red-500', label: 'Crítico' },
  alta:    { color: 'text-amber-400', bg: 'bg-amber-950/20 border-amber-800/30', dot: 'bg-amber-500', label: 'Alto' },
  media:   { color: 'text-primary', bg: 'bg-primary/5 border-primary/20', dot: 'bg-primary', label: 'Médio' },
  baixa:   { color: 'text-emerald-400', bg: 'bg-emerald-950/20 border-emerald-800/30', dot: 'bg-emerald-500', label: 'Normal' },
};

const ICON_MAP = {
  'trending-up': TrendingUp,
  'users': Users,
  'warning': Warning,
  'package': Package,
  'alert-circle': Warning,
  'check-circle': CheckCircle,
};

export default function IAWidget() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/ia/insights');
      setData(res.data);
    } catch (err) {
      if (err.response?.status !== 403) {
        setError('Não foi possível carregar os insights.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (error) return null; // silencia erros de permissão
  if (!data && !loading) return null;

  const criticalCount = data?.insights?.filter(i => i.prioridade === 'critica').length ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-5"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Brain weight="duotone" className="text-primary" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-100">IA Preditiva</h3>
            <p className="text-[10px] text-slate-500">
              {data ? `${data.total_emprestimos_analisados} empréstimos analisados — ${data.periodo_analise_dias} dias` : 'Analisando...'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {criticalCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 text-[10px] font-bold border border-red-500/20">
              {criticalCount} crítico{criticalCount > 1 ? 's' : ''}
            </span>
          )}
          <button
            onClick={load}
            disabled={loading}
            className="h-7 w-7 rounded-lg border border-dark-600 hover:border-primary/40 flex items-center justify-center text-slate-400 hover:text-primary transition-all"
          >
            <ArrowsClockwise size={13} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Taxa de Devolução */}
      {data && (
        <div className="mb-4 p-2.5 rounded-xl bg-dark-700/30 border border-dark-600/50">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Taxa de Devolução (60 dias)</span>
            <span className="text-sm font-black text-slate-100">{data.taxa_devolucao_percentual}%</span>
          </div>
          <div className="h-1.5 bg-dark-600 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${data.taxa_devolucao_percentual}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className={`h-full rounded-full ${
                data.taxa_devolucao_percentual >= 90 ? 'bg-emerald-500'
                : data.taxa_devolucao_percentual >= 70 ? 'bg-amber-500'
                : 'bg-red-500'
              }`}
            />
          </div>
        </div>
      )}

      {/* Insights */}
      <div className="space-y-2">
        {loading && [
          <div key="s1" className="h-12 bg-dark-700/50 rounded-xl animate-pulse" />,
          <div key="s2" className="h-12 bg-dark-700/50 rounded-xl animate-pulse" />,
        ]}

        {!loading && data?.insights?.map((insight, idx) => {
          const cfg = PRIORITY_CONFIG[insight.prioridade] ?? PRIORITY_CONFIG.baixa;
          const IconComp = ICON_MAP[insight.icone] ?? Brain;
          const isOpen = expanded === idx;

          return (
            <motion.div
              key={idx}
              layout
              className={`rounded-xl border p-3 cursor-pointer transition-all ${cfg.bg} hover:scale-[1.01]`}
              onClick={() => setExpanded(isOpen ? null : idx)}
            >
              <div className="flex items-start gap-2.5">
                <span className={`mt-0.5 h-1.5 w-1.5 rounded-full shrink-0 ${cfg.dot}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-xs font-bold ${cfg.color} truncate`}>{insight.titulo}</p>
                    <span className={`text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-full border ${cfg.bg} ${cfg.color} shrink-0`}>
                      {cfg.label}
                    </span>
                  </div>
                  <AnimatePresence>
                    {isOpen && (
                      <motion.p
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="text-[11px] text-slate-400 mt-1.5 leading-relaxed overflow-hidden"
                      >
                        {insight.descricao}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>
                <IconComp size={14} className={`${cfg.color} shrink-0 mt-0.5`} weight="duotone" />
              </div>
            </motion.div>
          );
        })}
      </div>

      {data && (
        <p className="mt-3 text-[10px] text-slate-600 text-center">
          Gerado em: {new Date(data.gerado_em).toLocaleString('pt-BR')}
        </p>
      )}
    </motion.div>
  );
}
