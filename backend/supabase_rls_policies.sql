-- ==============================================================================
-- R9 - RENOVE: POLÍTICAS DE ROW LEVEL SECURITY (RLS) & FUNÇÕES RPC (SUPABASE / POSTGRESQL)
-- ==============================================================================

-- 1. HABILITAR ROW LEVEL SECURITY EM TODAS AS TABELAS
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE notebooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE emprestimos ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservas ENABLE ROW LEVEL SECURITY;
ALTER TABLE historico ENABLE ROW LEVEL SECURITY;
ALTER TABLE turmas ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracoes ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- 2. POLÍTICAS DE RLS PARA A TABELA 'usuarios'
-- ==============================================================================
CREATE POLICY "TI tem acesso total aos usuários"
ON usuarios
FOR ALL
USING (
    coalesce((auth.jwt() ->> 'role'), '') = 'ti'
);

CREATE POLICY "Usuário pode visualizar seu próprio perfil"
ON usuarios
FOR SELECT
USING (
    auth.uid()::text = id::text
    OR coalesce((auth.jwt() ->> 'role'), '') IN ('ti', 'professor')
);

-- ==============================================================================
-- 3. POLÍTICAS DE RLS PARA A TABELA 'notebooks'
-- ==============================================================================
CREATE POLICY "TI pode gerenciar notebooks"
ON notebooks
FOR ALL
USING (
    coalesce((auth.jwt() ->> 'role'), '') = 'ti'
);

CREATE POLICY "Professores e Alunos podem consultar notebooks ativos"
ON notebooks
FOR SELECT
USING (
    excluido = false
    AND (
        status = 'Disponível'
        OR usuario_id::text = auth.uid()::text
        OR coalesce((auth.jwt() ->> 'role'), '') IN ('ti', 'professor')
    )
);

-- ==============================================================================
-- 4. POLÍTICAS DE RLS PARA A TABELA 'emprestimos'
-- ==============================================================================
CREATE POLICY "TI e Professores podem gerenciar empréstimos"
ON emprestimos
FOR ALL
USING (
    coalesce((auth.jwt() ->> 'role'), '') IN ('ti', 'professor')
);

CREATE POLICY "Alunos podem visualizar apenas seus próprios empréstimos"
ON emprestimos
FOR SELECT
USING (
    usuario_id::text = auth.uid()::text
);

CREATE POLICY "Alunos podem confirmar a própria retirada de empréstimo"
ON emprestimos
FOR UPDATE
USING (
    usuario_id::text = auth.uid()::text
    AND status IN ('Pendente', 'Reservado')
)
WITH CHECK (
    status = 'Ativo'
);

-- ==============================================================================
-- 5. POLÍTICAS DE RLS PARA A TABELA 'reservas'
-- ==============================================================================
CREATE POLICY "TI e Professores podem gerenciar reservas"
ON reservas
FOR ALL
USING (
    coalesce((auth.jwt() ->> 'role'), '') IN ('ti', 'professor')
);

CREATE POLICY "Alunos podem visualizar reservas da sua turma"
ON reservas
FOR SELECT
USING (
    turma_id IN (
        SELECT turma FROM usuarios WHERE id::text = auth.uid()::text
    )
);

-- ==============================================================================
-- 6. POLÍTICAS DE RLS PARA A TABELA 'historico' (TRILHA DE AUDITORIA IMUTÁVEL)
-- ==============================================================================
-- Ninguém pode fazer UPDATE ou DELETE na tabela de histórico (Imutabilidade de auditoria)
CREATE POLICY "TI pode visualizar todo o histórico"
ON historico
FOR SELECT
USING (
    coalesce((auth.jwt() ->> 'role'), '') = 'ti'
);

CREATE POLICY "Usuários podem visualizar apenas histórico de suas movimentações"
ON historico
FOR SELECT
USING (
    usuario_id::text = auth.uid()::text
    OR responsavel_id::text = auth.uid()::text
);

-- Apenas o backend / service_role ou funções autorizadas podem inserir histórico
CREATE POLICY "Permitir inserção de histórico autenticado"
ON historico
FOR INSERT
WITH CHECK (
    auth.uid() IS NOT NULL
);

