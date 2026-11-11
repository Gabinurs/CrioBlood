
const usuarioService = require('../services/usuarioService');
const { avisar } = require('../utils/erros');

// Valida o ID recebido pela URL
function lerId(req) {
    const id = Number(req.params.id);
    return Number.isInteger(id) && id > 0 ? id : null;
}

// Exibir lista de usuários
async function listar(req, res) {
    try {
        const usuarios = await usuarioService.listarUsuarios();

        return res.render('usuarios/index', {
            usuario: req.session.usuario,
            usuarios
        });
    } catch (erro) {
        console.error('Erro ao listar usuários:', erro.message);
        return res.status(500).send('Erro ao carregar usuários.');
    }
}

// Exibir formulário de cadastro
function mostrarCadastro(req, res) {
    return res.render('usuarios/cadastro', {
        usuario: req.session.usuario,
        valores: {}
    });
}

// Cadastrar usuário
async function cadastrar(req, res) {
    const nome = req.body.nome?.trim();
    const login = req.body.login?.trim();
    const senha = req.body.senha;

    const mostrarErro = (mensagem, status = 400) => res.status(status).render('usuarios/cadastro', {
        usuario: req.session.usuario,
        valores: { nome, login },
        erro: mensagem
    });

    try {
        if (!nome || !login || !senha) {
            return mostrarErro('Preencha todos os campos obrigatórios.');
        }

        if (nome.length > 150 || login.length > 80) {
            return mostrarErro('Nome ou login ultrapassa o limite permitido.');
        }

        if (senha.length < 8) {
            return mostrarErro('A senha deve ter pelo menos 8 caracteres.');
        }

        await usuarioService.criarUsuario({
            nome,
            login,
            senha,
            administrador: false
        });

        avisar(req, 'ok', 'Usuário cadastrado com sucesso.');
        return res.redirect('/usuarios');
    } catch (erro) {
        if (erro.code === '23505') {
            return mostrarErro('Este login já está cadastrado.', 409);
        }

        console.error('Erro ao cadastrar usuário:', erro.message);
        return res.status(500).send('Erro ao cadastrar usuário.');
    }
}

// Exibir formulário de edição
async function mostrarEdicao(req, res) {
    try {
        const id = lerId(req);

        if (!id) {
            return res.status(400).send('ID de usuário inválido.');
        }

        const usuarioAlvo = await usuarioService.buscarPorId(id);

        if (!usuarioAlvo) {
            return res.status(404).send('Usuário não encontrado.');
        }

        return res.render('usuarios/editar', {
            usuario: req.session.usuario,
            usuarioAlvo
        });
    } catch (erro) {
        console.error('Erro ao abrir edição:', erro.message);
        return res.status(500).send('Erro ao abrir formulário de edição.');
    }
}

// Atualizar nome e login
async function atualizar(req, res) {
    const id = lerId(req);
    const nome = req.body.nome?.trim();
    const login = req.body.login?.trim();

    const mostrarErro = (mensagem, status = 400) => res.status(status).render('usuarios/editar', {
        usuario: req.session.usuario,
        usuarioAlvo: { id, nome, login },
        erro: mensagem
    });

    try {
        if (!id) {
            return res.status(400).send('ID de usuário inválido.');
        }

        if (!nome || !login) {
            return mostrarErro('Preencha o nome e o login.');
        }

        if (nome.length > 150 || login.length > 80) {
            return mostrarErro('Nome ou login ultrapassa o limite permitido.');
        }

        const usuarioAtualizado = await usuarioService.atualizarUsuario(id, { nome, login });

        if (!usuarioAtualizado) {
            return res.status(404).send('Usuário não encontrado.');
        }

        avisar(req, 'ok', 'Dados do usuário atualizados.');
        return res.redirect('/usuarios');
    } catch (erro) {
        if (erro.code === '23505') {
            return mostrarErro('Este login já está cadastrado.', 409);
        }

        console.error('Erro ao atualizar usuário:', erro.message);
        return res.status(500).send('Erro ao atualizar usuário.');
    }
}

// Ativar ou desativar uma conta
async function alternarStatus(req, res) {
    try {
        const id = lerId(req);

        if (!id) {
            return res.status(400).send('ID de usuário inválido.');
        }

        // Impede que o administrador desative a própria conta.
        if (Number(req.session.usuario.id) === id) {
            avisar(req, 'erro', 'Você não pode alterar o status da sua própria conta.');
            return res.redirect('/usuarios');
        }

        const usuarioAlvo = await usuarioService.buscarPorId(id);

        if (!usuarioAlvo) {
            return res.status(404).send('Usuário não encontrado.');
        }

        await usuarioService.definirAtivo(id, !usuarioAlvo.ativo);

        avisar(req, 'ok', `Usuário ${usuarioAlvo.ativo ? 'desativado' : 'ativado'}.`);
        return res.redirect('/usuarios');
    } catch (erro) {
        console.error('Erro ao alterar status:', erro.message);
        return res.status(500).send('Erro ao alterar status do usuário.');
    }
}

// Exibir permissões de um usuário
async function mostrarPermissoes(req, res) {
    try {
        const id = lerId(req);

        if (!id) {
            return res.status(400).send('ID de usuário inválido.');
        }

        const usuarioAlvo = await usuarioService.buscarPorId(id);

        if (!usuarioAlvo) {
            return res.status(404).send('Usuário não encontrado.');
        }

        const permissoes = await usuarioService.listarPermissoes();
        const permissoesUsuario = await usuarioService.listarPermissoesUsuario(id);
        const idsSelecionados = permissoesUsuario.map(permissao => permissao.id);

        return res.render('usuarios/permissoes', {
            usuario: req.session.usuario,
            usuarioAlvo,
            permissoes,
            idsSelecionados
        });
    } catch (erro) {
        console.error('Erro ao carregar permissões:', erro.message);
        return res.status(500).send('Erro ao carregar permissões.');
    }
}

// Salvar permissões de um usuário
async function salvarPermissoes(req, res) {
    try {
        const id = lerId(req);

        if (!id) {
            return res.status(400).send('ID de usuário inválido.');
        }

        const permissoesIds = req.body.permissoes || [];
        const lista = Array.isArray(permissoesIds) ? permissoesIds : [permissoesIds];

        await usuarioService.salvarPermissoes(id, lista);

        avisar(req, 'ok', 'Permissões salvas.');
        return res.redirect(`/usuarios/${id}/permissoes`);
    } catch (erro) {
        console.error('Erro ao salvar permissões:', erro.message);

        if (erro.message === 'Usuário não encontrado.') {
            return res.status(404).send(erro.message);
        }

        return res.status(400).send(
            'Não foi possível salvar as permissões. ' +
            'Verifique os dados e tente novamente.'
        );
    }
}

module.exports = {
    listar,
    mostrarCadastro,
    cadastrar,
    mostrarEdicao,
    atualizar,
    alternarStatus,
    mostrarPermissoes,
    salvarPermissoes
};
