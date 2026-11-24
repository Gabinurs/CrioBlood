-- CRIOBLOOD: dados obrigatórios para rastreabilidade do descarte de bolsas.
-- Seguro para executar mais de uma vez e preserva os registros já existentes.

ALTER TABLE hemocomponentes
    ADD COLUMN IF NOT EXISTS descarte_motivo TEXT,
    ADD COLUMN IF NOT EXISTS descartado_por INTEGER REFERENCES usuarios(id),
    ADD COLUMN IF NOT EXISTS descartado_em TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_hemocomponentes_descartado_em
    ON hemocomponentes(descartado_em)
    WHERE status = 'DESCARTADA';
