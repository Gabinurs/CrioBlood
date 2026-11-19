// Conta do próprio usuário logado
const express = require('express');
const router = express.Router();

const senhaController = require('../controllers/senhaController');
const { exigirAutenticacao } = require('../middlewares/autenticacao');

router.use('/conta', exigirAutenticacao);

router.get('/conta/senha', senhaController.mostrarTroca);
router.post('/conta/senha', senhaController.trocar);

module.exports = router;
