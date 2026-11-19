
const usuarioModel = require('../models/usuarioModel');
const { avisar, enviarErro } = require('../utils/erros');
const { validarNovaSenha } = require('../services/authService');
const { PADROES, normalizarEspacos } = require('../utils/padroes');
const { encerrarSessoesDoUsuario } = require('../services/sessaoService');

const STATUS = require('../utils/status');
// Valida o ID recebido pela URL
function lerId(req) {
    const id = Number(req.params.id);
    return Number.isInteger(id) && id > 0 ? id : null;
}

// Exibir lista de usuários
async function listar(req, res) {
    try {
        const usuarios = await usuarioModel.listarUsuarios();

        return res.render('usuarios/index', {
            usuario: req.session.usuario,
            usuarios
        });
    } catch (erro) {
        console.error('Erro ao listar usuários:', erro.message);
        return enviarErro(req, res, STATUS.ERRO_INTERNO, 'Erro ao carregar usuários.');
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
    const nome = normalizarEspacos(req.body.nome);
    const login = req.body.login?.trim();
    const senha = req.body.senha;

    const mostrarErro = (mensagem, status = STATUS.ENTIDADE_INVALIDA) => res.status(status).render('usuarios/cadastro', {
        usuario: req.session.usuario,
        valores: { nome, login },
        erro: mensagem
    });

    try {
        if (!nome || !login || !senha) {
            return mostrarErro('Preencha todos os campos obrigatórios.');
        }

        if (!PADROES.nomePessoa.regex.test(nome)) {
            return mostrarErro(`Nome inválido. ${PADROES.nomePessoa.mensagem}`);
        }

        if (!PADROES.login.regex.test(login)) {
            return mostrarErro(`Login inválido. ${PADROES.login.mensagem}`);
        }

        const problemaSenha = validarNovaSenha(senha);
        if (problemaSenha) {
            return mostrarErro(problemaSenha);
        }

        await usuarioModel.criarUsuario({
            nome,
            login,
            senha,
            administrador: false
        });

        avisar(req, 'ok', 'Usuário cadastrado com sucesso.');
        return res.redirect(STATUS.VER_OUTRO, '/usuarios');
    } catch (erro) {
        if (erro.code === '23505') {
            return mostrarErro('Este login já está cadastrado.', STATUS.CONFLITO);
        }

        console.error('Erro ao cadastrar usuário:', erro.message);
        return enviarErro(req, res, STATUS.ERRO_INTERNO, 'Erro ao cadastrar usuário.');
    }
}

// Exibir formulário de edição
async function mostrarEdicao(req, res) {
    try {
        const id = lerId(req);

        if (!id) {
            return enviarErro(req, res, STATUS.REQUISICAO_INVALIDA, 'ID de usuário inválido.');
        }

        const usuarioAlvo = await usuarioModel.buscarPorId(id);

        if (!usuarioAlvo) {
            return enviarErro(req, res, STATUS.NAO_ENCONTRADO, 'Usuário não encontrado.');
        }

        return res.render('usuarios/editar', {
            usuario: req.session.usuario,
            usuarioAlvo
        });
    } catch (erro) {
        console.error('Erro ao abrir edição:', erro.message);
        return enviarErro(req, res, STATUS.ERRO_INTERNO, 'Erro ao abrir formulário de edição.');
    }
}

// Atualizar nome e login
async function atualizar(req, res) {
    const id = lerId(req);
    const nome = normalizarEspacos(req.body.nome);
    const login = req.body.login?.trim();

    const mostrarErro = (mensagem, status = STATUS.ENTIDADE_INVALIDA) => res.status(status).render('usuarios/editar', {
        usuario: req.session.usuario,
        usuarioAlvo: { id, nome, login },
        erro: mensagem
    });

    try {
        if (!id) {
            return enviarErro(req, res, STATUS.REQUISICAO_INVALIDA, 'ID de usuário inválido.');
        }

        if (!nome || !login) {
            return mostrarErro('Preencha o nome e o login.');
        }

        if (!PADROES.nomePessoa.regex.test(nome)) {
            return mostrarErro(`Nome inválido. ${PADROES.nomePessoa.mensagem}`);
        }

        if (!PADROES.login.regex.test(login)) {
            return mostrarErro(`Login inválido. ${PADROES.login.mensagem}`);
        }

        const usuarioAtualizado = await usuarioModel.atualizarUsuario(id, { nome, login });

        if (!usuarioAtualizado) {
            return enviarErro(req, res, STATUS.NAO_ENCONTRADO, 'Usuário não encontrado.');
        }

        avisar(req, 'ok', 'Dados do usuário atualizados.');
        return res.redirect(STATUS.VER_OUTRO, '/usuarios');
    } catch (erro) {
        if (erro.code === '23505') {
            return mostrarErro('Este login já está cadastrado.', STATUS.CONFLITO);
        }

        console.error('Erro ao atualizar usuário:', erro.message);
        return enviarErro(req, res, STATUS.ERRO_INTERNO, 'Erro ao atualizar usuário.');
    }
}

// Ativar ou desativar uma conta
async function alternarStatus(req, res) {
    try {
        const id = lerId(req);

        if (!id) {
            return enviarErro(req, res, STATUS.REQUISICAO_INVALIDA, 'ID de usuário inválido.');
        }

        // Impede que o administrador desative a própria conta.
        if (Number(req.session.usuario.id) === id) {
            avisar(req, 'erro', 'Você não pode alterar o status da sua própria conta.');
            return res.redirect(STATUS.VER_OUTRO, '/usuarios');
        }

        const usuarioAlvo = await usuarioModel.buscarPorId(id);

        if (!usuarioAlvo) {
            return enviarErro(req, res, STATUS.NAO_ENCONTRADO, 'Usuário não encontrado.');
        }

        await usuarioModel.definirAtivo(id, !usuarioAlvo.ativo);

        // Conta desativada perde os acessos abertos imediatamente
        if (usuarioAlvo.ativo) {
            await encerrarSessoesDoUsuario(id);
        }

        avisar(req, 'ok', `Usuário ${usuarioAlvo.ativo ? 'desativado' : 'ativado'}.`);
        return res.redirect(STATUS.VER_OUTRO, '/usuarios');
    } catch (erro) {
        console.error('Erro ao alterar status:', erro.message);
        return enviarErro(req, res, STATUS.ERRO_INTERNO, 'Erro ao alterar status do usuário.');
    }
}

// Exibir permissões de um usuário
async function mostrarPermissoes(req, res) {
    try {
        const id = lerId(req);

        if (!id) {
            return enviarErro(req, res, STATUS.REQUISICAO_INVALIDA, 'ID de usuário inválido.');
        }

        const usuarioAlvo = await usuarioModel.buscarPorId(id);

        if (!usuarioAlvo) {
            return enviarErro(req, res, STATUS.NAO_ENCONTRADO, 'Usuário não encontrado.');
        }

        const permissoes = await usuarioModel.listarPermissoes();
        const permissoesUsuario = await usuarioModel.listarPermissoesUsuario(id);
        const idsSelecionados = permissoesUsuario.map(permissao => permissao.id);

        return res.render('usuarios/permissoes', {
            usuario: req.session.usuario,
            usuarioAlvo,
            permissoes,
            idsSelecionados
        });
    } catch (erro) {
        console.error('Erro ao carregar permissões:', erro.message);
        return enviarErro(req, res, STATUS.ERRO_INTERNO, 'Erro ao carregar permissões.');
    }
}

// Salvar permissões de um usuário
async function salvarPermissoes(req, res) {
    try {
        const id = lerId(req);

        if (!id) {
            return enviarErro(req, res, STATUS.REQUISICAO_INVALIDA, 'ID de usuário inválido.');
        }

        const permissoesIds = req.body.permissoes || [];
        const lista = Array.isArray(permissoesIds) ? permissoesIds : [permissoesIds];

        await usuarioModel.salvarPermissoes(id, lista);

        avisar(req, 'ok', 'Permissões salvas.');
        return res.redirect(STATUS.VER_OUTRO, `/usuarios/${id}/permissoes`);
    } catch (erro) {
        console.error('Erro ao salvar permissões:', erro.message);

        if (erro.message === 'Usuário não encontrado.') {
            return enviarErro(req, res, STATUS.NAO_ENCONTRADO, erro.message);
        }

        return enviarErro(req, res, STATUS.ENTIDADE_INVALIDA,
            'Não foi possível salvar as permissões. Verifique os dados e tente novamente.');
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
