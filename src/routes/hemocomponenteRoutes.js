const express = require('express');
const router = express.Router();
const hemocomponenteController = require('../controllers/hemocomponenteController');
const { exigirAutenticacao, exigirPermissao } = require('../middlewares/autenticacao');
const { validarHemocomponente } = require('../middlewares/validacao');
const { apenasSupervisor } = require('../middlewares/autorizacao');
const STATUS = require('../utils/status');
const { enviarErro } = require('../utils/erros');

router.use(exigirAutenticacao);

router.param('id', (req, res, next, valor) => {
    if (!/^\d+$/.test(valor)) return enviarErro(req, res, STATUS.REQUISICAO_INVALIDA, 'ID inválido.');
    next();
});

router.get('/', exigirPermissao('bolsas.visualizar'), hemocomponenteController.index);
router.get('/novo', exigirPermissao('bolsas.cadastrar'), hemocomponenteController.renderizarCadastro);
router.post('/novo', exigirPermissao('bolsas.cadastrar'), validarHemocomponente, hemocomponenteController.salvarNovo);
router.get('/editar/:id', exigirPermissao('bolsas.editar'), hemocomponenteController.renderizarEdicao);
router.post('/editar/:id', exigirPermissao('bolsas.editar'), validarHemocomponente, hemocomponenteController.atualizar);

// O descarte exige permissão específica e continua sujeito à regra de supervisor.
router.post('/descartar/:id', exigirPermissao('bolsas.descartar'), apenasSupervisor, hemocomponenteController.descartar);

module.exports = router;
