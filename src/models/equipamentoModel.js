const db = require('../config/database');
const { PADROES, normalizarEspacos } = require('../utils/padroes');
const { ErroConflito, ErroValidacao } = require('../utils/erros');

const TIPOS = ['Freezer', 'Geladeira', 'Agitador', 'Outro'];
const STATUS_EM_ESTOQUE = `('DISPONIVEL', 'RESERVADA', 'EM_CONFERENCIA')`;

// Padroniza a temperatura para "<número> °C" (ex.: "-80" vira "-80 °C")
function padronizarTemperatura(valor) {
    return `${valor.replace(/\s*°C$/, '')} °C`;
}

function validar(dados) {
    const nome = normalizarEspacos(dados.nome);
    const tipo = dados.tipo;
    const temperaturaInformada = normalizarEspacos(dados.temperatura_operacional);

    if (!PADROES.nomeEquipamento.regex.test(nome)) {
        throw new ErroValidacao(`Nome do equipamento inválido. ${PADROES.nomeEquipamento.mensagem}`);
    }
    if (!TIPOS.includes(tipo)) throw new ErroValidacao('Selecione o tipo do equipamento.');

    let temperatura = null;
    if (temperaturaInformada) {
        if (!PADROES.temperatura.regex.test(temperaturaInformada)) {
            throw new ErroValidacao(`Temperatura inválida. ${PADROES.temperatura.mensagem}`);
        }
        temperatura = padronizarTemperatura(temperaturaInformada);
    }

    return { nome, tipo, temperatura };
}

function traduzirErro(erro) {
    if (erro.code === '23505') return new ErroConflito('Já existe um equipamento com esse nome.');
    return erro;
}

class EquipamentoModel {
    static TIPOS = TIPOS;
    static validar = validar;

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
                throw new ErroConflito(
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

module.exports = EquipamentoModel;
