const db = require('../database');

// Colunas de data já formatadas (evita problemas de fuso horário nas telas)
const COLUNAS_DATAS = `
    to_char(h.data_coleta, 'DD/MM/YYYY')   AS data_coleta_br,
    to_char(h.data_validade, 'DD/MM/YYYY') AS data_validade_br,
    to_char(h.data_coleta, 'YYYY-MM-DD')   AS data_coleta_iso,
    to_char(h.data_validade, 'YYYY-MM-DD') AS data_validade_iso
`;

class HemocomponenteService {
    // Lista os hemocomponentes, com filtro opcional por lote ou status
    static async listarTodos(filtros = {}) {
        let query = `
            SELECT h.*, l.codigo AS codigo_lote, ${COLUNAS_DATAS}
            FROM hemocomponentes h
            LEFT JOIN lotes_recebimento l ON h.lote_id = l.id
            WHERE 1=1
        `;
        const params = [];

        if (filtros.lote_id) {
            params.push(filtros.lote_id);
            query += ` AND h.lote_id = $${params.length}`;
        }

        if (filtros.status) {
            params.push(filtros.status);
            query += ` AND h.status = $${params.length}`;
        }

        query += ' ORDER BY h.data_validade ASC, h.id DESC';

        const { rows } = await db.query(query, params);
        return rows;
    }

    static async buscarPorId(id) {
        const { rows } = await db.query(
            `SELECT h.*, ${COLUNAS_DATAS} FROM hemocomponentes h WHERE h.id = $1`,
            [id]
        );
        return rows[0];
    }

    static async criar(dados, usuarioId) {
        // Não aceita bolsas em lote inexistente ou já fechado
        const lote = (await db.query(
            'SELECT status FROM lotes_recebimento WHERE id = $1', [dados.lote_id])).rows[0];
        if (!lote) {
            const erro = new Error('Lote não encontrado');
            erro.code = '23503';
            throw erro;
        }
        if (lote.status !== 'ABERTO') {
            const erro = new Error('Lote fechado');
            erro.code = 'LOTE_FECHADO';
            throw erro;
        }

        const query = `
            INSERT INTO hemocomponentes
                (lote_id, codigo_original, tipo, abo, fator_rh,
                 data_coleta, data_validade,
                 inspecao_visual, integridade_confirmada, tipagem_confirmada,
                 status, observacoes, cadastrado_por)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            RETURNING id
        `;
        const { rows } = await db.query(query, [
            dados.lote_id,
            dados.codigo_original.trim(),
            dados.tipo,
            dados.abo || null,
            dados.fator_rh || null,
            dados.data_coleta,
            dados.data_validade,
            dados.inspecao_visual === 'on',
            dados.integridade_confirmada === 'on',
            dados.tipagem_confirmada === 'on',
            dados.status || 'EM_CONFERENCIA',
            dados.observacoes || null,
            usuarioId
        ]);
        return rows[0].id;
    }

    static async atualizar(id, dados) {
        // Bolsas reservadas ou transfundidas só mudam de status pelo fluxo próprio
        // (solicitação, compatibilidade e transfusão), nunca por esta tela.
        const atual = await HemocomponenteService.buscarPorId(id);
        if (!atual) return false;

        const protegido = ['RESERVADA', 'TRANSFUNDIDA'];
        let novoStatus = dados.status || atual.status;
        if (protegido.includes(atual.status) || protegido.includes(novoStatus)) {
            novoStatus = atual.status;
        }
        dados = { ...dados, status: novoStatus };

        const query = `
            UPDATE hemocomponentes
            SET tipo = $1,
                abo = $2,
                fator_rh = $3,
                data_validade = $4,
                inspecao_visual = $5,
                integridade_confirmada = $6,
                tipagem_confirmada = $7,
                status = $8,
                observacoes = $9,
                atualizado_em = CURRENT_TIMESTAMP
            WHERE id = $10
        `;
        const resultado = await db.query(query, [
            dados.tipo,
            dados.abo || null,
            dados.fator_rh || null,
            dados.data_validade,
            dados.inspecao_visual === 'on',
            dados.integridade_confirmada === 'on',
            dados.tipagem_confirmada === 'on',
            dados.status,
            dados.observacoes || null,
            id
        ]);
        return resultado.rowCount > 0;
    }

    // Descarte lógico: a bolsa continua registrada, com status DESCARTADA
    static async deletar(id) {
        const atual = await HemocomponenteService.buscarPorId(id);
        if (atual && atual.status === 'RESERVADA') {
            const erro = new Error('Bolsa reservada');
            erro.code = 'BOLSA_RESERVADA';
            throw erro;
        }
        const resultado = await db.query(
            `UPDATE hemocomponentes
             SET status = 'DESCARTADA', atualizado_em = CURRENT_TIMESTAMP
             WHERE id = $1`,
            [id]
        );
        return resultado.rowCount > 0;
    }
}

module.exports = HemocomponenteService;
