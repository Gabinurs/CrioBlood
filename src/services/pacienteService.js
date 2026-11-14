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
    const nomeMae = (dados.nome_mae || '').trim();
    const prontuario = (dados.prontuario || '').trim() || null;
    const dataNascimento = dados.data_nascimento || '';

    if (nome.length < 3) throw new ErroNegocio('Informe o nome completo do receptor (mínimo de 3 letras).');
    if (nomeMae.length < 3) throw new ErroNegocio('Informe o nome completo da mãe.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dataNascimento)) {
        throw new ErroNegocio('Informe uma data de nascimento válida.');
    }
    const nascimento = new Date(dataNascimento + 'T00:00:00');
    if (isNaN(nascimento.getTime()) || nascimento > new Date()) {
        throw new ErroNegocio('A data de nascimento não pode estar no futuro.');
    }
    if (dados.abo && !['A', 'B', 'AB', 'O'].includes(dados.abo)) throw new ErroNegocio('Grupo ABO inválido.');
    if (dados.fator_rh && !['+', '-'].includes(dados.fator_rh)) throw new ErroNegocio('Fator Rh inválido.');
    if ((dados.abo && !dados.fator_rh) || (!dados.abo && dados.fator_rh)) {
        throw new ErroNegocio('Informe ABO e Rh juntos, ou deixe os dois em branco.');
    }

    return {
        nome,
        nome_mae: nomeMae,
        prontuario,
        data_nascimento: dataNascimento,
        abo: dados.abo || null,
        fator_rh: dados.fator_rh || null,
        cns: (dados.cns || '').trim() || null,
        cpf: (dados.cpf || '').trim() || null,
        rg: (dados.rg || '').trim() || null,
        sexo: (dados.sexo || '').trim() || null,
        telefone: (dados.telefone || '').trim() || null,
        convenio: (dados.convenio || '').trim() || null,
        plano: (dados.plano || '').trim() || null,
        observacoes: (dados.observacoes || '').trim() || null
    };
}

function traduzirErro(erro) {
    if (erro.code === '23505') {
        if (erro.constraint && erro.constraint.includes('prontuario')) {
            return new ErroNegocio('Já existe um receptor com esse número de prontuário.');
        }
        return new ErroNegocio('Já existe um cadastro com uma informação que precisa ser única.');
    }
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
                    (nome, nome_mae, prontuario, data_nascimento, abo, fator_rh,
                     cns, cpf, rg, sexo, telefone, convenio, plano, observacoes, cadastrado_por)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
                 RETURNING id`,
                [d.nome, d.nome_mae, d.prontuario, d.data_nascimento, d.abo, d.fator_rh,
                 d.cns, d.cpf, d.rg, d.sexo, d.telefone, d.convenio, d.plano, d.observacoes, usuarioId]
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
                 SET nome = $1, nome_mae = $2, prontuario = $3, data_nascimento = $4,
                     cns = $5, cpf = $6, rg = $7, sexo = $8, telefone = $9,
                     convenio = $10, plano = $11, observacoes = $12,
                     ativo = $13, atualizado_em = CURRENT_TIMESTAMP
                 WHERE id = $14`,
                [d.nome, d.nome_mae, d.prontuario, d.data_nascimento,
                 d.cns, d.cpf, d.rg, d.sexo, d.telefone, d.convenio, d.plano, d.observacoes,
                 dados.ativo === 'on', id]
            );
        } catch (erro) {
            throw traduzirErro(erro);
        }
    }
}

module.exports = PacienteService;
