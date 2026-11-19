-- Integração CrioBlood: campos complementares do receptor, amostras e identificação de bolsas.
-- Migração aditiva e idempotente: preserva registros existentes.
ALTER TABLE pacientes
    ADD COLUMN IF NOT EXISTS nome_mae VARCHAR(255),
    ADD COLUMN IF NOT EXISTS cns VARCHAR(20),
    ADD COLUMN IF NOT EXISTS cpf VARCHAR(14),
    ADD COLUMN IF NOT EXISTS rg VARCHAR(30),
    ADD COLUMN IF NOT EXISTS sexo VARCHAR(1),
    ADD COLUMN IF NOT EXISTS telefone VARCHAR(30),
    ADD COLUMN IF NOT EXISTS convenio VARCHAR(120),
    ADD COLUMN IF NOT EXISTS plano VARCHAR(120);
ALTER TABLE pacientes ALTER COLUMN prontuario DROP NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pacientes_nome_lower ON pacientes (LOWER(nome));

CREATE TABLE IF NOT EXISTS amostras_receptor (
    id BIGSERIAL PRIMARY KEY,
    paciente_id INTEGER NOT NULL REFERENCES pacientes(id),
    codigo VARCHAR(40) NOT NULL UNIQUE,
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
    CHECK (recebido_em >= coletado_em),
    CHECK (controle_rh <> 'POSITIVO' OR length(trim(coalesce(controle_rh_justificativa,''))) >= 5),
    CHECK (pai <> 'POSITIVO' OR length(trim(coalesce(pai_justificativa,''))) >= 5)
);
CREATE INDEX IF NOT EXISTS idx_amostras_receptor_paciente_data ON amostras_receptor(paciente_id, coletado_em DESC);

CREATE SEQUENCE IF NOT EXISTS hemocomponentes_codigo_interno_seq START 1;
ALTER TABLE hemocomponentes
    ADD COLUMN IF NOT EXISTS codigo_interno VARCHAR(32),
    ADD COLUMN IF NOT EXISTS volume_ml INTEGER,
    ADD COLUMN IF NOT EXISTS anti_hbc BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS anti_hcv BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS anti_hiv_1_2 BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS anti_htlv_i_ii BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS chagas BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS hbsag BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS nat_hbv BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS nat_hcv BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS nat_hiv BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS nat_malaria BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS sifilis BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS pesquisa_hbs BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS pai_negativo BOOLEAN NOT NULL DEFAULT FALSE;
UPDATE hemocomponentes
SET codigo_interno = 'CB-LEGADO-' || id::text
WHERE codigo_interno IS NULL OR codigo_interno = '';
ALTER TABLE hemocomponentes ALTER COLUMN codigo_interno SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_hemocomponentes_codigo_interno ON hemocomponentes(codigo_interno);
