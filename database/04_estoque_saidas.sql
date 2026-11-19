-- CRIOBLOOD: equipamentos, armazenamento e saídas (PostgreSQL)

-- Freezers e geladeiras
CREATE TABLE IF NOT EXISTS equipamentos (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,          -- Ex: "Freezer Ultra-Baixa T-01"
    tipo VARCHAR(50) NOT NULL,           -- "Freezer", "Geladeira", "Agitador"
    temperatura_operacional VARCHAR(20)
);

-- Posição exata da bolsa no equipamento
CREATE TABLE IF NOT EXISTS armazenamento (
    id SERIAL PRIMARY KEY,
    hemocomponente_id INTEGER NOT NULL UNIQUE
        REFERENCES hemocomponentes(id) ON DELETE CASCADE,
    equipamento_id INTEGER NOT NULL
        REFERENCES equipamentos(id),
    gaveta VARCHAR(50),
    caixa VARCHAR(50),
    posicao_exata VARCHAR(50),           -- Ex: "A1", "B4"
    data_entrada TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Saída final (transfusão)
CREATE TABLE IF NOT EXISTS transusoes_saidas (
    id SERIAL PRIMARY KEY,
    hemocomponente_id INTEGER NOT NULL UNIQUE
        REFERENCES hemocomponentes(id),
    paciente_nome VARCHAR(255) NOT NULL,
    prontuario VARCHAR(100),
    medico_solicitante VARCHAR(255),
    data_saida TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    observacoes TEXT
);
