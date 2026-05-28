-- ============================================================
-- R9 - Renove: Sistema de Gestão de Notebooks
-- Esquema SQL (DDL) - Módulo de Empréstimo
-- ============================================================

-- Tabela de Usuários (Alunos, Professores, TI)
CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    matricula VARCHAR(20) UNIQUE NOT NULL,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    senha_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('aluno', 'professor', 'ti')),
    curso VARCHAR(100),
    turma VARCHAR(20),
    ativo BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Notebooks
CREATE TABLE IF NOT EXISTS notebooks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patrimonio VARCHAR(30) UNIQUE NOT NULL,
    modelo VARCHAR(100) NOT NULL,
    marca VARCHAR(50),
    local VARCHAR(50) DEFAULT 'Estoque',
    status VARCHAR(20) NOT NULL DEFAULT 'Disponível'
        CHECK (status IN ('Disponível', 'Emprestado', 'Manutenção', 'Reservado')),
    condicao VARCHAR(20) DEFAULT 'Bom'
        CHECK (condicao IN ('Novo', 'Bom', 'Regular', 'Ruim')),
    observacoes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    usuario_id INTEGER,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
);

-- Tabela de Turmas
CREATE TABLE IF NOT EXISTS turmas (
    codigo_turma VARCHAR(50) PRIMARY KEY,
    nome_curso VARCHAR(100) NOT NULL,
    instrutor VARCHAR(100) NOT NULL,
    carga_horaria INTEGER NOT NULL,
    turno VARCHAR(50) NOT NULL,
    regime_dias VARCHAR(100) NOT NULL
);

-- Tabela de Reservas (Alocações prévias de turmas)
CREATE TABLE IF NOT EXISTS reservas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    turma_id VARCHAR(50) NOT NULL,
    data VARCHAR(50) NOT NULL,
    turno VARCHAR(50) NOT NULL,
    quantidade INTEGER NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'Pendente',
    usuario_id INTEGER,
    FOREIGN KEY (turma_id) REFERENCES turmas(codigo_turma) ON DELETE RESTRICT,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE RESTRICT
);

-- Tabela de Empréstimos (Movimentações)
CREATE TABLE IF NOT EXISTS emprestimos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    notebook_id INTEGER NOT NULL,
    usuario_id INTEGER NOT NULL,
    responsavel_id INTEGER,
    status VARCHAR(20) NOT NULL DEFAULT 'Ativo'
        CHECK (status IN ('Pendente', 'Ativo', 'Devolvido', 'Atrasado', 'Cancelado')),
    data_emprestimo TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_prevista_devolucao TIMESTAMP,
    data_devolucao TIMESTAMP,
    observacao_saida TEXT,
    observacao_devolucao TEXT,
    motivo VARCHAR(50),
    FOREIGN KEY (notebook_id) REFERENCES notebooks(id) ON DELETE RESTRICT,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE RESTRICT,
    FOREIGN KEY (responsavel_id) REFERENCES usuarios(id) ON DELETE RESTRICT
);

-- Tabela de Histórico/Movimentações (Log completo)
CREATE TABLE IF NOT EXISTS historico (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    notebook_id INTEGER NOT NULL,
    usuario_id INTEGER,
    responsavel_id INTEGER,
    tipo_movimentacao VARCHAR(30) NOT NULL
        CHECK (tipo_movimentacao IN (
            'EMPRESTIMO', 'DEVOLUCAO', 'MANUTENCAO_ENTRADA',
            'MANUTENCAO_SAIDA', 'RESERVA', 'CANCELAMENTO',
            'CADASTRO', 'ATUALIZACAO', 'ALERTA_ESCASSEZ'
        )),
    status_anterior VARCHAR(20),
    status_novo VARCHAR(20),
    descricao TEXT,
    metadata TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (notebook_id) REFERENCES notebooks(id) ON DELETE RESTRICT,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE RESTRICT,
    FOREIGN KEY (responsavel_id) REFERENCES usuarios(id) ON DELETE RESTRICT
);

-- Tabela de Configurações (Alertas, Parâmetros)
CREATE TABLE IF NOT EXISTS configuracoes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chave VARCHAR(50) UNIQUE NOT NULL,
    valor TEXT NOT NULL,
    descricao TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_notebooks_status ON notebooks(status);
CREATE INDEX IF NOT EXISTS idx_emprestimos_status ON emprestimos(status);
CREATE INDEX IF NOT EXISTS idx_emprestimos_notebook ON emprestimos(notebook_id);
CREATE INDEX IF NOT EXISTS idx_emprestimos_usuario ON emprestimos(usuario_id);
CREATE INDEX IF NOT EXISTS idx_historico_notebook ON historico(notebook_id);
CREATE INDEX IF NOT EXISTS idx_historico_tipo ON historico(tipo_movimentacao);
CREATE INDEX IF NOT EXISTS idx_usuarios_role ON usuarios(role);

-- Dados iniciais de configuração
INSERT OR IGNORE INTO configuracoes (chave, valor, descricao) VALUES
('alerta_escassez_percentual', '10', 'Percentual mínimo de notebooks disponíveis para disparar alerta'),
('tempo_maximo_emprestimo_horas', '4', 'Tempo máximo padrão de empréstimo em horas'),
('dia_alta_demanda', 'False', 'Indica se hoje é um dia de alta demanda e restrições de inventário'),
('limite_distribuicao_alta_demanda_percentual', '50', 'Percentual máximo de notebooks que podem ser emprestados em dias de alta demanda');

-- View para disponibilidade em tempo real
CREATE VIEW IF NOT EXISTS v_disponibilidade AS
SELECT
    (SELECT COUNT(*) FROM notebooks WHERE status = 'Disponível') as disponiveis,
    (SELECT COUNT(*) FROM notebooks WHERE status = 'Emprestado') as emprestados,
    (SELECT COUNT(*) FROM notebooks WHERE status = 'Manutenção') as manutencao,
    (SELECT COUNT(*) FROM notebooks WHERE status = 'Reservado') as reservados,
    (SELECT COUNT(*) FROM notebooks) as total,
    ROUND(
        (SELECT COUNT(*) FROM notebooks WHERE status = 'Disponível') * 100.0 /
        NULLIF((SELECT COUNT(*) FROM notebooks), 0),
        2
    ) as percentual_disponivel;

-- View para empréstimos ativos com detalhes
CREATE VIEW IF NOT EXISTS v_emprestimos_ativos AS
SELECT
    e.id,
    e.status,
    e.data_emprestimo,
    e.data_prevista_devolucao,
    e.observacao_saida,
    e.motivo,
    n.patrimonio as notebook_patrimonio,
    n.modelo as notebook_modelo,
    n.local as notebook_local,
    u.matricula as usuario_matricula,
    u.nome as usuario_nome,
    u.role as usuario_role,
    r.nome as responsavel_nome
FROM emprestimos e
JOIN notebooks n ON e.notebook_id = n.id
JOIN usuarios u ON e.usuario_id = u.id
LEFT JOIN usuarios r ON e.responsavel_id = r.id
WHERE e.status = 'Ativo';
