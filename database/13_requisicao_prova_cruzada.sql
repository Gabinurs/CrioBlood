-- CrioBlood: requisição transfusional em etapas e registro de prova cruzada.
-- Migração aditiva: preserva solicitações e transfusões já registradas.

CREATE TABLE IF NOT EXISTS requisicoes_transfusionais (
    id BIGSERIAL PRIMARY KEY,
    paciente_id INTEGER NOT NULL REFERENCES pacientes(id),
    amostra_id BIGINT NOT NULL REFERENCES amostras_receptor(id),
    data_hora_requisicao TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    solicitado_por INTEGER NOT NULL REFERENCES usuarios(id),
    medico_solicitante VARCHAR(255) NOT NULL,
    hemoglobina NUMERIC(5,2),
    consentimento_confirmado BOOLEAN NOT NULL DEFAULT FALSE,
    requisicao_conforme BOOLEAN NOT NULL DEFAULT FALSE,
    setor_solicitante VARCHAR(120) NOT NULL,
    diagnostico TEXT NOT NULL,
    prazo_solicitacao VARCHAR(24) NOT NULL
        CHECK (prazo_solicitacao IN ('3_HORAS','6_HORAS','24_HORAS','RESERVA_CIRURGICA','EXTREMA_URGENCIA')),
    status VARCHAR(16) NOT NULL DEFAULT 'PENDENTE'
        CHECK (status IN ('PENDENTE','PARCIAL','RESERVADA','ATENDIDA','CANCELADA')),
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE solicitacoes_transfusionais
    ADD COLUMN IF NOT EXISTS requisicao_id BIGINT REFERENCES requisicoes_transfusionais(id),
    ADD COLUMN IF NOT EXISTS item_numero INTEGER;

CREATE INDEX IF NOT EXISTS idx_requisicoes_paciente_data
    ON requisicoes_transfusionais(paciente_id, data_hora_requisicao DESC);
CREATE INDEX IF NOT EXISTS idx_requisicoes_status
    ON requisicoes_transfusionais(status);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_requisicao
    ON solicitacoes_transfusionais(requisicao_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_solicitacoes_requisicao_item
    ON solicitacoes_transfusionais(requisicao_id, item_numero)
    WHERE requisicao_id IS NOT NULL AND item_numero IS NOT NULL;

CREATE TABLE IF NOT EXISTS provas_cruzadas (
    id BIGSERIAL PRIMARY KEY,
    requisicao_id BIGINT NOT NULL REFERENCES requisicoes_transfusionais(id),
    solicitacao_id INTEGER NOT NULL REFERENCES solicitacoes_transfusionais(id),
    paciente_id INTEGER NOT NULL REFERENCES pacientes(id),
    hemocomponente_id INTEGER NOT NULL REFERENCES hemocomponentes(id),
    realizado_por INTEGER NOT NULL REFERENCES usuarios(id),
    responsavel_nome VARCHAR(160) NOT NULL,
    data_hora_prova TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resultado VARCHAR(14) NOT NULL
        CHECK (resultado IN ('COMPATIVEL','INCOMPATIVEL')),
    tipagem_bolsa_confirmada BOOLEAN NOT NULL DEFAULT FALSE,
    abo_bolsa VARCHAR(2),
    fator_rh_bolsa VARCHAR(1),
    volume_ml INTEGER,
    codigo_original VARCHAR(50) NOT NULL,
    codigo_interno VARCHAR(32),
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_provas_cruzadas_requisicao
    ON provas_cruzadas(requisicao_id, criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_provas_cruzadas_bolsa
    ON provas_cruzadas(hemocomponente_id, criado_em DESC);

COMMENT ON TABLE requisicoes_transfusionais IS
    'Cabeçalho da requisição; os componentes e unidades são representados por linhas em solicitacoes_transfusionais.';
COMMENT ON TABLE provas_cruzadas IS
    'Registro de prova cruzada informada pelo profissional. Resultado incompatível é auditado e nunca reserva a bolsa.';
