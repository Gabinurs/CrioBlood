const db = require('../database');

class EstoqueService {
    
    // ==========================================
    // MÓDULO 1: ARMAZENAMENTO FÍSICO
    // ==========================================
    static async alocarHemocomponente(dadosArmazenamento) {
        const { hemocomponente_id, equipamento_id, gaveta, caixa, posicao_exata } = dadosArmazenamento;
        
        // Insere a localização física ou atualiza se já existir (ON DUPLICATE KEY)
        const query = `
            INSERT INTO armazenamento (hemocomponente_id, equipamento_id, gaveta, caixa, posicao_exata)
            VALUES (?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE 
            equipamento_id = VALUES(equipamento_id), 
            gaveta = VALUES(gaveta), 
            caixa = VALUES(caixa), 
            posicao_exata = VALUES(posicao_exata)
        `;
        const [resultado] = await db.query(query, [hemocomponente_id, equipamento_id, gaveta, caixa, posicao_exata]);
        return resultado;
    }

    static async buscarLocalizacao(hemocomponente_id) {
        const query = `
            SELECT a.*, e.nome as equipamento_nome, e.tipo as equipamento_tipo 
            FROM armazenamento a
            JOIN equipamentos e ON a.equipamento_id = e.id
            WHERE a.hemocomponente_id = ?
        `;
        const [linhas] = await db.query(query, [hemocomponente_id]);
        return linhas[0];
    }

    // ==========================================
    // MÓDULO 2: SAÍDA E TRANSFUSÃO
    // ==========================================
    static async registrarTransfusao(dadosSaida) {
        const { hemocomponente_id, paciente_nome, prontuario, medico_solicitante, observacoes } = dadosSaida;
        
        // Utilizamos uma transação para garantir que a bolsa só saia se o status for atualizado com sucesso
        const conexao = await db.getConnection();
        try {
            await conexao.beginTransaction();

            // 1. Registra a saída para o paciente
            const querySaida = `
                INSERT INTO transusoes_saidas (hemocomponente_id, paciente_nome, prontuario, medico_solicitante, observacoes)
                VALUES (?, ?, ?, ?, ?)
            `;
            await conexao.query(querySaida, [hemocomponente_id, paciente_nome, prontuario, medico_solicitante, observacoes]);

            // 2. Atualiza o status do hemocomponente para 'Utilizado'
            const queryStatus = `UPDATE hemocomponentes SET status = 'Utilizado' WHERE id = ?`;
            await conexao.query(queryStatus, [hemocomponente_id]);

            await conexao.commit();
            return true;
        } catch (erro) {
            await conexao.rollback();
            throw erro;
        } finally {
            conexao.release();
        }
    }

    // ==========================================
    // MÓDULO 3: ROTINA DE VALIDADE
    // ==========================================
    static async invalidarVencidos() {
        // Marca como "Descarte - Vencido" qualquer bolsa cujo prazo expirou hoje ou antes
        // e que ainda estava disponível ou em quarentena.
        const query = `
            UPDATE hemocomponentes 
            SET status = 'Descarte - Vencido' 
            WHERE data_validade < CURDATE() 
            AND status IN ('Disponível', 'Em Quarentena')
        `;
        const [resultado] = await db.query(query);
        return resultado.affectedRows; // Retorna quantas bolsas foram vencidas nesta varredura
    }
}

module.exports = EstoqueService;
