// Troca da própria senha e redefinição de senha pelo administrador
const usuarioService = require('../services/usuarioService');
const AuditoriaService = require('../services/auditoriaService');
const { verificarSenha, validarNovaSenha } = require('../services/authService');
const { avisar } = require('../utils/erros');
const { encerrarSessoesDoUsuario } = require('../services/sessaoService');

// ---------- Troca da própria senha ----------
function mostrarTroca(req, res) {
    res.render('conta/senha', {
        titulo: 'Alterar minha senha',
        acao: '/conta/senha',
        pedirAtual: true,
        voltar: '/dashboard'
    });
}

async function trocar(req, res) {
    const { senha_atual, nova_senha, confirmacao } = req.body;
    const mostrarErro = (mensagem, status = 400) => res.status(status).render('conta/senha', {
        titulo: 'Alterar minha senha',
        acao: '/conta/senha',
        pedirAtual: true,
        voltar: '/dashboard',
        erro: mensagem
    });

    try {
        const hash = await usuarioService.buscarSenhaHash(req.session.usuario.id);
        if (!hash || !(await verificarSenha(senha_atual || '', hash))) {
            return mostrarErro('A senha atual está incorreta.');
        }

        const problema = validarNovaSenha(nova_senha);
        if (problema) return mostrarErro(problema);
        if (nova_senha !== confirmacao) return mostrarErro('A confirmação não confere com a nova senha.');

        await usuarioService.definirSenha(req.session.usuario.id, nova_senha);
        await AuditoriaService.registrarLog(req.session.usuario.id, 'TROCA_SENHA', 'usuarios', req.session.usuario.id, '');

        // Encerra o login em outros aparelhos; esta sessão continua ativa
        const encerradas = await encerrarSessoesDoUsuario(req.session.usuario.id, req.sessionID);

        avisar(req, 'ok', encerradas > 0
            ? 'Senha alterada. Os outros acessos da sua conta foram encerrados.'
            : 'Senha alterada com sucesso.');
        return res.redirect('/dashboard');
    } catch (erro) {
        console.error('Erro ao trocar senha:', erro.message);
        return res.status(500).send('Erro ao alterar a senha.');
    }
}

// ---------- Redefinição pelo administrador ----------
async function mostrarRedefinicao(req, res) {
    try {
        const alvo = await usuarioService.buscarPorId(Number(req.params.id));
        if (!alvo) return res.status(404).send('Usuário não encontrado.');

        res.render('conta/senha', {
            titulo: 'Redefinir senha',
            subtitulo: `${alvo.nome} (${alvo.login})`,
            acao: `/usuarios/${alvo.id}/senha`,
            pedirAtual: false,
            voltar: '/usuarios'
        });
    } catch (erro) {
        console.error('Erro ao abrir redefinição de senha:', erro.message);
        res.status(500).send('Erro ao abrir a redefinição de senha.');
    }
}

async function redefinir(req, res) {
    const id = Number(req.params.id);
    const { nova_senha, confirmacao } = req.body;

    try {
        const alvo = await usuarioService.buscarPorId(id);
        if (!alvo) return res.status(404).send('Usuário não encontrado.');

        const mostrarErro = (mensagem) => res.status(400).render('conta/senha', {
            titulo: 'Redefinir senha',
            subtitulo: `${alvo.nome} (${alvo.login})`,
            acao: `/usuarios/${id}/senha`,
            pedirAtual: false,
            voltar: '/usuarios',
            erro: mensagem
        });

        const problema = validarNovaSenha(nova_senha);
        if (problema) return mostrarErro(problema);
        if (nova_senha !== confirmacao) return mostrarErro('A confirmação não confere com a nova senha.');

        await usuarioService.definirSenha(id, nova_senha);
        await AuditoriaService.registrarLog(req.session.usuario.id, 'REDEFINICAO_SENHA', 'usuarios', id, alvo.login);

        // A pessoa precisa entrar de novo com a senha nova
        await encerrarSessoesDoUsuario(id);

        avisar(req, 'ok', `Senha de ${alvo.nome} redefinida. Ela precisará entrar novamente.`);
        return res.redirect('/usuarios');
    } catch (erro) {
        console.error('Erro ao redefinir senha:', erro.message);
        return res.status(500).send('Erro ao redefinir a senha.');
    }
}

module.exports = { mostrarTroca, trocar, mostrarRedefinicao, redefinir };
