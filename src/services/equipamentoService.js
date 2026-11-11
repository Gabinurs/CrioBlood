const db = require('../database');
const { ErroNegocio } = require('../utils/erros');

const TIPOS = ['Freezer', 'Geladeira', 'Agitador', 'Outro'];
const STATUS_EM_ESTOQUE = `('DISPONIVEL', 'RESERVADA', 'EM_CONFERENCIA')`;

function validar(dados) {
    const nome = (dados.nome || '').trim();
    const tipo = dados.tipo;
    const temperatura = (dados.temperatura_operacional || '').trim();

    if (nome.length < 2) throw new ErroNegocio('Informe o nome do equipamento (mínimo de 2 letras).');
    if (nome.length > 100) throw new ErroNegocio('O nome do equipamento deve ter no máximo 100 caracteres.');
    if (!TIPOS.includes(tipo)) throw new ErroNegocio('Selecione o tipo do equipamento.');
    if (temperatura.length > 20) throw new ErroNegocio('A temperatura deve ter no máximo 20 caracteres (ex.: -80 °C).');

    return { nome, tipo, temperatura: temperatura || null };
}

function traduzirErro(erro) {
    if (erro.code === '23505') return new ErroNegocio('Já existe um equipamento com esse nome.');
    return erro;
}

class EquipamentoService {
    static TIPOS = TIPOS;

    static async listar() {
        const { rows } = await db.query(`
            SELECT e.id, e.nome, e.tipo, e.temperatura_operacional, e.ativo,
                   COUNT(a.id) FILTER (WHERE h.status IN ${STATUS_EM_ESTOQUE})::int AS bolsas
            FROM equipamentos e
            LEFT JOIN armazenamento a ON a.equipamento_id = e.id
            LEFT JOIN hemocomponentes h ON h.id = a.hemocomponente_id
            GROUP BY e.id
            ORDER BY e.ativo DESC, e.nome ASC
        `);
        return rows;
    }

    static async listarAtivos() {
        const { rows } = await db.query(
            `SELECT id, nome, tipo, temperatura_operacional
             FROM equipamentos WHERE ativo = TRUE ORDER BY nome ASC`);
        return rows;
    }

    static async buscarPorId(id) {
        const { rows } = await db.query('SELECT * FROM equipamentos WHERE id = $1', [id]);
        return rows[0];
    }

    static async criar(dados) {
        const d = validar(dados);
        try {
            const { rows } = await db.query(
                `INSERT INTO equipamentos (nome, tipo, temperatura_operacional)
                 VALUES ($1, $2, $3) RETURNING id`,
                [d.nome, d.tipo, d.temperatura]);
            return rows[0].id;
        } catch (erro) {
            throw traduzirErro(erro);
        }
    }

    static async atualizar(id, dados) {
        const d = validar(dados);
        const ativo = dados.ativo === 'on';

        if (!ativo) {
            const { rows } = await db.query(
                `SELECT COUNT(*)::int AS total
                 FROM armazenamento a
                 JOIN hemocomponentes h ON h.id = a.hemocomponente_id
                 WHERE a.equipamento_id = $1 AND h.status IN ${STATUS_EM_ESTOQUE}`, [id]);
            if (rows[0].total > 0) {
                throw new ErroNegocio(
                    `Há ${rows[0].total} bolsa(s) neste equipamento. Mova-as para outro local antes de desativá-lo.`);
            }
        }

        try {
            await db.query(
                `UPDATE equipamentos SET nome = $1, tipo = $2, temperatura_operacional = $3, ativo = $4
                 WHERE id = $5`,
                [d.nome, d.tipo, d.temperatura, ativo, id]);
        } catch (erro) {
            throw traduzirErro(erro);
        }
    }
}

module.exports = EquipamentoService;
