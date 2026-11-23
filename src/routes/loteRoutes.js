
const express = require('express');
const router = express.Router();

const loteController = require('../controllers/loteController');

const STATUS = require('../utils/status');
const { enviarErro } = require('../utils/erros');
const {
    exigirAutenticacao,
    exigirPermissao
} = require('../middlewares/autenticacao');

// Exige login e permissão somente nas rotas de lotes.
router.use('/lotes', exigirAutenticacao, exigirPermissao('lotes.gerenciar'));

router.param('id', (req, res, next, valor) => {
    if (!/^\d+$/.test(valor)) return enviarErro(req, res, STATUS.REQUISICAO_INVALIDA, 'ID inválido.');
    next();
});

// Exibe a lista de lotes.
router.get('/lotes', loteController.listar);

// Abre um novo lote de recebimento.
router.post('/lotes', loteController.abrir);

// Consulta e imprime/salva em PDF o comprovante das bolsas recebidas no lote.
router.get('/lotes/:id/relatorio', loteController.relatorio);

// Fecha um lote de recebimento.
router.post('/lotes/:id/fechar', loteController.fechar);

module.exports = router;
