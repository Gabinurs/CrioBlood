-- Tabela para gerenciar os Freezers e Geladeiras
CREATE TABLE equipamentos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL, -- Ex: "Freezer Ultra-Baixa T-01"
    tipo VARCHAR(50) NOT NULL,  -- "Freezer", "Geladeira", "Agitador"
    temperatura_operacional VARCHAR(20)
);

-- Tabela para mapear a posição exata da bolsa no equipamento
CREATE TABLE armazenamento (
    id INT AUTO_INCREMENT PRIMARY KEY,
    hemocomponente_id INT NOT NULL UNIQUE,
    equipamento_id INT NOT NULL,
    gaveta VARCHAR(50),
    caixa VARCHAR(50),
    posicao_exata VARCHAR(50), -- Ex: "A1", "B4"
    data_entrada DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (hemocomponente_id) REFERENCES hemocomponentes(id) ON DELETE CASCADE,
    FOREIGN KEY (equipamento_id) REFERENCES equipamentos(id)
);

-- Tabela para registrar a saída final (Transfusão)
CREATE TABLE transusoes_saidas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    hemocomponente_id INT NOT NULL UNIQUE,
    paciente_nome VARCHAR(255) NOT NULL,
    prontuario VARCHAR(100),
    medico_solicitante VARCHAR(255),
    data_saida DATETIME DEFAULT CURRENT_TIMESTAMP,
    observacoes TEXT,
    FOREIGN KEY (hemocomponente_id) REFERENCES hemocomponentes(id)
);
