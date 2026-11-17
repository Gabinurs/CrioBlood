const db = require('../database');

class EstoqueService {
    // Marca como VENCIDA toda bolsa em estoque cujo prazo expirou e libera a posição física dela.
    static async invalidarVencidos() {
        const resultado = await db.query(`
            UPDATE hemocomponentes
            SET status = 'VENCIDA', atualizado_em = CURRENT_TIMESTAMP
            WHERE data_validade < CURRENT_DATE
              AND status IN ('DISPONIVEL', 'EM_CONFERENCIA', 'RESERVADA')
        `);

        await db.query(`
            DELETE FROM armazenamento
            WHERE hemocomponente_id IN (SELECT id FROM hemocomponentes WHERE status = 'VENCIDA')
        `);

        return resultado.rowCount; // Quantas bolsas foram marcadas nesta varredura
    }
}

module.exports = EstoqueService;
