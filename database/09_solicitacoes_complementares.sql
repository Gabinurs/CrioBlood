-- Executar depois de 06_modulos_clinicos.sql. Preserva os registros existentes.
CREATE TABLE IF NOT EXISTS setores_solicitacao (
 id SERIAL PRIMARY KEY,
 nome VARCHAR(100) NOT NULL UNIQUE,
 ativo BOOLEAN NOT NULL DEFAULT TRUE,
 criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO setores_solicitacao(nome) VALUES
 ('Pronto-socorro'),('UTI 1'),('UTI 2'),('Clínica médica'),('Centro cirúrgico')
ON CONFLICT (nome) DO NOTHING;
ALTER TABLE solicitacoes_transfusionais
 ADD COLUMN IF NOT EXISTS quantidade_solicitada INTEGER NOT NULL DEFAULT 1,
 ADD COLUMN IF NOT EXISTS horario_pedido TIMESTAMPTZ,
 ADD COLUMN IF NOT EXISTS setor_id INTEGER REFERENCES setores_solicitacao(id),
 ADD COLUMN IF NOT EXISTS hemoglobina NUMERIC(5,2),
 ADD COLUMN IF NOT EXISTS plaquetas INTEGER,
 ADD COLUMN IF NOT EXISTS diagnostico TEXT,
 ADD COLUMN IF NOT EXISTS consentimento BOOLEAN NOT NULL DEFAULT FALSE,
 ADD COLUMN IF NOT EXISTS requisicao_recebida BOOLEAN NOT NULL DEFAULT FALSE;
-- Uma linha continua representando uma bolsa. Quantidade acima de 1 gera solicitações separadas.
