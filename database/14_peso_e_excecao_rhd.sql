-- CrioBlood: peso atual e rastreabilidade de exceções para seleção da bolsa.
-- A migração é aditiva e não altera os registros anteriores.

ALTER TABLE requisicoes_transfusionais
    ADD COLUMN IF NOT EXISTS peso_receptor_kg NUMERIC(5,2);

ALTER TABLE provas_cruzadas
    ADD COLUMN IF NOT EXISTS tipo_verificacao VARCHAR(32) NOT NULL DEFAULT 'PROVA_CRUZADA',
    ADD COLUMN IF NOT EXISTS excecao_rhd_protocolo VARCHAR(60),
    ADD COLUMN IF NOT EXISTS autorizador_nome VARCHAR(160),
    ADD COLUMN IF NOT EXISTS justificativa_excecao TEXT,
    ADD COLUMN IF NOT EXISTS sem_historico_anti_d BOOLEAN NOT NULL DEFAULT FALSE;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'ck_provas_cruzadas_tipo_verificacao'
    ) THEN
        ALTER TABLE provas_cruzadas
            ADD CONSTRAINT ck_provas_cruzadas_tipo_verificacao
            CHECK (tipo_verificacao IN ('PROVA_CRUZADA', 'CONFERENCIA_COMPATIBILIDADE'));
    END IF;
END $$;

COMMENT ON COLUMN requisicoes_transfusionais.peso_receptor_kg IS
    'Peso atual do receptor, utilizado na regra ABO do crioprecipitado em pacientes com até 35 kg.';
COMMENT ON COLUMN provas_cruzadas.excecao_rhd_protocolo IS
    'Exceção RhD documentada conforme protocolo institucional, sem liberação automática.';
COMMENT ON COLUMN provas_cruzadas.autorizador_nome IS
    'Médico/hemoterapeuta que autorizou formalmente a exceção RhD.';
COMMENT ON COLUMN provas_cruzadas.sem_historico_anti_d IS
    'Confirmação registrada de ausência de histórico de sensibilização anti-D.';
