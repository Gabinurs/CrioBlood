-- CrioBlood: campos adicionais da conferência ABO/Rh e compatibilidade.
-- Execute uma vez no banco crioblood após atualizar a branch.

ALTER TABLE conferencias_compatibilidade
    ADD COLUMN IF NOT EXISTS tipagem_conferida_abo VARCHAR(2),
    ADD COLUMN IF NOT EXISTS tipagem_conferida_rh VARCHAR(1),
    ADD COLUMN IF NOT EXISTS resultado_conferencia VARCHAR(20),
    ADD COLUMN IF NOT EXISTS responsavel_tipagem VARCHAR(120);

ALTER TABLE conferencias_compatibilidade
    DROP CONSTRAINT IF EXISTS conferencias_compatibilidade_resultado_conferencia_check;

ALTER TABLE conferencias_compatibilidade
    ADD CONSTRAINT conferencias_compatibilidade_resultado_conferencia_check
    CHECK (
        resultado_conferencia IS NULL
        OR resultado_conferencia IN ('COMPATIVEL', 'INCOMPATIVEL')
    );
