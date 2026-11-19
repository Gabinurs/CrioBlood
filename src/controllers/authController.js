
const bcrypt = require('bcrypt');
const usuarioModel = require('../models/usuarioModel');

const STATUS = require('../utils/status');
const { enviarErro } = require('../utils/erros');
// Hash descartável: gasta o mesmo tempo mesmo quando o login não existe,
// para não revelar quais logins estão cadastrados.
const HASH_FALSO = bcrypt.hashSync('senha-inexistente', 12);

function recusar(res, mensagem, status = STATUS.NAO_AUTENTICADO) {
    return res.status(status).render('auth/login', { erro: mensagem });
}

async function login(req, res) {
    try {
        const { login, senha } = req.body;

        if (typeof login !== 'string' || typeof senha !== 'string' || !login || !senha) {
            return recusar(res, 'Informe o login e a senha.', STATUS.ENTIDADE_INVALIDA);
        }

        const usuario = await usuarioModel.buscarPorLogin(
            login.trim()
        );

        if (!usuario || !usuario.ativo) {
            await usuarioModel.verificarSenha(senha, HASH_FALSO);
            return recusar(res, 'Login ou senha inválidos.');
        }

        const senhaCorreta = await usuarioModel.verificarSenha(
            senha,
            usuario.senha_hash
        );
        if (!senhaCorreta) {
            return recusar(res, 'Login ou senha inválidos.');
        }

        req.session.regenerate((erro) => {
            if (erro) {
                console.error('Erro ao criar sessão:', erro);
                return enviarErro(req, res, STATUS.ERRO_INTERNO, 'Erro ao iniciar sessão.');
            }

            req.session.usuario = {
                id: usuario.id,
                nome: usuario.nome,
                login: usuario.login,
                administrador: usuario.administrador
            };

            req.session.save((erroSalvar) => {
                if (erroSalvar) {
                    console.error('Erro ao salvar sessão:', erroSalvar);
                    return enviarErro(req, res, STATUS.ERRO_INTERNO, 'Erro ao iniciar sessão.');
                }

                return res.redirect(STATUS.VER_OUTRO, '/dashboard');
            });
        });
    } catch (erro) {
        console.error('Erro no login:', erro.message);
        return enviarErro(req, res, STATUS.ERRO_INTERNO, 'Erro interno ao realizar login.');
    }
}

function logout(req, res) {
    req.session.destroy((erro) => {
        if (erro) {
            console.error('Erro ao encerrar sessão:', erro);
            return enviarErro(req, res, STATUS.ERRO_INTERNO, 'Erro ao sair do sistema.');
        }

        res.clearCookie('crioblood.sid');
        return res.redirect(STATUS.VER_OUTRO, '/login');
    });
}

module.exports = {
    login,
    logout
};
