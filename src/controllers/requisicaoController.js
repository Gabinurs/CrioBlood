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
            for (const item of itens) {
                item.bolsas = item.status === 'PENDENTE'
                    ? await RequisicaoModel.listarBolsasDisponiveis({
                        ...item,
                        paciente_abo: requisicao.paciente_abo,
                        paciente_rh: requisicao.paciente_rh
                    })
                    : [];
            }
            const provas = await RequisicaoModel.listarProvas(requisicao.id);
            return res.render('solicitacoes/bolsas', {
                requisicao, itens, provas, usuario: req.session.usuario
            });
        } catch (erro) {
            tratar(req, res, erro, '/solicitacoes', 'Erro ao abrir Bolsas/Transfusão da requisição');
        }
    }

    static async registrarProva(req, res) {
        try {
            const resultado = await RequisicaoModel.registrarProva(
                Number(req.params.id), req.body, req.session.usuario.id
            );
            await AuditoriaModel.registrarLog(
                req.session.usuario.id,
                resultado.resultado === 'COMPATIVEL' ? 'PROVA_CRUZADA_COMPATIVEL' : 'PROVA_CRUZADA_INCOMPATIVEL',
                'provas_cruzadas',
                Number(resultado.id),
                'Bolsa ' + resultado.codigo + (resultado.reservada ? ' reservada para a requisição.' : ' registrada como incompatível; não reservada.')
            );
            if (resultado.reservada) {
                avisar(req, 'ok', 'Prova cruzada registrada como compatível. A bolsa foi vinculada e reservada. Imprima a etiqueta de identificação.');
            } else {
                avisar(req, 'aviso', 'Resultado incompatível registrado. A bolsa não foi reservada nem vinculada ao item.');
            }
            return res.redirect(STATUS.VER_OUTRO, '/solicitacoes/' + req.params.id + '/bolsas');
        } catch (erro) {
            tratar(req, res, erro, '/solicitacoes/' + req.params.id + '/bolsas', 'Erro ao registrar a prova cruzada');
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
