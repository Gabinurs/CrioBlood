
const express = require('express');
const router = express.Router();

const loteController = require('../controllers/loteController');

const {
    exigirAutenticacao,
    exigirPermissao
} = require('../middlewares/autenticacao');

// Exige login e permissão somente nas rotas de lotes.
router.use('/lotes', exigirAutenticacao, exigirPermissao('lotes.gerenciar'));

router.param('id', (req, res, next, valor) => {
    if (!/^\d+$/.test(valor)) return res.status(400).send('ID inválido.');
    next();
});

// Exibe a lista de lotes.
router.get('/lotes', loteController.listar);

// Abre um novo lote de recebimento.
router.post('/lotes', loteController.abrir);

// Fecha um lote de recebimento.
router.post('/lotes/:id/fechar', loteController.fechar);

module.exports = router;
