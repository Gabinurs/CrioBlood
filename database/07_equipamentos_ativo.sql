-- CRIOBLOOD: equipamentos podem ser desativados (sem apagar o histórico) e têm nome único
-- Pode ser executado mais de uma vez.

ALTER TABLE equipamentos
    ADD COLUMN IF NOT EXISTS ativo BOOLEAN NOT NULL DEFAULT TRUE;

CREATE UNIQUE INDEX IF NOT EXISTS ux_equipamentos_nome ON equipamentos (lower(nome));
