const db = require('../database');
const { ErroNegocio } = require('../utils/erros');

const COLUNAS = `
    p.*,
    to_char(p.data_nascimento, 'DD/MM/YYYY') AS data_nascimento_br,
    to_char(p.data_nascimento, 'YYYY-MM-DD') AS data_nascimento_iso,
    date_part('year', age(p.data_nascimento))::int AS idade
`;

function validar(dados) {
    const nome = (dados.nome || '').trim();
    const prontuario = (dados.prontuario || '').trim();

    if (nome.length < 3) throw new ErroNegocio('Informe o nome completo do paciente (mínimo de 3 letras).');
    if (!prontuario) throw new ErroNegocio('O número do prontuário é obrigatório.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dados.data_nascimento || '')) {
        throw new ErroNegocio('Informe uma data de nascimento válida.');
    }
    const nascimento = new Date(dados.data_nascimento);
    if (isNaN(nascimento) || nascimento > new Date()) {
        throw new ErroNegocio('A data de nascimento não pode estar no futuro.');
    }
    if (dados.abo && !['A', 'B', 'AB', 'O'].includes(dados.abo)) throw new ErroNegocio('Grupo ABO inválido.');
    if (dados.fator_rh && !['+', '-'].includes(dados.fator_rh)) throw new ErroNegocio('Fator Rh inválido.');
    if ((dados.abo && !dados.fator_rh) || (!dados.abo && dados.fator_rh)) {
        throw new ErroNegocio('Informe ABO e Rh juntos, ou deixe os dois em branco.');
    }

    return {
        nome,
        prontuario,
        data_nascimento: dados.data_nascimento,
        abo: dados.abo || null,
        fator_rh: dados.fator_rh || null,
        observacoes: (dados.observacoes || '').trim() || null
    };
}

function traduzirErro(erro) {
    if (erro.code === '23505') return new ErroNegocio('Já existe um paciente com esse número de prontuário.');
    return erro;
}

class PacienteService {
    static async listar() {
        const { rows } = await db.query(
            `SELECT ${COLUNAS} FROM pacientes p ORDER BY p.ativo DESC, p.nome ASC`
        );
        return rows;
    }

    static async listarAtivos() {
        const { rows } = await db.query(
            `SELECT p.id, p.nome, p.prontuario, p.abo, p.fator_rh
             FROM pacientes p WHERE p.ativo = TRUE ORDER BY p.nome ASC`
        );
        return rows;
    }

    static async buscarPorId(id) {
        const { rows } = await db.query(`SELECT ${COLUNAS} FROM pacientes p WHERE p.id = $1`, [id]);
        return rows[0];
    }

    static async criar(dados, usuarioId) {
        const d = validar(dados);
        try {
            const { rows } = await db.query(
                `INSERT INTO pacientes
                    (nome, prontuario, data_nascimento, abo, fator_rh, observacoes, cadastrado_por)
                 VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
                [d.nome, d.prontuario, d.data_nascimento, d.abo, d.fator_rh, d.observacoes, usuarioId]
            );
            return rows[0].id;
        } catch (erro) {
            throw traduzirErro(erro);
        }
    }

    static async atualizar(id, dados) {
        const d = validar(dados);
        try {
            await db.query(
                `UPDATE pacientes
                 SET nome = $1, prontuario = $2, data_nascimento = $3, abo = $4, fator_rh = $5,
                     observacoes = $6, ativo = $7, atualizado_em = CURRENT_TIMESTAMP
                 WHERE id = $8`,
                [d.nome, d.prontuario, d.data_nascimento, d.abo, d.fator_rh, d.observacoes,
                 dados.ativo === 'on', id]
            );
        } catch (erro) {
            throw traduzirErro(erro);
        }
    }
}

module.exports = PacienteService;
