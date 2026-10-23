const db = require('../database'); // Supondo que a conexão com o banco esteja exportada aqui

class HemocomponenteService {
    // Lista todos os hemocomponentes, possivelmente filtrados por status ou lote
    static async listarTodos(filtros = {}) {
        let query = `
            SELECT h.*, l.codigo_lote 
            FROM hemocomponentes h
            LEFT JOIN lotes l ON h.lote_id = l.id
            WHERE 1=1
        `;
        const params = [];

        if (filtros.lote_id) {
            query += ' AND h.lote_id = ?';
            params.push(filtros.lote_id);
        }
        
        if (filtros.status) {
            query += ' AND h.status = ?';
            params.push(filtros.status);
        }

        query += ' ORDER BY h.data_extracao DESC';

        const [linhas] = await db.query(query, params);
        return linhas;
    }

    static async buscarPorId(id) {
        const [linhas] = await db.query('SELECT * FROM hemocomponentes WHERE id = ?', [id]);
        return linhas[0];
    }

    static async criar(dados) {
        const { lote_id, tipo, volume_ml, data_extracao, data_validade, status } = dados;
        const query = `
            INSERT INTO hemocomponentes 
            (lote_id, tipo, volume_ml, data_extracao, data_validade, status) 
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        const [resultado] = await db.query(query, [
            lote_id, tipo, volume_ml, data_extracao, data_validade, status || 'Disponível'
        ]);
        return resultado.insertId;
    }

    static async atualizar(id, dados) {
        const { tipo, volume_ml, data_validade, status } = dados;
        const query = `
            UPDATE hemocomponentes 
            SET tipo = ?, volume_ml = ?, data_validade = ?, status = ? 
            WHERE id = ?
        `;
        const [resultado] = await db.query(query, [tipo, volume_ml, data_validade, status, id]);
        return resultado.affectedRows > 0;
    }

    static async deletar(id) {
        // Em sistemas de saúde, geralmente fazemos soft delete (mudando o status para 'Descartado')
        const query = 'UPDATE hemocomponentes SET status = ? WHERE id = ?';
        const [resultado] = await db.query(query, ['Descartado', id]);
        return resultado.affectedRows > 0;
    }
}

module.exports = HemocomponenteService;