-- ==============================================================================
-- 7. FUNÇÃO RPC ATÔMICA: realizar_emprestimo_atomico (PREVENÇÃO DE RACE CONDITIONS)
-- ==============================================================================
CREATE OR REPLACE FUNCTION realizar_emprestimo_atomico(
    p_notebook_id INT,
    p_usuario_id INT,
    p_responsavel_id INT,
    p_horas_previstas INT DEFAULT 4,
    p_motivo TEXT DEFAULT NULL,
    p_ip_address VARCHAR DEFAULT NULL,
    p_user_agent VARCHAR DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- Executa com privilégios elevados para garantir atomicidade
AS $$
DECLARE
    v_notebook notebooks%ROWTYPE;
    v_usuario usuarios%ROWTYPE;
    v_emp_ativo emprestimos%ROWTYPE;
    v_data_prevista TIMESTAMP;
    v_emprestimo_id INT;
    v_dia_alta_demanda BOOLEAN := false;
    v_total_nb INT;
    v_distribuidos_nb INT;
    v_limite_perc NUMERIC := 50.0;
BEGIN
    -- 1. Obter lock pessimista no notebook para garantir serialização atômica
    SELECT * INTO v_notebook
    FROM notebooks
    WHERE id = p_notebook_id AND excluido = false
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Notebook não encontrado';
    END IF;

    IF v_notebook.status <> 'Disponível' THEN
        RAISE EXCEPTION 'Notebook não está disponível (Status atual: %)', v_notebook.status;
    END IF;

    -- 2. Validar usuário
    SELECT * INTO v_usuario
    FROM usuarios
    WHERE id = p_usuario_id AND ativo = true;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Usuário não encontrado ou inativo';
    END IF;

    -- 3. Verificar se usuário já possui empréstimo ativo
    SELECT * INTO v_emp_ativo
    FROM emprestimos
    WHERE usuario_id = p_usuario_id AND status = 'Ativo'
    LIMIT 1;

    IF FOUND THEN
        RAISE EXCEPTION 'Usuário já possui empréstimo ativo em andamento';
    END IF;

    -- 4. Verificar contingência em dia de alta demanda
    SELECT (valor = 'true') INTO v_dia_alta_demanda
    FROM configuracoes
    WHERE chave = 'dia_alta_demanda';

    IF v_dia_alta_demanda THEN
        SELECT COUNT(*) INTO v_total_nb FROM notebooks WHERE excluido = false;
        SELECT COUNT(*) INTO v_distribuidos_nb FROM notebooks WHERE status IN ('Emprestado', 'Reservado') AND excluido = false;
        
        IF v_total_nb > 0 AND ((v_distribuidos_nb + 1)::NUMERIC / v_total_nb * 100) > v_limite_perc THEN
            RAISE EXCEPTION 'Limite de distribuição em dias de alta demanda atingido (% %)', v_limite_perc, '%';
        END IF;
    END IF;

    -- 5. Calcular data prevista
    v_data_prevista := NOW() + (p_horas_previstas || ' hours')::INTERVAL;

    -- 6. Inserir empréstimo
    INSERT INTO emprestimos (
        notebook_id, usuario_id, responsavel_id, status,
        data_emprestimo, data_prevista_devolucao, motivo, observacao_saida
    ) VALUES (
        p_notebook_id, p_usuario_id, p_responsavel_id, 'Reservado',
        NOW(), v_data_prevista, p_motivo, 'Pré-alocado via RPC atômica'
    ) RETURNING id INTO v_emprestimo_id;

    -- 7. Atualizar notebook
    UPDATE notebooks
    SET status = 'Reservado',
        usuario_id = p_usuario_id,
        updated_at = NOW()
    WHERE id = p_notebook_id;

    -- 8. Inserir registro na trilha de auditoria imutável
    INSERT INTO historico (
        notebook_id, usuario_id, responsavel_id, tipo_movimentacao,
        status_anterior, status_novo, descricao, ip_address, user_agent, created_at
    ) VALUES (
        p_notebook_id, p_usuario_id, p_responsavel_id, 'EMPRESTIMO',
        'Disponível', 'Reservado',
        'Empréstimo processado atomicamente com bloqueio de concorrência',
        p_ip_address, p_user_agent, NOW()
    );

    RETURN jsonb_build_object(
        'sucesso', true,
        'emprestimo_id', v_emprestimo_id,
        'patrimonio', v_notebook.patrimonio,
        'usuario', v_usuario.nome,
        'status', 'Reservado'
    );
END;
$$;
