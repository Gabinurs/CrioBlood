-- CRIOBLOOD: log de auditoria (PostgreSQL)

CREATE TABLE IF NOT EXISTS logs_auditoria (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
    acao VARCHAR(100) NOT NULL,           -- Ex: "DESCARTE_HEMOCOMPONENTE"
    tabela_afetada VARCHAR(50) NOT NULL,  -- Ex: "hemocomponentes"
    registro_id INTEGER NOT NULL,         -- ID do registro alterado
    detalhes TEXT,                        -- Texto ou JSON explicando a mudança
    data_hora TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
