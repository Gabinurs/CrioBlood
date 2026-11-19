
const express = require('express');
const router = express.Router();

const usuarioController = require('../controllers/usuarioController');
const senhaController = require('../controllers/senhaController');

const STATUS = require('../utils/status');
const { enviarErro } = require('../utils/erros');
const {
    exigirAutenticacao,
    exigirAdministrador
} = require('../middlewares/autenticacao');

// Todas as rotas de /usuarios exigem login e perfil de administrador.
// (O filtro precisa ficar restrito a /usuarios; sem o caminho ele barraria
// todas as demais telas do sistema para quem não é administrador.)
router.use('/usuarios', exigirAutenticacao, exigirAdministrador);

router.param('id', (req, res, next, valor) => {
    if (!/^\d+$/.test(valor)) return enviarErro(req, res, STATUS.REQUISICAO_INVALIDA, 'ID de usuário inválido.');
    next();
});

// Listar usuários
router.get('/usuarios', usuarioController.listar);

// Abrir formulário de cadastro
router.get('/usuarios/novo', usuarioController.mostrarCadastro);

// Cadastrar usuário
router.post('/usuarios', usuarioController.cadastrar);

// Abrir formulário de edição
router.get('/usuarios/:id/editar', usuarioController.mostrarEdicao);

// Salvar alterações do usuário
router.post('/usuarios/:id/editar', usuarioController.atualizar);

// Ativar ou desativar usuário
router.post('/usuarios/:id/status', usuarioController.alternarStatus);

// Redefinir a senha de um usuário
router.get('/usuarios/:id/senha', senhaController.mostrarRedefinicao);
router.post('/usuarios/:id/senha', senhaController.redefinir);

// Abrir tela de permissões
router.get('/usuarios/:id/permissoes', usuarioController.mostrarPermissoes);

// Salvar permissões
router.post('/usuarios/:id/permissoes', usuarioController.salvarPermissoes);

module.exports = router;
