-- CRIOBLOOD: pacientes, solicitações transfusionais e vínculo com a transfusão
-- Pode ser executado mais de uma vez (usa IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS pacientes (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    prontuario VARCHAR(50) NOT NULL UNIQUE,
    data_nascimento DATE NOT NULL,
    abo VARCHAR(2) CHECK (abo IN ('A', 'B', 'AB', 'O')),
    fator_rh VARCHAR(1) CHECK (fator_rh IN ('+', '-')),
    observacoes TEXT,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    cadastrado_por INTEGER NOT NULL REFERENCES usuarios(id),
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pacientes_nome ON pacientes(nome);

-- Uma solicitação pede UMA bolsa. Para várias bolsas, crie várias solicitações.
CREATE TABLE IF NOT EXISTS solicitacoes_transfusionais (
    id SERIAL PRIMARY KEY,
    paciente_id INTEGER NOT NULL REFERENCES pacientes(id),
    tipo VARCHAR(10) NOT NULL
        CHECK (tipo IN ('CH', 'PLASMA', 'PLAQUETAS', 'CRIO')),
    urgencia VARCHAR(10) NOT NULL DEFAULT 'ROTINA'
        CHECK (urgencia IN ('ROTINA', 'URGENTE', 'EMERGENCIA')),
    medico_solicitante VARCHAR(255) NOT NULL,
    indicacao TEXT,
    status VARCHAR(12) NOT NULL DEFAULT 'PENDENTE'
        CHECK (status IN ('PENDENTE', 'RESERVADA', 'ATENDIDA', 'CANCELADA')),
    hemocomponente_id INTEGER UNIQUE REFERENCES hemocomponentes(id),
    solicitado_por INTEGER NOT NULL REFERENCES usuarios(id),
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (status NOT IN ('RESERVADA', 'ATENDIDA') OR hemocomponente_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_solicitacoes_status ON solicitacoes_transfusionais(status);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_paciente ON solicitacoes_transfusionais(paciente_id);

-- Liga a saída da bolsa à solicitação e a quem registrou
ALTER TABLE transusoes_saidas
    ADD COLUMN IF NOT EXISTS solicitacao_id INTEGER REFERENCES solicitacoes_transfusionais(id);
ALTER TABLE transusoes_saidas
    ADD COLUMN IF NOT EXISTS registrado_por INTEGER REFERENCES usuarios(id);
