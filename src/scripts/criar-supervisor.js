
require('dotenv').config();

const pool = require('../database.js');
const {
    gerarHashSenha,
    verificarSenha
} = require('../services/authService.js');

function validarSenha(senha) {
    if (typeof senha !== 'string' || senha.length < 8) {
        throw new Error('A senha deve ter pelo menos 8 caracteres.');
    }

    if (Buffer.byteLength(senha, 'utf8') > 72) {
        throw new Error('A senha não pode ultrapassar 72 bytes.');
    }
}

async function atualizarSenhaSupervisor(usuarioId, senha) {
    const senhaHash = await gerarHashSenha(senha);
    const conexao = await pool.connect();

    try {
        await conexao.query('BEGIN');

        const usuario = await conexao.query(
            `SELECT id, ativo, administrador
             FROM usuarios
             WHERE id = $1
             FOR UPDATE`,
            [usuarioId]
        );

        if (usuario.rowCount === 0) {
            throw new Error('Usuário Supervisor não encontrado.');
        }

        if (!usuario.rows[0].ativo || !usuario.rows[0].administrador) {
            throw new Error('A conta Supervisor deve estar ativa e ser administradora.');
        }

        const resultado = await conexao.query(
            `UPDATE usuarios
             SET senha_hash = $1,
                 atualizado_em = CURRENT_TIMESTAMP
             WHERE id = $2
             RETURNING senha_hash`,
            [senhaHash, usuarioId]
        );

        const senhaVerificada = await verificarSenha(
            senha,
            resultado.rows[0].senha_hash
        );

        if (!senhaVerificada) {
            throw new Error('A verificação do hash da nova senha falhou.');
        }

        await conexao.query('COMMIT');
    } catch (erro) {
        await conexao.query('ROLLBACK');
        throw erro;
    } finally {
        conexao.release();
    }
}

async function criarSupervisor() {
    try {
        const login = 'Supervisor';
        const senha = process.env.SUPERVISOR_PASSWORD;
        const atualizarExistente = process.argv.includes('--atualizar-senha');

        if (!senha) {
            throw new Error(
                'Configure SUPERVISOR_PASSWORD no arquivo .env.'
            );
        }

        validarSenha(senha);

        const usuarioExistente = await pool.query(
            'SELECT id FROM usuarios WHERE login = $1',
            [login]
        );

        if (usuarioExistente.rows.length > 0) {
            if (atualizarExistente) {
                await atualizarSenhaSupervisor(
                    usuarioExistente.rows[0].id,
                    senha
                );
                console.log('Senha do Supervisor atualizada e validada com sucesso.');
                return;
            }

            console.log('O usuário Supervisor já existe.');
            return;
        }

        if (atualizarExistente) {
            throw new Error(
                'O usuário Supervisor não existe; o modo de atualização não cria a conta.'
            );
        }

        const senhaHash = await gerarHashSenha(senha);

        const resultado = await pool.query(
            `INSERT INTO usuarios
                (nome, login, senha_hash, ativo, administrador)
             VALUES ($1, $2, $3, TRUE, TRUE)
             RETURNING id, nome, login, administrador`,
            ['Supervisor', login, senhaHash]
        );

        const supervisor = resultado.rows[0];

        const permissoes = await pool.query(
            'SELECT id FROM permissoes'
        );

        for (const permissao of permissoes.rows) {
            await pool.query(
                `INSERT INTO usuario_permissoes
                    (usuario_id, permissao_id)
                 VALUES ($1, $2)
                 ON CONFLICT DO NOTHING`,
                [supervisor.id, permissao.id]
            );
        }

        console.log('Supervisor criado com sucesso!');
        console.log('Login:', supervisor.login);
        console.log('Administrador:', supervisor.administrador);
        console.log('Permissões atribuídas:', permissoes.rowCount);
    } catch (erro) {
        console.error('Erro ao criar Supervisor:', erro.message);
        process.exitCode = 1;
    } finally {
        await pool.end();
    }
}

criarSupervisor();
