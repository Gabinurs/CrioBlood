-- Registra início, término e profissional que efetivamente realizou a transfusão.
-- O usuário que lançou a informação continua registrado em registrado_por.
ALTER TABLE transusoes_saidas
    ADD COLUMN IF NOT EXISTS inicio_transfusao TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS fim_transfusao TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS transfundido_por_nome VARCHAR(160);
