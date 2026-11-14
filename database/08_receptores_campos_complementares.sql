-- CRIOBLOOD: amplia o cadastro de receptores sem apagar dados existentes.
-- Execute uma única vez no banco PostgreSQL antes de utilizar a nova tela.

ALTER TABLE pacientes
    ADD COLUMN IF NOT EXISTS nome_mae VARCHAR(255),
    ADD COLUMN IF NOT EXISTS cns VARCHAR(20),
    ADD COLUMN IF NOT EXISTS cpf VARCHAR(14),
    ADD COLUMN IF NOT EXISTS rg VARCHAR(30),
    ADD COLUMN IF NOT EXISTS sexo VARCHAR(1),
    ADD COLUMN IF NOT EXISTS telefone VARCHAR(30),
    ADD COLUMN IF NOT EXISTS convenio VARCHAR(120),
    ADD COLUMN IF NOT EXISTS plano VARCHAR(120);

-- O prontuário passa a ser opcional no cadastro do receptor.
-- A restrição UNIQUE permanece: valores preenchidos continuam sem duplicidade.
ALTER TABLE pacientes
    ALTER COLUMN prontuario DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pacientes_nome_lower ON pacientes (LOWER(nome));
