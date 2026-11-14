// Rotas dos módulos: pacientes, estoque, solicitações, compatibilidade, transfusão e relatórios
const express = require('express');
const router = express.Router();

const { exigirAutenticacao } = require('../middlewares/autenticacao');
const Paciente = require('../controllers/pacienteController');
const AmostraReceptor = require('../controllers/amostraReceptorController');
const Solicitacao = require('../controllers/solicitacaoController');
const Compatibilidade = require('../controllers/compatibilidadeController');
const Transfusao = require('../controllers/transfusaoController');
const EstoquePagina = require('../controllers/estoquePaginaController');
const Equipamento = require('../controllers/equipamentoController');
const Relatorio = require('../controllers/relatorioController');

// Todas as rotas abaixo exigem login
router.use(['/pacientes', '/estoque', '/equipamentos', '/solicitacoes', '/compatibilidade', '/transfusoes', '/relatorios'],
    exigirAutenticacao);

// Pacientes
router.get('/pacientes', Paciente.listar);
router.get('/pacientes/novo', Paciente.formNovo);
router.post('/pacientes/novo', Paciente.criar);
router.get('/pacientes/:id/dossie', AmostraReceptor.dossie);
router.get('/pacientes/:id/amostras/nova', AmostraReceptor.nova);
router.post('/pacientes/:id/amostras', AmostraReceptor.criar);
router.get('/pacientes/:id/editar', Paciente.formEditar);
router.post('/pacientes/:id/editar', Paciente.atualizar);

// Bolsas (estoque)
router.get('/estoque', EstoquePagina.index);
router.get('/estoque/:id/localizacao', EstoquePagina.formLocalizacao);
router.post('/estoque/:id/localizacao', EstoquePagina.salvarLocalizacao);
router.post('/estoque/:id/localizacao/remover', EstoquePagina.removerLocalizacao);

// Equipamentos (freezers, geladeiras...)
router.get('/equipamentos', Equipamento.listar);
router.get('/equipamentos/novo', Equipamento.formNovo);
router.post('/equipamentos/novo', Equipamento.criar);
router.get('/equipamentos/:id/editar', Equipamento.formEditar);
router.post('/equipamentos/:id/editar', Equipamento.atualizar);

// Solicitações transfusionais
router.get('/solicitacoes', Solicitacao.listar);
router.get('/solicitacoes/nova', Solicitacao.formNova);
router.post('/solicitacoes/nova', Solicitacao.criar);
router.post('/solicitacoes/:id/cancelar', Solicitacao.cancelar);

// Compatibilidade e reserva de bolsa
router.get('/compatibilidade', Compatibilidade.index);
router.post('/compatibilidade/reservar', Compatibilidade.reservar);

// Transfusão
router.get('/transfusoes', Transfusao.index);
router.post('/transfusoes/registrar', Transfusao.registrar);

// Relatórios
router.get('/relatorios', Relatorio.index);
router.get('/relatorios/transfusoes.csv', Relatorio.csv);

module.exports = router;
