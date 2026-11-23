const RequisicaoModel = require('../models/requisicaoModel');
const AuditoriaModel = require('../models/auditoriaModel');
const { ErroNegocio, avisar, tratar, enviarErro } = require('../utils/erros');
const STATUS = require('../utils/status');

function dataHoraAtualLocal() {
    const partes = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Sao_Paulo',
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(new Date());
    const valores = Object.fromEntries(partes.map(p => [p.type, p.value]));
    return valores.year + '-' + valores.month + '-' + valores.day + 'T' + valores.hour + ':' + valores.minute;
}

class RequisicaoController {
    static async formNova(req, res) {
        try {
            const pacientes = await RequisicaoModel.listarReceptoresLiberados();
            const pacienteId = /^\d+$/.test(String(req.query.paciente_id || ''))
                ? Number(req.query.paciente_id) : null;
            const contextoInicial = pacienteId
                ? await RequisicaoModel.buscarContextoPaciente(pacienteId)
                : null;
            return res.render('solicitacoes/form', {
                pacientes,
                contextoInicial,
                usuario: req.session.usuario,
                valores: {
                    paciente_id: pacienteId || '',
                    data_hora_requisicao: dataHoraAtualLocal(),
                    medico_solicitante: '',
                    itens_json: '[]'
                }
            });
        } catch (erro) {
            tratar(req, res, erro, '/solicitacoes', 'Erro ao abrir a requisição transfusional');
        }
    }

    static async contextoPaciente(req, res) {
        try {
            const contexto = await RequisicaoModel.buscarContextoPaciente(Number(req.params.id));
            if (!contexto) return res.status(STATUS.NAO_ENCONTRADO).json({ erro: 'Receptor não encontrado.' });
            return res.status(STATUS.OK).json(contexto);
        } catch (erro) {
            console.error('Erro ao consultar amostra do receptor:', erro);
            return res.status(STATUS.ERRO_INTERNO).json({ erro: 'Não foi possível carregar os dados do receptor.' });
        }
    }

    static async criar(req, res) {
        try {
            const id = await RequisicaoModel.criar(req.body, req.session.usuario.id);
            await AuditoriaModel.registrarLog(
                req.session.usuario.id, 'NOVA_REQUISICAO_TRANSFUSIONAL',
                'requisicoes_transfusionais', Number(id),
                'Requisição criada com itens/quantidades e dados complementares.'
            );
            avisar(req, 'ok', 'Requisição registrada. Agora inclua e registre a prova cruzada das bolsas.');
            return res.redirect(STATUS.VER_OUTRO, '/solicitacoes/' + id + '/bolsas');
        } catch (erro) {
            if (erro instanceof ErroNegocio) {
                try {
                    const pacientes = await RequisicaoModel.listarReceptoresLiberados();
                    const pacienteId = /^\d+$/.test(String(req.body.paciente_id || ''))
                        ? Number(req.body.paciente_id) : null;
                    const contextoInicial = pacienteId
                        ? await RequisicaoModel.buscarContextoPaciente(pacienteId)
                        : null;
                    return res.status(erro.statusCode || STATUS.ENTIDADE_INVALIDA).render('solicitacoes/form', {
                        pacientes, contextoInicial, valores: req.body, erro: erro.message,
                        usuario: req.session.usuario
                    });
                } catch (erroRender) {
                    return tratar(req, res, erroRender, '/solicitacoes/nova', 'Erro ao recuperar os dados da requisição');
                }
            }
            tratar(req, res, erro, '/solicitacoes/nova', 'Erro ao registrar a requisição transfusional');
        }
    }

    static async bolsas(req, res) {
        try {
            const requisicao = await RequisicaoModel.buscarPorId(Number(req.params.id));
            if (!requisicao) return enviarErro(req, res, STATUS.NAO_ENCONTRADO, 'Requisição transfusional não encontrada.');
            const itens = await RequisicaoModel.listarItens(requisicao.id);
            const provas = await RequisicaoModel.listarProvas(requisicao.id);
            return res.render('solicitacoes/bolsas', {
                requisicao, itens, provas, usuario: req.session.usuario
            });
        } catch (erro) {
            tratar(req, res, erro, '/solicitacoes', 'Erro ao abrir Bolsas/Transfusão da requisição');
        }
    }


    static async verificarBolsa(req, res) {
        try {
            const resultado = await RequisicaoModel.verificarBolsa(
                Number(req.params.id), Number(req.params.solicitacaoId), req.query.codigo
            );
            return res.status(STATUS.OK).json(resultado);
        } catch (erro) {
            if (erro instanceof ErroNegocio) {
                return res.status(erro.statusCode || STATUS.ENTIDADE_INVALIDA).json({ erro: erro.message });
            }
            console.error('Erro ao verificar código da bolsa:', erro);
            return res.status(STATUS.ERRO_INTERNO).json({ erro: 'Não foi possível verificar a bolsa informada.' });
        }
    }
    static async registrarProva(req, res) {
        try {
            const resultado = await RequisicaoModel.registrarProva(
                Number(req.params.id), req.body, req.session.usuario.id
            );
            const ehProvaCruzada = resultado.tipoVerificacao === 'PROVA_CRUZADA';
            const evento = resultado.resultado === 'COMPATIVEL'
                ? (ehProvaCruzada ? 'PROVA_CRUZADA_COMPATIVEL' : 'CONFERENCIA_COMPATIBILIDADE_COMPATIVEL')
                : (ehProvaCruzada ? 'PROVA_CRUZADA_INCOMPATIVEL' : 'CONFERENCIA_COMPATIBILIDADE_INCOMPATIVEL');
            const detalheExcecao = resultado.excecaoRhd
                ? ' Exceção RhD autorizada por ' + resultado.autorizadorNome + '.'
                : '';
            await AuditoriaModel.registrarLog(
                req.session.usuario.id,
                evento,
                'provas_cruzadas',
                Number(resultado.id),
                'Bolsa ' + resultado.codigo +
                    (resultado.reservada ? ' vinculada e reservada.' : ' registrada como não compatível; não reservada.') +
                    detalheExcecao
            );
            if (resultado.reservada) {
                avisar(req, 'ok', (ehProvaCruzada
                    ? 'Prova cruzada compatível registrada.'
                    : 'Conferência do componente registrada como compatível.') +
                    ' A bolsa foi vinculada e reservada. Imprima a etiqueta.');
            } else {
                avisar(req, 'aviso', (ehProvaCruzada
                    ? 'Resultado incompatível da prova cruzada registrado.'
                    : 'Conferência registrada como incompatível.') +
                    ' A bolsa não foi reservada nem vinculada ao receptor.');
            }
            return res.redirect(STATUS.VER_OUTRO, '/solicitacoes/' + req.params.id + '/bolsas');
        } catch (erro) {
            tratar(req, res, erro, '/solicitacoes/' + req.params.id + '/bolsas', 'Erro ao registrar a prova ou conferência da bolsa');
        }
    }

    static async etiqueta(req, res) {
        try {
            const prova = await RequisicaoModel.buscarEtiqueta(Number(req.params.provaId));
            if (!prova) return enviarErro(req, res, STATUS.NAO_ENCONTRADO, 'Etiqueta disponível somente para uma prova cruzada registrada como compatível.');
            return res.render('solicitacoes/etiqueta-prova', {
                prova, modal: req.query.modal === '1', usuario: req.session.usuario
            });
        } catch (erro) {
            tratar(req, res, erro, '/solicitacoes', 'Erro ao abrir a etiqueta da prova cruzada');
        }
    }
}

module.exports = RequisicaoController;
