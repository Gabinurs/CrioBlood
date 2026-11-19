
-- CRIOBLOOD: estrutura inicial do banco de dados

-- 1. Cadastro de usuários
CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    login VARCHAR(80) NOT NULL UNIQUE,
    senha_hash VARCHAR(255) NOT NULL,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Permissões disponíveis no sistema
CREATE TABLE IF NOT EXISTS permissoes (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(80) NOT NULL UNIQUE,
    descricao VARCHAR(200) NOT NULL
);

-- 3. Permissões atribuídas a cada usuário
CREATE TABLE IF NOT EXISTS usuario_permissoes (
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    permissao_id INTEGER NOT NULL REFERENCES permissoes(id) ON DELETE CASCADE,
    PRIMARY KEY (usuario_id, permissao_id)
);

-- 4. Identificar o administrador principal
ALTER TABLE usuarios
ADD COLUMN IF NOT EXISTS administrador BOOLEAN NOT NULL DEFAULT FALSE;

-- Permissões iniciais disponíveis
INSERT INTO permissoes (codigo, descricao)
VALUES
    ('usuarios.visualizar', 'Visualizar usuários'),
    ('usuarios.cadastrar', 'Cadastrar usuários'),
    ('usuarios.editar', 'Editar usuários'),
    ('usuarios.desativar', 'Desativar usuários'),
    ('usuarios.permissoes', 'Gerenciar permissões')
ON CONFLICT (codigo) DO NOTHING;
