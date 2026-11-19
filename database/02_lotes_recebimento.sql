
-- CRIOBLOOD: lotes de recebimento

CREATE TABLE IF NOT EXISTS lotes_recebimento (
    id SERIAL PRIMARY KEY,

    codigo VARCHAR(30) NOT NULL UNIQUE,

    data_recebimento TIMESTAMPTZ NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    origem VARCHAR(100) NOT NULL
        DEFAULT 'Taubaté',

    observacoes TEXT,

    status VARCHAR(20) NOT NULL
        DEFAULT 'ABERTO'
        CHECK (status IN ('ABERTO', 'FECHADO')),

    aberto_por INTEGER NOT NULL
        REFERENCES usuarios(id),

    fechado_por INTEGER
        REFERENCES usuarios(id),

    fechado_em TIMESTAMPTZ,

    criado_em TIMESTAMPTZ NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    CHECK (
        (status = 'ABERTO'
            AND fechado_por IS NULL
            AND fechado_em IS NULL)
        OR
        (status = 'FECHADO'
            AND fechado_por IS NOT NULL
            AND fechado_em IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_lotes_recebimento_status
    ON lotes_recebimento(status);

CREATE INDEX IF NOT EXISTS idx_lotes_recebimento_data
    ON lotes_recebimento(data_recebimento);
