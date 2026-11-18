-- CrioBlood: compatibilidade entre a estrutura das solicitações e o fluxo de transfusão.
-- Seguro para execução em banco já utilizado: não apaga nem recria registros.

-- Estrutura usada pelo formulário de solicitação.
CREATE TABLE IF NOT EXISTS setores_solicitacao (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL UNIQUE,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO setores_solicitacao(nome) VALUES
    ('Pronto-socorro'), ('UTI 1'), ('UTI 2'),
    ('Clínica médica'), ('Centro cirúrgico')
ON CONFLICT (nome) DO NOTHING;

ALTER TABLE solicitacoes_transfusionais
    ADD COLUMN IF NOT EXISTS quantidade_solicitada INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS horario_pedido TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS setor_id INTEGER REFERENCES setores_solicitacao(id),
    ADD COLUMN IF NOT EXISTS hemoglobina NUMERIC(5,2),
    ADD COLUMN IF NOT EXISTS plaquetas INTEGER,
    ADD COLUMN IF NOT EXISTS diagnostico TEXT,
    ADD COLUMN IF NOT EXISTS consentimento BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS requisicao_recebida BOOLEAN NOT NULL DEFAULT FALSE;

-- Dados de início e término do acompanhamento da transfusão.
ALTER TABLE transusoes_saidas
    ADD COLUMN IF NOT EXISTS solicitacao_id INTEGER REFERENCES solicitacoes_transfusionais(id),
    ADD COLUMN IF NOT EXISTS registrado_por INTEGER REFERENCES usuarios(id),
    ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'FINALIZADA',
    ADD COLUMN IF NOT EXISTS inicio_em TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS termino_em TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS responsavel_transfusao VARCHAR(150),
    ADD COLUMN IF NOT EXISTS finalizado_por INTEGER REFERENCES usuarios(id);

-- Registros antigos representam transfusões já concluídas. Preservamos o horário histórico.
UPDATE transusoes_saidas
SET inicio_em = COALESCE(inicio_em, data_saida),
    termino_em = COALESCE(termino_em, data_saida),
    status = COALESCE(status, 'FINALIZADA')
WHERE inicio_em IS NULL OR termino_em IS NULL OR status IS NULL;

ALTER TABLE transusoes_saidas
    ALTER COLUMN inicio_em SET DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE transusoes_saidas
    DROP CONSTRAINT IF EXISTS transusoes_saidas_status_check;

ALTER TABLE transusoes_saidas
    ADD CONSTRAINT transusoes_saidas_status_check
    CHECK (status IN ('EM_ANDAMENTO', 'FINALIZADA'));

CREATE INDEX IF NOT EXISTS idx_transusoes_status
    ON transusoes_saidas(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_transusoes_solicitacao_unica
    ON transusoes_saidas(solicitacao_id)
    WHERE solicitacao_id IS NOT NULL;
