
const pool = require('../database');
const crypto = require('crypto');
const AuditoriaService = require('../services/auditoriaService');
const { ErroNegocio, avisar, tratar } = require('../utils/erros');

// Listar lotes cadastrados
async function listar(req, res) {
    try {
        const resultado = await pool.query(`
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
        `);

        res.render('lotes/index', {
            usuario: req.session.usuario,
            lotes: resultado.rows
        });
    } catch (erro) {
        console.error('Erro ao listar lotes:', erro.message);

        res.status(500).send(
            'Não foi possível carregar os lotes de recebimento.'
        );
    }
}

// Fechar um lote.
// Regras: o lote precisa estar aberto, ter ao menos uma bolsa e nenhuma
// bolsa pode continuar "em conferência". Depois de fechado, não recebe novas bolsas.
async function fechar(req, res) {
    const cliente = await pool.connect();
    const id = parseInt(req.params.id, 10);

    try {
        await cliente.query('BEGIN');

        const lote = (await cliente.query(
            'SELECT id, codigo, status FROM lotes_recebimento WHERE id = $1 FOR UPDATE',
            [id]
        )).rows[0];

        if (!lote) throw new ErroNegocio('Lote não encontrado.');
        if (lote.status !== 'ABERTO') throw new ErroNegocio('Esse lote já está fechado.');

        const contagem = (await cliente.query(
            `SELECT COUNT(*)::int AS total,
                    COUNT(*) FILTER (WHERE status = 'EM_CONFERENCIA')::int AS em_conferencia
             FROM hemocomponentes WHERE lote_id = $1`,
            [id]
        )).rows[0];

        if (contagem.total === 0) {
            throw new ErroNegocio('Não é possível fechar um lote sem bolsas. Cadastre ao menos uma bolsa.');
        }
        if (contagem.em_conferencia > 0) {
            throw new ErroNegocio(
                `Ainda há ${contagem.em_conferencia} bolsa(s) em conferência neste lote. ` +
                'Conclua a conferência antes de fechar.'
            );
        }

        await cliente.query(
            `UPDATE lotes_recebimento
             SET status = 'FECHADO', fechado_por = $1, fechado_em = CURRENT_TIMESTAMP
             WHERE id = $2`,
            [req.session.usuario.id, id]
        );

        await cliente.query('COMMIT');

        await AuditoriaService.registrarLog(
            req.session.usuario.id, 'FECHAMENTO_LOTE', 'lotes_recebimento', id, lote.codigo);

        avisar(req, 'ok', `Lote ${lote.codigo} fechado com sucesso.`);
        return res.redirect('/lotes');
    } catch (erro) {
        await cliente.query('ROLLBACK');
        return tratar(req, res, erro, '/lotes', 'Erro ao fechar lote');
    } finally {
        cliente.release();
    }
}

// Abrir um novo lote
async function abrir(req, res) {
    try {
        const usuarioId = req.session.usuario.id;

        // Gera um código próprio para o lote.
        // O código original das bolsas será preservado separadamente.
        const data = new Date();
        const ano = data.getFullYear();
        const mes = String(data.getMonth() + 1).padStart(2, '0');
        const dia = String(data.getDate()).padStart(2, '0');
        const identificador = crypto.randomBytes(3).toString('hex').toUpperCase();

        const codigo = `LOT-${ano}${mes}${dia}-${identificador}`;

        await pool.query(
            `INSERT INTO lotes_recebimento
                (codigo, origem, aberto_por)
             VALUES ($1, $2, $3)`,
            [codigo, 'Taubaté', usuarioId]
        );

        avisar(req, 'ok', `Lote ${codigo} aberto. Já é possível cadastrar as bolsas recebidas.`);
        return res.redirect('/lotes');
    } catch (erro) {
        console.error('Erro ao abrir lote:', erro.message);

        return res.status(500).send(
            'Não foi possível abrir o lote de recebimento.'
        );
    }
}

module.exports = {
    listar,
    abrir,
    fechar
};

