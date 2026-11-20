const db = require('../config/database');
const { PADROES, LIMITE_TEXTO_LIVRE, textoLivreValido, normalizarEspacos, ehDataValida } = require('../utils/padroes');
const { sqlLimite } = require('../utils/paginacao');
const { ErroConflito, ErroValidacao } = require('../utils/erros');

const COLUNAS = `
    p.*,
    to_char(p.data_nascimento, 'DD/MM/YYYY') AS data_nascimento_br,
    to_char(p.data_nascimento, 'YYYY-MM-DD') AS data_nascimento_iso,
    date_part('year', age(p.data_nascimento))::int AS idade
`;

function validar(dados) {
    const nome = normalizarEspacos(dados.nome);
    const prontuario = normalizarEspacos(dados.prontuario || '').toUpperCase();
    const nomeMae = normalizarEspacos(dados.nome_mae || '');
    const observacoes = (dados.observacoes || '').trim();
    const cns = normalizarEspacos(dados.cns || '');
    const cpf = normalizarEspacos(dados.cpf || '');
    const rg = normalizarEspacos(dados.rg || '');
    const telefone = normalizarEspacos(dados.telefone || '');

    if (!PADROES.nomePessoa.regex.test(nome)) {
        throw new ErroValidacao(`Nome inválido. ${PADROES.nomePessoa.mensagem}`);
    }
    if (nomeMae.length < 3 || !PADROES.nomePessoa.regex.test(nomeMae)) throw new ErroValidacao('Informe o nome completo da mãe.');
    if (prontuario && !PADROES.prontuario.regex.test(prontuario)) {
        throw new ErroValidacao(`Prontuário inválido. ${PADROES.prontuario.mensagem}`);
    }
    if (!ehDataValida(dados.data_nascimento)) {
        throw new ErroValidacao('Informe uma data de nascimento válida.');
    }
    if (dados.data_nascimento < '1900-01-01') {
        throw new ErroValidacao('A data de nascimento não pode ser anterior a 1900.');
    }
    if (new Date(`${dados.data_nascimento}T00:00:00`) > new Date()) {
        throw new ErroValidacao('A data de nascimento não pode estar no futuro.');
    }
    if (cns && !PADROES.cns.regex.test(cns)) throw new ErroValidacao(`CNS inválido. ${PADROES.cns.mensagem}`);
    if (cpf && !PADROES.cpf.regex.test(cpf)) throw new ErroValidacao(`CPF inválido. ${PADROES.cpf.mensagem}`);
    if (rg && !PADROES.rg.regex.test(rg)) throw new ErroValidacao(`RG inválido. ${PADROES.rg.mensagem}`);
    if (telefone && !PADROES.telefone.regex.test(telefone)) throw new ErroValidacao(`Telefone inválido. ${PADROES.telefone.mensagem}`);
    if (dados.abo && !['A', 'B', 'AB', 'O'].includes(dados.abo)) throw new ErroValidacao('Grupo ABO inválido.');
    if (dados.fator_rh && !['+', '-'].includes(dados.fator_rh)) throw new ErroValidacao('Fator Rh inválido.');
    if ((dados.abo && !dados.fator_rh) || (!dados.abo && dados.fator_rh)) {
        throw new ErroValidacao('Informe ABO e Rh juntos, ou deixe os dois em branco.');
    }
    if (!textoLivreValido(observacoes)) {
        throw new ErroValidacao(`Observações: use até ${LIMITE_TEXTO_LIVRE} caracteres, sem caracteres de controle.`);
    }

    return {
        nome,
        nome_mae: nomeMae,
        prontuario: prontuario || null,
        cns: cns || null,
        cpf: cpf || null,
        rg: rg || null,
        sexo: (dados.sexo || '').trim() || null,
        telefone: telefone || null,
        convenio: (dados.convenio || '').trim() || null,
        plano: (dados.plano || '').trim() || null,
        data_nascimento: dados.data_nascimento,
        abo: dados.abo || null,
        fator_rh: dados.fator_rh || null,
        observacoes: observacoes || null
    };
}

function traduzirErro(erro) {
    if (erro.code === '23505') return new ErroConflito('Já existe um paciente com esse número de prontuário.');
    return erro;
}

class PacienteModel {
    static validar = validar;

    static async listar(pag = {}) {
        const { rows } = await db.query(
            `SELECT ${COLUNAS} FROM pacientes p ORDER BY p.ativo DESC, p.nome ASC ${sqlLimite(pag)}`
        );
        return rows;
    }

    static async contar() {
        const { rows } = await db.query('SELECT COUNT(*)::int AS total FROM pacientes');
        return rows[0].total;
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
                    (nome, nome_mae, prontuario, data_nascimento, abo, fator_rh, cns, cpf, rg, sexo, telefone, convenio, plano, observacoes, cadastrado_por)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) RETURNING id`,
                [d.nome, d.nome_mae, d.prontuario, d.data_nascimento, d.abo, d.fator_rh, d.cns, d.cpf, d.rg, d.sexo, d.telefone, d.convenio, d.plano, d.observacoes, usuarioId]
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
                 SET nome = $1, nome_mae = $2, prontuario = $3, data_nascimento = $4, abo = $5, fator_rh = $6,
                     cns = $7, cpf = $8, rg = $9, sexo = $10, telefone = $11, convenio = $12, plano = $13,
                     observacoes = $14, ativo = $15, atualizado_em = CURRENT_TIMESTAMP
                 WHERE id = $16`,
                [d.nome, d.nome_mae, d.prontuario, d.data_nascimento, d.abo, d.fator_rh, d.cns, d.cpf, d.rg,
                 d.sexo, d.telefone, d.convenio, d.plano, d.observacoes, dados.ativo === 'on', id]
            );
        } catch (erro) {
            throw traduzirErro(erro);
        }
    }
}

module.exports = PacienteModel;
