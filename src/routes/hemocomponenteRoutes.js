const express = require('express');
const router = express.Router();
const hemocomponenteController = require('../controllers/hemocomponenteController');
const { exigirAutenticacao } = require('../middlewares/autenticacao');
const { validarHemocomponente } = require('../middlewares/validacao');
const { apenasSupervisor } = require('../middlewares/autorizacao');

router.use(exigirAutenticacao);

router.get('/', hemocomponenteController.index);
router.get('/novo', hemocomponenteController.renderizarCadastro);
router.post('/novo', validarHemocomponente, hemocomponenteController.salvarNovo);
router.get('/editar/:id', hemocomponenteController.renderizarEdicao);
router.post('/editar/:id', validarHemocomponente, hemocomponenteController.atualizar);

// Somente o Supervisor pode descartar
router.post('/descartar/:id', apenasSupervisor, hemocomponenteController.descartar);

module.exports = router;
