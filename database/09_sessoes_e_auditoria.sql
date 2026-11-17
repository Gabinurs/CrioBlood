-- CRIOBLOOD: sessões guardadas no banco e auditoria de ações do sistema
-- Pode ser executado mais de uma vez.

-- Sessões de login (usadas pelo connect-pg-simple): sobrevivem a reinícios do servidor
CREATE TABLE IF NOT EXISTS session (
    sid    VARCHAR PRIMARY KEY,
    sess   JSON NOT NULL,
    expire TIMESTAMP(6) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_session_expire ON session (expire);

-- Ações automáticas do sistema (ex.: reserva desfeita por vencimento) não têm usuário
ALTER TABLE logs_auditoria ALTER COLUMN usuario_id DROP NOT NULL;
