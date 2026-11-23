
const express = require('express');
const router = express.Router();

const loteController = require('../controllers/loteController');

const STATUS = require('../utils/status');
const { enviarErro } = require('../utils/erros');
const {
    exigirAutenticacao,
    exigirPermissao
} = require('../middlewares/autenticacao');

// O módulo é visível a quem gerencia lotes OU bolsas. Ações de abrir/fechar
// continuam restritas a lotes.gerenciar; os cadastros de bolsas seguem sua permissão própria.
router.use('/lotes', exigirAutenticacao);

function exigirAcessoRecebimento(req, res, next) {
    const usuario = req.session.usuario;
    const permissoes = req.permissoes || new Set();
    if (usuario && (usuario.administrador ||
        permissoes.has('lotes.gerenciar') || permissoes.has('bolsas.gerenciar'))) {
        return next();
    }
    return enviarErro(req, res, STATUS.PROIBIDO, 'Você não tem permissão para acessar o recebimento de bolsas.');
}

router.param('id', (req, res, next, valor) => {
    if (!/^\d+$/.test(valor)) return enviarErro(req, res, STATUS.REQUISICAO_INVALIDA, 'ID inválido.');
    next();
});

// Exibe a lista de lotes.
router.get('/lotes', exigirAcessoRecebimento, loteController.listar);

// Abre um novo lote de recebimento.
router.post('/lotes', exigirPermissao('lotes.gerenciar'), loteController.abrir);

// Consulta e imprime/salva em PDF o comprovante das bolsas recebidas no lote.
router.get('/lotes/:id/relatorio', exigirAcessoRecebimento, loteController.relatorio);

// Fecha um lote de recebimento.
router.post('/lotes/:id/fechar', exigirPermissao('lotes.gerenciar'), loteController.fechar);

module.exports = router;
