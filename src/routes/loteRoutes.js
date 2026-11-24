const express = require('express');
const router = express.Router();

const loteController = require('../controllers/loteController');
const STATUS = require('../utils/status');
const { enviarErro } = require('../utils/erros');
const { exigirAutenticacao, exigirPermissao } = require('../middlewares/autenticacao');

router.use('/lotes', exigirAutenticacao);

router.param('id', (req, res, next, valor) => {
    if (!/^\d+$/.test(valor)) return enviarErro(req, res, STATUS.REQUISICAO_INVALIDA, 'ID inválido.');
    next();
});

router.get('/lotes', exigirPermissao('lotes.visualizar'), loteController.listar);
router.post('/lotes', exigirPermissao('lotes.abrir'), loteController.abrir);
router.get('/lotes/:id/relatorio', exigirPermissao('lotes.relatorio'), loteController.relatorio);
router.post('/lotes/:id/fechar', exigirPermissao('lotes.fechar'), loteController.fechar);

module.exports = router;
