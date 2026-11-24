// Rotas dos módulos com autorização granular por ação.
const express = require('express');
const router = express.Router();

const { exigirAutenticacao, exigirPermissao: p } = require('../middlewares/autenticacao');
const Paciente = require('../controllers/pacienteController');
const Amostra = require('../controllers/amostraController');
const Solicitacao = require('../controllers/solicitacaoController');
const Requisicao = require('../controllers/requisicaoController');
const Compatibilidade = require('../controllers/compatibilidadeController');
const Transfusao = require('../controllers/transfusaoController');
const EstoquePagina = require('../controllers/estoquePaginaController');
const Equipamento = require('../controllers/equipamentoController');
const Relatorio = require('../controllers/relatorioController');
const STATUS = require('../utils/status');
const { enviarErro } = require('../utils/erros');

router.use(['/pacientes', '/estoque', '/equipamentos', '/solicitacoes', '/compatibilidade', '/transfusoes', '/relatorios'], exigirAutenticacao);

router.param('id', (req, res, next, valor) => {
    if (!/^\d+$/.test(valor)) return enviarErro(req, res, STATUS.REQUISICAO_INVALIDA, 'ID inválido.');
    next();
});
router.param('amostraId', (req, res, next, valor) => {
    if (!/^\d+$/.test(valor)) return enviarErro(req, res, STATUS.REQUISICAO_INVALIDA, 'ID de amostra inválido.');
    next();
});
router.param('provaId', (req, res, next, valor) => {
    if (!/^\d+$/.test(valor)) return enviarErro(req, res, STATUS.REQUISICAO_INVALIDA, 'ID de prova cruzada inválido.');
    next();
});
router.param('solicitacaoId', (req, res, next, valor) => {
    if (!/^\d+$/.test(valor)) return enviarErro(req, res, STATUS.REQUISICAO_INVALIDA, 'ID de unidade solicitado inválido.');
    next();
});

// Receptores / pacientes
router.get('/pacientes', p('pacientes.visualizar'), Paciente.listar);
router.get('/pacientes/buscar', p('pacientes.visualizar'), Paciente.buscar);
router.get('/pacientes/novo', p('pacientes.cadastrar'), Paciente.formNovo);
router.post('/pacientes/novo', p('pacientes.cadastrar'), Paciente.criar);
router.get('/pacientes/:id/dossie', p('pacientes.visualizar'), Amostra.dossie);
router.get('/pacientes/:id/amostras/nova', p('amostras.cadastrar'), Amostra.nova);
router.post('/pacientes/:id/amostras', p('amostras.cadastrar'), Amostra.criar);
router.get('/pacientes/:id/amostras/:amostraId/imuno', p('amostras.editar'), Amostra.imuno);
router.post('/pacientes/:id/amostras/:amostraId/imuno', p('amostras.editar'), Amostra.salvarImuno);
router.get('/pacientes/:id/amostras/:amostraId/etiqueta', p('amostras.visualizar'), Amostra.etiqueta);
router.get('/pacientes/:id/editar', p('pacientes.editar'), Paciente.formEditar);
router.post('/pacientes/:id/editar', p('pacientes.editar'), Paciente.atualizar);

// Estoque e localização
router.get('/estoque', p('estoque.visualizar'), EstoquePagina.index);
router.get('/estoque/:id/localizacao', p('estoque.localizacao.editar'), EstoquePagina.formLocalizacao);
router.post('/estoque/:id/localizacao', p('estoque.localizacao.editar'), EstoquePagina.salvarLocalizacao);
router.post('/estoque/:id/localizacao/remover', p('estoque.localizacao.editar'), EstoquePagina.removerLocalizacao);

// Equipamentos
router.get('/equipamentos', p('equipamentos.visualizar'), Equipamento.listar);
router.get('/equipamentos/novo', p('equipamentos.cadastrar'), Equipamento.formNovo);
router.post('/equipamentos/novo', p('equipamentos.cadastrar'), Equipamento.criar);
router.get('/equipamentos/:id/editar', p('equipamentos.editar'), Equipamento.formEditar);
router.post('/equipamentos/:id/editar', p('equipamentos.editar'), Equipamento.atualizar);

// Solicitações transfusionais e etapas de associação/verificação de bolsas
router.get('/solicitacoes', p('solicitacoes.visualizar'), Solicitacao.listar);
router.get('/solicitacoes/pacientes/:id/contexto', p('solicitacoes.cadastrar'), Requisicao.contextoPaciente);
router.get('/solicitacoes/nova', p('solicitacoes.cadastrar'), Requisicao.formNova);
router.post('/solicitacoes/nova', p('solicitacoes.cadastrar'), Requisicao.criar);
router.get('/solicitacoes/provas-cruzadas/:provaId/etiqueta', p('solicitacoes.visualizar'), Requisicao.etiqueta);
router.get('/solicitacoes/:id/itens/:solicitacaoId/verificar-bolsa', p('solicitacoes.editar'), Requisicao.verificarBolsa);
router.post('/solicitacoes/:id/itens/:solicitacaoId/remover-bolsa', p('solicitacoes.editar'), Requisicao.removerBolsa);
router.get('/solicitacoes/:id/bolsas', p('solicitacoes.visualizar'), Requisicao.bolsas);
router.post('/solicitacoes/:id/provas-cruzadas', p('solicitacoes.editar'), Requisicao.registrarProva);
router.post('/solicitacoes/:id/cancelar', p('solicitacoes.editar'), Solicitacao.cancelar);

// Compatibilidade
router.get('/compatibilidade', p('compatibilidade.visualizar'), Compatibilidade.index);
router.post('/compatibilidade/reservar', p('compatibilidade.reservar'), Compatibilidade.reservar);

// Transfusões
router.get('/transfusoes', p('transfusoes.visualizar'), Transfusao.index);
router.post('/transfusoes/registrar', p('transfusoes.registrar'), Transfusao.registrar);

// Relatórios
router.get('/relatorios', p('relatorios.visualizar'), Relatorio.index);
router.get('/relatorios/transfusoes.csv', p('relatorios.exportar'), Relatorio.csv);

module.exports = router;
