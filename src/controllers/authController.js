
const bcrypt = require('bcrypt');
const usuarioService = require('../services/usuarioService');

// Hash descartável: gasta o mesmo tempo mesmo quando o login não existe,
// para não revelar quais logins estão cadastrados.
const HASH_FALSO = bcrypt.hashSync('senha-inexistente', 12);

function recusar(res, mensagem, status = 401) {
    return res.status(status).render('auth/login', { erro: mensagem });
}

async function login(req, res) {
    try {
        const { login, senha } = req.body;

        if (typeof login !== 'string' || typeof senha !== 'string' || !login || !senha) {
            return recusar(res, 'Informe o login e a senha.', 400);
        }

        const usuario = await usuarioService.buscarPorLogin(
            login.trim()
        );

        if (!usuario || !usuario.ativo) {
            await usuarioService.verificarSenha(senha, HASH_FALSO);
            return recusar(res, 'Login ou senha inválidos.');
        }

        const senhaCorreta = await usuarioService.verificarSenha(
            senha,
            usuario.senha_hash
        );
        if (!senhaCorreta) {
            return recusar(res, 'Login ou senha inválidos.');
        }

        req.session.regenerate((erro) => {
            if (erro) {
                console.error('Erro ao criar sessão:', erro);
                return res.status(500).send('Erro ao iniciar sessão.');
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
                    return res.status(500).send('Erro ao iniciar sessão.');
                }

                return res.redirect('/dashboard');
            });
        });
    } catch (erro) {
        console.error('Erro no login:', erro.message);
        return res.status(500).send('Erro interno ao realizar login.');
    }
}

function logout(req, res) {
    req.session.destroy((erro) => {
        if (erro) {
            console.error('Erro ao encerrar sessão:', erro);
            return res.status(500).send('Erro ao sair do sistema.');
        }

        res.clearCookie('crioblood.sid');
        return res.redirect('/login');
    });
}

module.exports = {
    login,
    logout
};
