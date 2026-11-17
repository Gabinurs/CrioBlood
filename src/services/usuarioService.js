
const pool = require('../database');
const { gerarHashSenha, verificarSenha } = require('./authService');

// Buscar usuário pelo login
async function buscarPorLogin(login) {
    const resultado = await pool.query(
        `SELECT id, nome, login, senha_hash, ativo, administrador, funcao
         FROM usuarios
         WHERE login = $1`,
        [login]
    );

    return resultado.rows[0] || null;
}

// Listar usuários cadastrados
async function listarUsuarios() {
    const resultado = await pool.query(
        `SELECT id, nome, login, ativo, administrador, funcao,
                criado_em, atualizado_em
         FROM usuarios
         ORDER BY nome ASC`
    );

    return resultado.rows;
}

// Buscar usuário pelo ID
async function buscarPorId(id) {
    const resultado = await pool.query(
        `SELECT id, nome, login, ativo, administrador, funcao,
                criado_em, atualizado_em
         FROM usuarios
         WHERE id = $1`,
        [id]
    );

    return resultado.rows[0] || null;
}

// Cadastrar usuário
async function criarUsuario({
    nome,
    login,
    senha,
    administrador = false,
    funcao = 'NAO_INFORMADO'
}) {
    const senhaHash = await gerarHashSenha(senha);

    const resultado = await pool.query(
        `INSERT INTO usuarios
            (nome, login, senha_hash, administrador, funcao)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, nome, login, ativo, administrador, funcao`,
        [
            nome.trim(),
            login.trim(),
            senhaHash,
            administrador,
            funcao
        ]
    );

    return resultado.rows[0];
}

// Atualizar nome e login
async function atualizarUsuario(id, { nome, login, funcao }) {
    const resultado = await pool.query(
        `UPDATE usuarios
         SET nome = $1,
             login = $2,
             funcao = $3,
             atualizado_em = CURRENT_TIMESTAMP
         WHERE id = $4
         RETURNING id, nome, login, ativo, administrador, funcao`,
        [nome.trim(), login.trim(), funcao, id]
    );

    return resultado.rows[0] || null;
}

// Ativar ou desativar uma conta
async function definirAtivo(id, ativo) {
    const resultado = await pool.query(
        `UPDATE usuarios
         SET ativo = $1,
             atualizado_em = CURRENT_TIMESTAMP
         WHERE id = $2
         RETURNING id, nome, login, ativo, administrador, funcao`,
        [ativo, id]
    );

    return resultado.rows[0] || null;
}

// Listar permissões disponíveis
async function listarPermissoes() {
    const resultado = await pool.query(
        `SELECT id, codigo, descricao
         FROM permissoes
         ORDER BY id ASC`
    );

    return resultado.rows;
}

// Listar permissões atribuídas a um usuário
async function listarPermissoesUsuario(usuarioId) {
    const resultado = await pool.query(
        `SELECT p.id, p.codigo, p.descricao
         FROM permissoes p
         INNER JOIN usuario_permissoes up
             ON up.permissao_id = p.id
         WHERE up.usuario_id = $1
         ORDER BY p.id ASC`,
        [usuarioId]
    );

    return resultado.rows;
}

// Substituir as permissões de um usuário
async function salvarPermissoes(usuarioId, permissoesIds) {
    const conexao = await pool.connect();

    try {
        await conexao.query('BEGIN');

        const usuario = await conexao.query(
            'SELECT id FROM usuarios WHERE id = $1 FOR UPDATE',
            [usuarioId]
        );

        if (usuario.rowCount === 0) {
            throw new Error('Usuário não encontrado.');
        }

        const ids = [...new Set(permissoesIds.map(Number))];

        if (ids.some(id => !Number.isInteger(id) || id <= 0)) {
            throw new Error('Existe uma permissão inválida.');
        }

        if (ids.length > 0) {
            const existentes = await conexao.query(
                'SELECT id FROM permissoes WHERE id = ANY($1::int[])',
                [ids]
            );

            if (existentes.rowCount !== ids.length) {
                throw new Error('Uma ou mais permissões não existem.');
            }
        }

        await conexao.query(
            'DELETE FROM usuario_permissoes WHERE usuario_id = $1',
            [usuarioId]
        );

        for (const permissaoId of ids) {
            await conexao.query(
                `INSERT INTO usuario_permissoes
                    (usuario_id, permissao_id)
                 VALUES ($1, $2)`,
                [usuarioId, permissaoId]
            );
        }

        await conexao.query('COMMIT');

        return true;
    } catch (erro) {
        await conexao.query('ROLLBACK');
        throw erro;
    } finally {
        conexao.release();
    }
}

module.exports = {
    buscarPorLogin,
    buscarPorId,
    listarUsuarios,
    criarUsuario,
    atualizarUsuario,
    definirAtivo,
    listarPermissoes,
    listarPermissoesUsuario,
    salvarPermissoes,
    verificarSenha
};
