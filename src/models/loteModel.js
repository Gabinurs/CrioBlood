const crypto = require('crypto');
const db = require('../config/database');
const { sqlLimite } = require('../utils/paginacao');
const { ErroConflito, ErroNaoEncontrado } = require('../utils/erros');

// Lotes de recebimento de bolsas
class LoteModel {
    static async contar() {
        const { rows } = await db.query('SELECT COUNT(*)::int AS total FROM lotes_recebimento');
        return rows[0].total;
    }

    static async listar(pag = {}) {
        const { rows } = await db.query(`
            SELECT
                l.id,
                l.codigo,
                l.data_recebimento,
                l.origem,
                l.status,
                l.criado_em,
                l.fechado_em,
                u.nome AS responsavel_abertura,
                COUNT(h.id)::INTEGER AS quantidade_bolsas,
                COUNT(h.id) FILTER (WHERE h.status = 'EM_CONFERENCIA')::INTEGER AS em_conferencia
            FROM lotes_recebimento l
            INNER JOIN usuarios u
                ON u.id = l.aberto_por
            LEFT JOIN hemocomponentes h
                ON h.lote_id = l.id
            GROUP BY l.id, u.nome
            ORDER BY l.criado_em DESC
            ${sqlLimite(pag)}
        `);
        return rows;
    }

    // Código próprio do lote (o código original das bolsas é guardado à parte): LOT-AAAAMMDD-XXXXXX
    static gerarCodigo(data = new Date()) {
        const ano = data.getFullYear();
        const mes = String(data.getMonth() + 1).padStart(2, '0');
        const dia = String(data.getDate()).padStart(2, '0');
        const identificador = crypto.randomBytes(3).toString('hex').toUpperCase();

        return `LOT-${ano}${mes}${dia}-${identificador}`;
    }

    static async abrir(usuarioId) {
        const codigo = LoteModel.gerarCodigo();

        await db.query(
            `INSERT INTO lotes_recebimento (codigo, origem, aberto_por)
             VALUES ($1, $2, $3)`,
            [codigo, 'Taubaté', usuarioId]
        );

        return codigo;
    }

    // Fechar um lote.
    // Regras: o lote precisa estar aberto, ter ao menos uma bolsa e nenhuma
    // bolsa pode continuar "em conferência". Depois de fechado, não recebe novas bolsas.
    // Retorna o código do lote fechado.
    static async fechar(id, usuarioId) {
        const cliente = await db.connect();

        try {
            await cliente.query('BEGIN');

            const lote = (await cliente.query(
                'SELECT id, codigo, status FROM lotes_recebimento WHERE id = $1 FOR UPDATE',
                [id]
            )).rows[0];

            if (!lote) throw new ErroNaoEncontrado('Lote não encontrado.');
            if (lote.status !== 'ABERTO') throw new ErroConflito('Esse lote já está fechado.');

            const contagem = (await cliente.query(
                `SELECT COUNT(*)::int AS total,
                        COUNT(*) FILTER (WHERE status = 'EM_CONFERENCIA')::int AS em_conferencia
                 FROM hemocomponentes WHERE lote_id = $1`,
                [id]
            )).rows[0];

            if (contagem.total === 0) {
                throw new ErroConflito('Não é possível fechar um lote sem bolsas. Cadastre ao menos uma bolsa.');
            }
            if (contagem.em_conferencia > 0) {
                throw new ErroConflito(
                    `Ainda há ${contagem.em_conferencia} bolsa(s) em conferência neste lote. ` +
                    'Conclua a conferência antes de fechar.'
                );
            }

            await cliente.query(
                `UPDATE lotes_recebimento
                 SET status = 'FECHADO', fechado_por = $1, fechado_em = CURRENT_TIMESTAMP
                 WHERE id = $2`,
                [usuarioId, id]
            );

            await cliente.query('COMMIT');
            return lote.codigo;
        } catch (erro) {
            await cliente.query('ROLLBACK');
            throw erro;
        } finally {
            cliente.release();
        }
    }
}

module.exports = LoteModel;
