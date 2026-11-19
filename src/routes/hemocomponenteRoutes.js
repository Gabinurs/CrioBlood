const express = require('express');
const router = express.Router();
const hemocomponenteController = require('../controllers/hemocomponenteController');
const { exigirAutenticacao, exigirPermissao } = require('../middlewares/autenticacao');
const { validarHemocomponente } = require('../middlewares/validacao');
const { apenasSupervisor } = require('../middlewares/autorizacao');

const STATUS = require('../utils/status');
const { enviarErro } = require('../utils/erros');
router.use(exigirAutenticacao);
router.use(exigirPermissao('bolsas.gerenciar'));

router.param('id', (req, res, next, valor) => {
    if (!/^\d+$/.test(valor)) return enviarErro(req, res, STATUS.REQUISICAO_INVALIDA, 'ID inválido.');
    next();
});

router.get('/', hemocomponenteController.index);
router.get('/novo', hemocomponenteController.renderizarCadastro);
router.post('/novo', validarHemocomponente, hemocomponenteController.salvarNovo);
router.get('/editar/:id', hemocomponenteController.renderizarEdicao);
router.post('/editar/:id', validarHemocomponente, hemocomponenteController.atualizar);

// Somente o Supervisor pode descartar
router.post('/descartar/:id', apenasSupervisor, hemocomponenteController.descartar);

module.exports = router;
