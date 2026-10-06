import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import DOMPurify from 'dompurify';
import {
  UploadSimple,
  FileXls,
  CheckCircle,
  WarningCircle,
  SpinnerGap,
  X,
  FileCsv,
  FileText,
  ArrowClockwise,
  Info,
  Sparkle,
  Users,
  UserPlus,
  BookOpen
} from '@phosphor-icons/react';
import { importarTurmaSIG } from '../../services/turmasService';
import Button from '../Button.jsx';
import Input from '../Input.jsx';

/**
 * Modal profissional para Importação em Lote de Turmas e Alunos via relatórios SIG.
 * Suporta planilhas .xlsx, .xls e .csv com detecção automática de metadados,
 * drag and drop interativo, barra de progresso e sanitização DOMPurify.
 */
export default function ModalImportarTurmaSIG({
  isOpen,
  onClose,
  onSuccess,
  turmaPreSelecionada = null
}) {
  // Estados de controle do fluxo
  // 'idle' | 'dragging' | 'selected' | 'uploading' | 'success' | 'error'
  const [step, setStep] = useState('idle');
  const [arquivo, setArquivo] = useState(null);
  const [codigoTurma, setCodigoTurma] = useState('');
  const [nomeCurso, setNomeCurso] = useState('');
  const [autoDetectTurma, setAutoDetectTurma] = useState(true);

  // Estados de feedback e progresso
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [resultado, setResultado] = useState(null);

  const fileInputRef = useRef(null);

  // Inicializar estado quando o modal abre ou muda a turma pré-selecionada
  useEffect(() => {
    if (isOpen) {
      setStep('idle');
      setArquivo(null);
      setUploadProgress(0);
      setErrorMessage('');
      setResultado(null);
      if (turmaPreSelecionada) {
        setCodigoTurma(turmaPreSelecionada.id || turmaPreSelecionada.codigo_turma || '');
        setNomeCurso(turmaPreSelecionada.curso || turmaPreSelecionada.nome_curso || '');
        setAutoDetectTurma(false);
      } else {
        setCodigoTurma('');
        setNomeCurso('');
        setAutoDetectTurma(true);
      }
    }
  }, [isOpen, turmaPreSelecionada]);

  if (!isOpen) return null;

  // Handlers de Drag and Drop
  function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    if (step !== 'uploading') {
      setStep('dragging');
    }
  }

  function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    if (step === 'dragging') {
      setStep(arquivo ? 'selected' : 'idle');
    }
  }

  function validarEAtribuirArquivo(file) {
    if (!file) return;

    const ext = file.name.split('.').pop().toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(ext)) {
      setErrorMessage('Formato inválido. Por favor, selecione uma planilha nos formatos .xlsx, .xls ou .csv.');
      setStep('error');
      return;
    }

    // Limite de 5 MB
    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('O arquivo excede o limite máximo permitido de 5 MB.');
      setStep('error');
      return;
    }

    setArquivo(file);
    setErrorMessage('');
    setStep('selected');
  }

  function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      validarEAtribuirArquivo(files[0]);
    }
  }

  function handleFileInputChange(e) {
    const files = e.target.files;
    if (files && files.length > 0) {
      validarEAtribuirArquivo(files[0]);
    }
  }

  function handleRemoverArquivo() {
    setArquivo(null);
    setStep('idle');
    setErrorMessage('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  // Envio para a API
  async function handleImportar(e) {
    if (e) e.preventDefault();

    if (!arquivo) {
      setErrorMessage('Selecione ou arraste um arquivo de relatório SIG para prosseguir.');
      return;
    }

    if (!autoDetectTurma && !codigoTurma.trim()) {
      setErrorMessage('Por favor, informe o Código da Turma ou ative a autodetecção.');
      return;
    }

    try {
      setStep('uploading');
      setUploadProgress(0);
      setErrorMessage('');

      const res = await importarTurmaSIG({
        arquivo,
        codigoTurma: autoDetectTurma ? null : codigoTurma,
        nomeCurso: nomeCurso.trim() || null,
        onUploadProgress: (pct) => setUploadProgress(pct)
      });

      setResultado(res);
      setStep('success');

      if (onSuccess) {
        onSuccess(res);
      }
    } catch (err) {
      console.error('Erro na importação SIG:', err);
      const detail = err.response?.data?.detail || 'Erro ao processar a importação da planilha do SIG.';
      setErrorMessage(detail);
      setStep('error');
    }
  }

  function formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }

  function getFileIcon(filename) {
    if (!filename) return <FileText size={32} className="text-slate-400" />;
    const ext = filename.split('.').pop().toLowerCase();
    if (ext === 'csv') return <FileCsv size={36} weight="duotone" className="text-amber-400" />;
    return <FileXls size={36} weight="duotone" className="text-emerald-400" />;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-black/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="relative w-full max-w-2xl bg-dark-900 border border-dark-600 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto"
      >
        {/* Header com gradiente Senac */}
        <div className="relative px-6 py-5 border-b border-dark-600 bg-gradient-to-r from-dark-800 to-dark-850 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary">
              <UploadSimple size={22} weight="bold" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-100 tracking-tight">Importação de Turma via SIG</h2>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30">
                  Lote .XLSX / .CSV
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Importe e atualize alunos e turmas diretamente de relatórios do Sistema Integrado de Gestão.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={step === 'uploading'}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-dark-700/60 transition-colors disabled:opacity-50"
            title="Fechar"
          >
            <X size={18} weight="bold" />
          </button>
        </div>

        {/* Corpo do Modal */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* SUCESSO: Exibição do Sumário Pós-Importação */}
          {step === 'success' && resultado && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-5"
            >
              <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-800/40 flex items-start gap-3">
                <CheckCircle size={24} weight="fill" className="text-emerald-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-emerald-300">Importação Concluída com Sucesso!</h3>
                  <p className="text-xs text-slate-300">
                    A turma <strong className="text-slate-100">{resultado.turma_codigo}</strong> foi processada com integridade atômica e dados sincronizados.
                  </p>
                </div>
              </div>

              {/* Cards de Métricas */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl bg-dark-800/60 border border-dark-600/60 text-center">
                  <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Total Lidos</div>
                  <div className="text-2xl font-black text-slate-100 mt-1 flex items-center justify-center gap-1">
                    <Users size={18} className="text-slate-400" />
                    {resultado.total_lidos}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-800/30 text-center">
                  <div className="text-[11px] font-medium text-emerald-400 uppercase tracking-wider">Novos Alunos</div>
                  <div className="text-2xl font-black text-emerald-400 mt-1 flex items-center justify-center gap-1">
                    <UserPlus size={18} />
                    {resultado.novos_alunos}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-primary/10 border border-primary/20 text-center">
                  <div className="text-[11px] font-medium text-primary uppercase tracking-wider">Atualizados</div>
                  <div className="text-2xl font-black text-primary mt-1 flex items-center justify-center gap-1">
                    <ArrowClockwise size={18} />
                    {resultado.alunos_atualizados}
                  </div>
                </div>
              </div>

              {/* Informações da Turma */}
              <div className="p-3.5 rounded-xl bg-dark-800/40 border border-dark-600/40 space-y-1 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Código da Turma:</span>
                  <span className="font-mono font-bold text-slate-200">{resultado.turma_codigo}</span>
                </div>
                {resultado.nome_curso && (
                  <div className="flex justify-between text-slate-400">
                    <span>Curso Associado:</span>
                    <span className="font-medium text-slate-200">{resultado.nome_curso}</span>
                  </div>
                )}
              </div>

              {/* Lista de Alertas / Linhas de Rodapé Descartadas (Higienizadas com DOMPurify) */}
              {resultado.erros && resultado.erros.length > 0 && (
                <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-800/30 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
                    <Info size={16} weight="bold" />
                    Notas de Processamento e Linhas Descartadas ({resultado.erros.length})
                  </div>
                  <ul className="text-[11px] text-slate-300 space-y-1 max-h-28 overflow-y-auto pl-2 divide-y divide-amber-900/20">
                    {resultado.erros.map((erro, idx) => (
                      <li
                        key={idx}
                        className="pt-1 text-slate-300"
                        dangerouslySetInnerHTML={{
                          __html: DOMPurify.sanitize(erro)
                        }}
                      />
                    ))}
                  </ul>
                </div>
              )}

              {/* Amostra dos Primeiros Alunos Processados */}
              {resultado.alunos_processados && resultado.alunos_processados.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-slate-400">
                    Alunos Processados (Primeiros {Math.min(resultado.alunos_processados.length, 5)}):
                  </span>
                  <div className="rounded-xl border border-dark-600/60 overflow-hidden divide-y divide-dark-600/40 text-xs">
                    {resultado.alunos_processados.slice(0, 5).map((aluno, i) => (
                      <div key={i} className="px-3 py-2 flex items-center justify-between bg-dark-800/30">
                        <div>
                          <div className="font-medium text-slate-200">{aluno.nome}</div>
                          <div className="text-[10px] font-mono text-slate-400">{aluno.matricula} • {aluno.email}</div>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          aluno.status === 'criado'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-primary/10 text-primary border border-primary/20'
                        }`}>
                          {aluno.status === 'criado' ? 'Novo' : 'Atualizado'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* FLUXO NORMAL: SELEÇÃO, UPLOAD E CONFIGURAÇÕES */}
          {step !== 'success' && (
            <div className="space-y-5">
              {/* Dropzone Interativa */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => {
                  if (step !== 'uploading' && fileInputRef.current) {
                    fileInputRef.current.click();
                  }
                }}
                className={`relative border-2 border-dashed rounded-2xl p-6 transition-all duration-300 cursor-pointer flex flex-col items-center justify-center text-center ${
                  step === 'dragging'
                    ? 'border-primary bg-primary/10 shadow-glow-primary scale-[1.01]'
                    : arquivo
                    ? 'border-emerald-500/50 bg-emerald-950/10'
                    : 'border-dark-600 hover:border-primary/50 hover:bg-dark-800/40'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileInputChange}
                  className="hidden"
                />

                {!arquivo ? (
                  <div className="space-y-3">
                    <div className="w-14 h-14 mx-auto rounded-2xl bg-dark-800 border border-dark-600 flex items-center justify-center text-primary group-hover:scale-110 transition-transform shadow-inner">
                      <UploadSimple size={28} weight="bold" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-200">
                        Clique para selecionar ou arraste o relatório do SIG aqui
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        Formatos suportados: <strong className="text-slate-300">.XLSX, .XLS ou .CSV</strong> (até 5 MB)
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="w-full flex items-center justify-between p-3 rounded-xl bg-dark-800/80 border border-dark-600">
                    <div className="flex items-center gap-3 overflow-hidden text-left">
                      {getFileIcon(arquivo.name)}
                      <div className="overflow-hidden">
                        <p className="text-sm font-bold text-slate-200 truncate">{arquivo.name}</p>
                        <p className="text-xs text-slate-400">{formatBytes(arquivo.size)}</p>
                      </div>
                    </div>
                    {step !== 'uploading' && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoverArquivo();
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-dark-700 transition-colors"
                        title="Remover arquivo"
                      >
                        <X size={18} weight="bold" />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Barra de Progresso Durante Upload */}
              {step === 'uploading' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="space-y-2 p-4 rounded-xl bg-dark-800/50 border border-dark-600"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 text-slate-300 font-medium">
                      <SpinnerGap size={16} className="animate-spin text-primary" />
                      Processando e sincronizando dados com o banco...
                    </span>
                    <span className="font-mono font-bold text-primary">{uploadProgress}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-dark-700 overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-primary to-amber-500 rounded-full"
                      style={{ width: `${uploadProgress}%` }}
                      transition={{ ease: 'easeOut' }}
                    />
                  </div>
                </motion.div>
              )}

              {/* Configurações de Turma e Metadados */}
              <div className="p-4 rounded-xl bg-dark-800/30 border border-dark-600/50 space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <BookOpen size={16} className="text-primary" />
                    Parâmetros da Turma
                  </label>
                  <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={autoDetectTurma}
                      onChange={(e) => setAutoDetectTurma(e.target.checked)}
                      className="rounded border-dark-600 text-primary focus:ring-primary bg-dark-700"
                    />
                    <Sparkle size={14} className="text-amber-400" />
                    Autodetectar da planilha
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">
                      Código da Turma {autoDetectTurma ? '(Opcional se presente no SIG)' : '*'}
                    </label>
                    <input
                      type="text"
                      value={codigoTurma}
                      onChange={(e) => {
                        setCodigoTurma(e.target.value);
                        if (autoDetectTurma) setAutoDetectTurma(false);
                      }}
                      placeholder={autoDetectTurma ? 'Extrair do arquivo automaticamente' : 'Ex: 2026.1-DS-N1'}
                      className="w-full bg-dark-700/60 border border-dark-600 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-primary transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">
                      Nome do Curso (Opcional)
                    </label>
                    <input
                      type="text"
                      value={nomeCurso}
                      onChange={(e) => setNomeCurso(e.target.value)}
                      placeholder="Ex: Técnico em Desenvolvimento de Sistemas"
                      className="w-full bg-dark-700/60 border border-dark-600 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-primary transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Mensagem de Erro com Sanitização DOMPurify */}
              <AnimatePresence>
                {errorMessage && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="p-3.5 rounded-xl bg-red-950/30 border border-red-800/40 flex items-start gap-2.5"
                  >
                    <WarningCircle size={20} weight="fill" className="text-red-400 shrink-0 mt-0.5" />
                    <div
                      className="text-xs text-red-300"
                      dangerouslySetInnerHTML={{
                        __html: DOMPurify.sanitize(errorMessage)
                      }}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Rodapé com Ações */}
        <div className="px-6 py-4 border-t border-dark-600 bg-dark-850 flex items-center justify-end gap-3">
          {step === 'success' ? (
            <Button
              onClick={() => {
                onClose();
              }}
              variant="cyan"
              className="px-5 py-2 text-xs font-bold"
            >
              Concluir e Atualizar Turmas
            </Button>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                disabled={step === 'uploading'}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-dark-700/60 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <Button
                onClick={handleImportar}
                disabled={!arquivo || step === 'uploading'}
                variant="cyan"
                className="px-5 py-2 text-xs font-bold flex items-center gap-2"
              >
                {step === 'uploading' ? (
                  <>
                    <SpinnerGap size={16} className="animate-spin" />
                    Importando...
                  </>
                ) : (
                  <>
                    <UploadSimple size={16} weight="bold" />
                    Iniciar Importação
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
