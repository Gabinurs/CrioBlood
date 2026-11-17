
const usuarioService = require('../services/usuarioService');

async function login(req, res) {
    try {
        const { login, senha } = req.body;

        if (!login || !senha) {
            return res.status(400).send('Informe o login e a senha.');
        }

        const usuario = await usuarioService.buscarPorLogin(
            login.trim()
        );

        if (!usuario || !usuario.ativo) {
            return res.status(401).send('Login ou senha inválidos.');
        }

        const senhaCorreta = await usuarioService.verificarSenha(
            senha,
            usuario.senha_hash
        );
        if (!senhaCorreta) {
            return res.status(401).send('Login ou senha inválidos.');
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
                administrador: usuario.administrador,
                funcao: usuario.funcao
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
