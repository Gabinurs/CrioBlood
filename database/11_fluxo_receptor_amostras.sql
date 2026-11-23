-- CrioBlood: fluxo separado de cadastro da amostra e registro Imuno.
-- Execute uma vez no banco existente. Todos os comandos são idempotentes.

CREATE TABLE IF NOT EXISTS amostras_receptor (
    id BIGSERIAL PRIMARY KEY,
    paciente_id INTEGER NOT NULL REFERENCES pacientes(id),
    codigo VARCHAR(40) UNIQUE,
    coletado_em TIMESTAMPTZ NOT NULL,
    recebido_em TIMESTAMPTZ NOT NULL,
    responsavel_coleta VARCHAR(160),
    responsavel_recebimento VARCHAR(160),
    dupla_checagem VARCHAR(160) NOT NULL,
    local_coleta VARCHAR(120),
    solicitacao_transfusao BOOLEAN NOT NULL DEFAULT FALSE,
    abo VARCHAR(2) CHECK (abo IN ('A','B','AB','O')),
    fator_rh VARCHAR(1) CHECK (fator_rh IN ('+','-')),
    controle_rh VARCHAR(10) CHECK (controle_rh IN ('NEGATIVO','POSITIVO')),
    controle_rh_justificativa TEXT,
    pai VARCHAR(10) CHECK (pai IN ('NEGATIVO','POSITIVO')),
    pai_justificativa TEXT,
    status_imuno VARCHAR(12) NOT NULL DEFAULT 'PENDENTE'
        CHECK (status_imuno IN ('PENDENTE','CONCLUIDO','BLOQUEADO')),
    realizado_por INTEGER NOT NULL REFERENCES usuarios(id),
    imuno_realizado_por INTEGER REFERENCES usuarios(id),
    imuno_realizado_em TIMESTAMPTZ,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE amostras_receptor
    ADD COLUMN IF NOT EXISTS local_coleta VARCHAR(120),
    ADD COLUMN IF NOT EXISTS solicitacao_transfusao BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS status_imuno VARCHAR(12) NOT NULL DEFAULT 'PENDENTE',
    ADD COLUMN IF NOT EXISTS imuno_realizado_por INTEGER REFERENCES usuarios(id),
    ADD COLUMN IF NOT EXISTS imuno_realizado_em TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS responsavel_coleta VARCHAR(160),
    ADD COLUMN IF NOT EXISTS responsavel_recebimento VARCHAR(160),
    ADD COLUMN IF NOT EXISTS dupla_checagem VARCHAR(160);

-- A coleta é registrada antes dos testes. Os campos Imuno passam a ser preenchidos
-- somente na tela própria da amostra.
ALTER TABLE amostras_receptor ALTER COLUMN abo DROP NOT NULL;
ALTER TABLE amostras_receptor ALTER COLUMN fator_rh DROP NOT NULL;
ALTER TABLE amostras_receptor ALTER COLUMN controle_rh DROP NOT NULL;
ALTER TABLE amostras_receptor ALTER COLUMN pai DROP NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'ck_amostras_receptor_status_imuno'
    ) THEN
        ALTER TABLE amostras_receptor
            ADD CONSTRAINT ck_amostras_receptor_status_imuno
            CHECK (status_imuno IN ('PENDENTE','CONCLUIDO','BLOQUEADO'));
    END IF;
END $$;

-- Migra registros antigos que já tinham resultados lançados para estado somente leitura.
UPDATE amostras_receptor
SET status_imuno = CASE
        WHEN pai = 'POSITIVO' OR controle_rh = 'POSITIVO' THEN 'BLOQUEADO'
        ELSE 'CONCLUIDO'
    END,
    imuno_realizado_por = COALESCE(imuno_realizado_por, realizado_por),
    imuno_realizado_em = COALESCE(imuno_realizado_em, criado_em)
WHERE status_imuno = 'PENDENTE'
  AND abo IS NOT NULL AND fator_rh IS NOT NULL
  AND controle_rh IS NOT NULL AND pai IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_amostras_receptor_paciente_data
    ON amostras_receptor(paciente_id, coletado_em DESC);
CREATE INDEX IF NOT EXISTS idx_amostras_receptor_validade
    ON amostras_receptor(coletado_em);
