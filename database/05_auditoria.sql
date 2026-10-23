CREATE TABLE logs_auditoria (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    acao VARCHAR(100) NOT NULL,           -- Ex: "DESCARTE_HEMOCOMPONENTE"
    tabela_afetada VARCHAR(50) NOT NULL,  -- Ex: "hemocomponentes"
    registro_id INT NOT NULL,             -- O ID da bolsa alterada
    detalhes TEXT,                        -- JSON ou texto explicando o que mudou
    data_hora DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);
