-- CrioBlood: amostras e testes pré-transfusionais do receptor
-- Execute após 08_receptores_campos_complementares.sql.
CREATE TABLE IF NOT EXISTS amostras_receptor (
    id BIGSERIAL PRIMARY KEY,
    paciente_id INTEGER NOT NULL REFERENCES pacientes(id),
    codigo VARCHAR(40) UNIQUE,
    coletado_em TIMESTAMPTZ NOT NULL,
    recebido_em TIMESTAMPTZ NOT NULL,
    responsavel_coleta VARCHAR(160),
    responsavel_recebimento VARCHAR(160),
    dupla_checagem VARCHAR(160) NOT NULL,
    abo VARCHAR(2) NOT NULL CHECK (abo IN ('A','B','AB','O')),
    fator_rh VARCHAR(1) NOT NULL CHECK (fator_rh IN ('+','-')),
    controle_rh VARCHAR(10) NOT NULL CHECK (controle_rh IN ('NEGATIVO','POSITIVO')),
    controle_rh_justificativa TEXT,
    pai VARCHAR(10) NOT NULL CHECK (pai IN ('NEGATIVO','POSITIVO')),
    pai_justificativa TEXT,
    realizado_por INTEGER NOT NULL REFERENCES usuarios(id),
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (controle_rh <> 'POSITIVO' OR length(trim(coalesce(controle_rh_justificativa,''))) >= 5),
    CHECK (pai <> 'POSITIVO' OR length(trim(coalesce(pai_justificativa,''))) >= 5)
);
CREATE INDEX IF NOT EXISTS idx_amostras_receptor_paciente_data ON amostras_receptor(paciente_id, coletado_em DESC);
CREATE INDEX IF NOT EXISTS idx_amostras_receptor_validade ON amostras_receptor(coletado_em);
-- O resultado válido mais recente passa a alimentar o tipo sanguíneo cadastrado.
