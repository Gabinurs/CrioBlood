const crypto = require('crypto');
const db = require('../config/database');
const { sqlLimite } = require('../utils/paginacao');
const { ErroConflito, ErroNaoEncontrado, ErroValidacao } = require('../utils/erros');

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

    static async abrir(origemInformada, usuarioId) {
        const origem = typeof origemInformada === 'string' ? origemInformada.trim().replace(/\s+/g, ' ') : '';
        if (!origem || origem.length > 100 || /[\u0000-\u001F\u007F]/.test(origem)) {
            throw new ErroValidacao('Informe a origem do recebimento (de 1 a 100 caracteres).');
        }

        const codigo = LoteModel.gerarCodigo();

        await db.query(
            `INSERT INTO lotes_recebimento (codigo, origem, aberto_por)
             VALUES ($1, $2, $3)`,
            [codigo, origem, usuarioId]
        );

        return codigo;
    }

    // Recupera os dados do lote e todas as bolsas para o comprovante de recebimento.
    static async buscarRelatorio(id) {
        const lote = (await db.query(
            `SELECT l.id, l.codigo, l.origem, l.status,
                    to_char(l.data_recebimento AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI:SS') AS recebido_em_br,
                    to_char(l.criado_em AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI:SS') AS aberto_em_br,
                    u.nome AS responsavel_abertura
             FROM lotes_recebimento l
             INNER JOIN usuarios u ON u.id = l.aberto_por
             WHERE l.id = $1`,
            [id]
        )).rows[0];

        if (!lote) return null;

        const { rows: bolsas } = await db.query(
            `SELECT h.id, h.codigo_original, h.codigo_interno, h.tipo, h.abo, h.fator_rh,
                    h.volume_ml, h.status,
                    to_char(h.criado_em AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI:SS') AS cadastrado_em_br,
                    u.nome AS responsavel_cadastro
             FROM hemocomponentes h
             INNER JOIN usuarios u ON u.id = h.cadastrado_por
             WHERE h.lote_id = $1
             ORDER BY h.criado_em ASC, h.id ASC`,
            [id]
        );

        return { lote, bolsas };
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
