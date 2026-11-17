-- CrioBlood: identificação de colaboradores e registro da conferência pré-reserva.
-- Execute uma vez no PostgreSQL (banco crioblood).

ALTER TABLE usuarios
    ADD COLUMN IF NOT EXISTS funcao VARCHAR(40) NOT NULL DEFAULT 'NAO_INFORMADO';

ALTER TABLE usuarios
    DROP CONSTRAINT IF EXISTS usuarios_funcao_check;

ALTER TABLE usuarios
    ADD CONSTRAINT usuarios_funcao_check
    CHECK (funcao IN (
        'NAO_INFORMADO',
        'TECNICO_ENFERMAGEM',
        'TECNICO_LABORATORIO',
        'TECNICO_TRANSFUSAO'
    ));

CREATE TABLE IF NOT EXISTS conferencias_compatibilidade (
    id BIGSERIAL PRIMARY KEY,
    solicitacao_id INTEGER NOT NULL REFERENCES solicitacoes_transfusionais(id),
    hemocomponente_id INTEGER NOT NULL REFERENCES hemocomponentes(id),
    colaborador_id INTEGER NOT NULL REFERENCES usuarios(id),
    funcao_colaborador VARCHAR(40) NOT NULL,
    codigo_informado VARCHAR(80) NOT NULL,
    codigo_confirmado BOOLEAN NOT NULL,
    tipagem_confirmada BOOLEAN NOT NULL,
    compatibilidade_confirmada BOOLEAN NOT NULL,
    tipagem_receptor VARCHAR(3) NOT NULL,
    tipagem_bolsa VARCHAR(3) NOT NULL,
    resultado_sistema VARCHAR(20) NOT NULL,
    conferido_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT conferencias_compatibilidade_confirmacoes_check
        CHECK (codigo_confirmado AND tipagem_confirmada AND compatibilidade_confirmada)
);

CREATE INDEX IF NOT EXISTS idx_conferencias_solicitacao
    ON conferencias_compatibilidade(solicitacao_id);

CREATE INDEX IF NOT EXISTS idx_conferencias_colaborador
    ON conferencias_compatibilidade(colaborador_id);
