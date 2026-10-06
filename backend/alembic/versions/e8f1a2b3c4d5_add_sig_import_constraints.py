"""Add SIG import constraints and turma_alunos table

Revision ID: e8f1a2b3c4d5
Revises: da22c9a77215
Create Date: 2026-10-05 17:05:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine.reflection import Inspector


# revision identifiers, used by Alembic.
revision: str = 'e8f1a2b3c4d5'
down_revision: Union[str, None] = 'da22c9a77215'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = Inspector.from_engine(conn)
    existing_tables = inspector.get_table_names()

    # 1. Garantir índice único para matricula em usuarios
    usuarios_indexes = [idx['name'] for idx in inspector.get_indexes('usuarios')] if 'usuarios' in existing_tables else []
    if 'ix_usuarios_matricula' not in usuarios_indexes and 'uq_usuarios_matricula' not in usuarios_indexes:
        op.create_index(
            'ix_usuarios_matricula_unique',
            'usuarios',
            ['matricula'],
            unique=True
        )

    # 2. Garantir índice em codigo_turma para a tabela turmas
    if 'turmas' in existing_tables:
        turmas_indexes = [idx['name'] for idx in inspector.get_indexes('turmas')]
        if 'ix_turmas_codigo_turma' not in turmas_indexes and 'uq_turmas_codigo_turma' not in turmas_indexes:
            op.create_index(
                'ix_turmas_codigo_turma_unique',
                'turmas',
                ['codigo_turma'],
                unique=True
            )

    # 3. Criar a tabela associativa turma_alunos (M:N) se não existir
    if 'turma_alunos' not in existing_tables:
        op.create_table(
            'turma_alunos',
            sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
            sa.Column('turma_id', sa.String(length=50), nullable=False),
            sa.Column('usuario_id', sa.Integer(), nullable=False),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.ForeignKeyConstraint(['turma_id'], ['turmas.codigo_turma'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['usuario_id'], ['usuarios.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('turma_id', 'usuario_id', name='uq_turma_aluno')
        )
        op.create_index(op.f('ix_turma_alunos_turma_id'), 'turma_alunos', ['turma_id'], unique=False)
        op.create_index(op.f('ix_turma_alunos_usuario_id'), 'turma_alunos', ['usuario_id'], unique=False)


def downgrade() -> None:
    conn = op.get_bind()
    inspector = Inspector.from_engine(conn)
    existing_tables = inspector.get_table_names()

    if 'turma_alunos' in existing_tables:
        op.drop_index(op.f('ix_turma_alunos_usuario_id'), table_name='turma_alunos')
        op.drop_index(op.f('ix_turma_alunos_turma_id'), table_name='turma_alunos')
        op.drop_table('turma_alunos')

    if 'turmas' in existing_tables:
        turmas_indexes = [idx['name'] for idx in inspector.get_indexes('turmas')]
        if 'ix_turmas_codigo_turma_unique' in turmas_indexes:
            op.drop_index('ix_turmas_codigo_turma_unique', table_name='turmas')

    if 'usuarios' in existing_tables:
        usuarios_indexes = [idx['name'] for idx in inspector.get_indexes('usuarios')]
        if 'ix_usuarios_matricula_unique' in usuarios_indexes:
            op.drop_index('ix_usuarios_matricula_unique', table_name='usuarios')
