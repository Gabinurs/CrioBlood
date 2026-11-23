// Rotas dos módulos: pacientes, estoque, solicitações, compatibilidade, transfusão e relatórios
const express = require('express');
const router = express.Router();

const { exigirAutenticacao, exigirPermissao: permissao } = require('../middlewares/autenticacao');
const Paciente = require('../controllers/pacienteController');
const Amostra = require('../controllers/amostraController');
const Solicitacao = require('../controllers/solicitacaoController');
const Compatibilidade = require('../controllers/compatibilidadeController');
const Transfusao = require('../controllers/transfusaoController');
const EstoquePagina = require('../controllers/estoquePaginaController');
const Equipamento = require('../controllers/equipamentoController');
const Relatorio = require('../controllers/relatorioController');

const STATUS = require('../utils/status');
const { enviarErro } = require('../utils/erros');
// Todas as rotas abaixo exigem login
router.use(['/pacientes', '/estoque', '/equipamentos', '/solicitacoes', '/compatibilidade', '/transfusoes', '/relatorios'],
    exigirAutenticacao);

// IDs da URL precisam ser numéricos
router.param('id', (req, res, next, valor) => {
    if (!/^\d+$/.test(valor)) return enviarErro(req, res, STATUS.REQUISICAO_INVALIDA, 'ID inválido.');
    next();
});

router.param('amostraId', (req, res, next, valor) => {
    if (!/^\d+$/.test(valor)) return enviarErro(req, res, STATUS.REQUISICAO_INVALIDA, 'ID de amostra inválido.');
    next();
});

// Pacientes
const pacientes = permissao('pacientes.gerenciar');
router.get('/pacientes', pacientes, Paciente.listar);
router.get('/pacientes/buscar', pacientes, Paciente.buscar);
router.get('/pacientes/novo', pacientes, Paciente.formNovo);
router.post('/pacientes/novo', pacientes, Paciente.criar);
router.get('/pacientes/:id/dossie', pacientes, Amostra.dossie);
router.get('/pacientes/:id/amostras/nova', pacientes, Amostra.nova);
router.post('/pacientes/:id/amostras', pacientes, Amostra.criar);
router.get('/pacientes/:id/amostras/:amostraId/imuno', pacientes, Amostra.imuno);
router.post('/pacientes/:id/amostras/:amostraId/imuno', pacientes, Amostra.salvarImuno);
router.get('/pacientes/:id/amostras/:amostraId/etiqueta', pacientes, Amostra.etiqueta);
router.get('/pacientes/:id/editar', pacientes, Paciente.formEditar);
router.post('/pacientes/:id/editar', pacientes, Paciente.atualizar);

// Bolsas (estoque): consultar x alterar a localização
router.get('/estoque', permissao('estoque.visualizar'), EstoquePagina.index);
router.get('/estoque/:id/localizacao', permissao('estoque.gerenciar'), EstoquePagina.formLocalizacao);
router.post('/estoque/:id/localizacao', permissao('estoque.gerenciar'), EstoquePagina.salvarLocalizacao);
router.post('/estoque/:id/localizacao/remover', permissao('estoque.gerenciar'), EstoquePagina.removerLocalizacao);

// Equipamentos (freezers, geladeiras...)
const equipamentos = permissao('estoque.gerenciar');
router.get('/equipamentos', equipamentos, Equipamento.listar);
router.get('/equipamentos/novo', equipamentos, Equipamento.formNovo);
router.post('/equipamentos/novo', equipamentos, Equipamento.criar);
router.get('/equipamentos/:id/editar', equipamentos, Equipamento.formEditar);
router.post('/equipamentos/:id/editar', equipamentos, Equipamento.atualizar);

// Solicitações transfusionais
const solicitacoes = permissao('solicitacoes.gerenciar');
router.get('/solicitacoes', solicitacoes, Solicitacao.listar);
router.get('/solicitacoes/nova', solicitacoes, Solicitacao.formNova);
router.post('/solicitacoes/nova', solicitacoes, Solicitacao.criar);
router.post('/solicitacoes/:id/cancelar', solicitacoes, Solicitacao.cancelar);

// Compatibilidade e reserva de bolsa
const compatibilidade = permissao('compatibilidade.reservar');
router.get('/compatibilidade', compatibilidade, Compatibilidade.index);
router.post('/compatibilidade/reservar', compatibilidade, Compatibilidade.reservar);

// Transfusão
const transfusoes = permissao('transfusoes.registrar');
router.get('/transfusoes', transfusoes, Transfusao.index);
router.post('/transfusoes/registrar', transfusoes, Transfusao.registrar);

// Relatórios
const relatorios = permissao('relatorios.visualizar');
router.get('/relatorios', relatorios, Relatorio.index);
router.get('/relatorios/transfusoes.csv', relatorios, Relatorio.csv);

module.exports = router;
