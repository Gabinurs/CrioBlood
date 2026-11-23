-- Fluxo em etapas da amostra do receptor: coleta -> imuno-hematologia -> solicitação.
-- Executar uma vez no banco existente (idempotente).

ALTER TABLE amostras_receptor
    ALTER COLUMN dupla_checagem DROP NOT NULL,
    ALTER COLUMN abo DROP NOT NULL,
    ALTER COLUMN fator_rh DROP NOT NULL,
    ALTER COLUMN controle_rh DROP NOT NULL,
    ALTER COLUMN pai DROP NOT NULL;

ALTER TABLE amostras_receptor
    ADD COLUMN IF NOT EXISTS local_coleta VARCHAR(120),
    ADD COLUMN IF NOT EXISTS solicitacao_transfusao BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS status_imuno VARCHAR(20) NOT NULL DEFAULT 'PENDENTE',
    ADD COLUMN IF NOT EXISTS imuno_realizado_por INTEGER REFERENCES usuarios(id),
    ADD COLUMN IF NOT EXISTS imuno_realizado_em TIMESTAMPTZ;

ALTER TABLE amostras_receptor
    DROP CONSTRAINT IF EXISTS amostras_receptor_status_imuno_check;

ALTER TABLE amostras_receptor
    ADD CONSTRAINT amostras_receptor_status_imuno_check
    CHECK (status_imuno IN ('PENDENTE','CONCLUIDO','BLOQUEADO'));

-- Preserva os exames que já foram registrados antes da implantação do fluxo em etapas.
UPDATE amostras_receptor
SET status_imuno = CASE
    WHEN pai = 'POSITIVO' OR controle_rh = 'POSITIVO' THEN 'BLOQUEADO'
    WHEN abo IS NOT NULL AND fator_rh IS NOT NULL AND pai IS NOT NULL AND controle_rh IS NOT NULL THEN 'CONCLUIDO'
    ELSE 'PENDENTE'
END
WHERE status_imuno = 'PENDENTE';

CREATE INDEX IF NOT EXISTS idx_amostras_receptor_status
    ON amostras_receptor(paciente_id, status_imuno, coletado_em DESC);
