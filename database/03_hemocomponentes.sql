
-- CRIOBLOOD: cadastro individual de hemocomponentes

CREATE TABLE IF NOT EXISTS hemocomponentes (
    id SERIAL PRIMARY KEY,

    -- Lote de recebimento ao qual a bolsa pertence
    lote_id INTEGER NOT NULL
        REFERENCES lotes_recebimento(id),

    -- Código original impresso na bolsa recebida
    codigo_original VARCHAR(50) NOT NULL UNIQUE,

    -- Tipo de hemocomponente
    tipo VARCHAR(10) NOT NULL
        CHECK (
            tipo IN ('CH', 'PLASMA', 'PLAQUETAS', 'CRIO')
        ),

    -- Tipagem sanguínea confirmada
    abo VARCHAR(2)
        CHECK (abo IN ('A', 'B', 'AB', 'O')),

    fator_rh VARCHAR(1)
        CHECK (fator_rh IN ('+', '-')),

    -- Datas da bolsa
    data_coleta DATE NOT NULL,
    data_validade DATE NOT NULL,

    -- Inspeções realizadas no recebimento
    inspecao_visual BOOLEAN NOT NULL DEFAULT FALSE,
    integridade_confirmada BOOLEAN NOT NULL DEFAULT FALSE,
    tipagem_confirmada BOOLEAN NOT NULL DEFAULT FALSE,

    -- Situação atual da bolsa
    status VARCHAR(20) NOT NULL DEFAULT 'EM_CONFERENCIA'
        CHECK (
            status IN (
                'EM_CONFERENCIA',
                'DISPONIVEL',
                'RESERVADA',
                'TRANSFUNDIDA',
                'DESCARTADA',
                'VENCIDA'
            )
        ),

    observacoes TEXT,

    cadastrado_por INTEGER NOT NULL
        REFERENCES usuarios(id),

    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- A validade não pode ser anterior à coleta
    CHECK (data_validade >= data_coleta),

    -- A bolsa só pode estar disponível após a conferência
    CHECK (
        status <> 'DISPONIVEL'
        OR (
            inspecao_visual = TRUE
            AND integridade_confirmada = TRUE
            AND tipagem_confirmada = TRUE
            AND abo IS NOT NULL
            AND fator_rh IS NOT NULL
        )
    )
);

-- Índice para consultar as bolsas de cada lote
CREATE INDEX IF NOT EXISTS idx_hemocomponentes_lote
    ON hemocomponentes(lote_id);

-- Índice para localizar bolsas pela validade
CREATE INDEX IF NOT EXISTS idx_hemocomponentes_validade
    ON hemocomponentes(data_validade);

-- Índice para filtrar bolsas por situação
CREATE INDEX IF NOT EXISTS idx_hemocomponentes_status
    ON hemocomponentes(status);
