const HemocomponenteModel = require('../models/hemocomponenteModel');
const AuditoriaModel = require('../models/auditoriaModel');
const { paginar } = require('../utils/paginacao');
const { ErroNegocio, enviarErro } = require('../utils/erros');
const STATUS = require('../utils/status');

// Compara a bolsa antes e depois da edição e descreve o que mudou (para a auditoria)
function descreverMudancas(antes, depois) {
    const campos = [
        ['tipo', 'tipo'], ['abo', 'ABO'], ['fator_rh', 'Rh'],
        ['data_validade_iso', 'validade'], ['status', 'status']
    ];
    return campos
        .filter(([chave]) => (antes[chave] || '') !== (depois[chave] || ''))
        .map(([chave, rotulo]) => `${rotulo}: ${antes[chave] || '—'} → ${depois[chave] || '—'}`)
        .join('; ');
}

// Erros esperados (validação, conflito...) saem com a mensagem e o status certos; o resto vira 500
function responderErro(req, res, erro, mensagemPadrao) {
    if (erro instanceof ErroNegocio) {
        return enviarErro(req, res, erro.statusCode, erro.message);
    }

    console.error(`${mensagemPadrao}:`, erro);
    return enviarErro(req, res, STATUS.ERRO_INTERNO, mensagemPadrao);
}

class HemocomponenteController {
    // Lista de hemocomponentes
    static async index(req, res) {
        try {
            const { lote_id, status } = req.query;
            const filtros = { lote_id, status };
            const { linhas: hemocomponentes, paginacao } = await paginar(
                req,
                () => HemocomponenteModel.contarTodos(filtros),
                (pag) => HemocomponenteModel.listarTodos(filtros, pag));

            res.render('hemocomponentes/index', {
                hemocomponentes,
                paginacao,
                usuario: req.session.usuario,
                title: 'Gestão de Hemocomponentes'
            });
        } catch (erro) {
            responderErro(req, res, erro, 'Erro interno do servidor ao carregar hemocomponentes.');
        }
    }

    // Formulário de cadastro
    static async renderizarCadastro(req, res) {
        try {
            const lotes = await HemocomponenteModel.listarLotesAbertos();
            res.render('hemocomponentes/cadastro', {
                lote_id: req.query.lote_id || '',
                lotes,
                usuario: req.session.usuario,
                title: 'Cadastrar Hemocomponente'
            });
        } catch (erro) {
            responderErro(req, res, erro, 'Erro ao abrir o formulário de cadastro.');
        }
    }

    // Salva um novo hemocomponente
    static async salvarNovo(req, res) {
        try {
            const id = await HemocomponenteModel.criar(req.body, req.session.usuario.id);
            await AuditoriaModel.registrarLog(
                req.session.usuario.id, 'CADASTRO_BOLSA', 'hemocomponentes', id, req.body.codigo_original);
            res.redirect(STATUS.VER_OUTRO, `/lotes/${req.body.lote_id}/relatorio`);
        } catch (erro) {
            responderErro(req, res, erro, 'Erro ao salvar os dados.');
        }
    }

    // Tela de edição
    static async renderizarEdicao(req, res) {
        try {
            const { id } = req.params;
            const hemocomponente = await HemocomponenteModel.buscarPorId(id);

            if (!hemocomponente) {
                return enviarErro(req, res, STATUS.NAO_ENCONTRADO, 'Hemocomponente não encontrado.');
            }

            res.render('hemocomponentes/editar', {
                hemocomponente,
                usuario: req.session.usuario,
                title: 'Editar Hemocomponente'
            });
        } catch (erro) {
            responderErro(req, res, erro, 'Erro ao carregar os dados para edição.');
        }
    }

    // Atualiza os dados
    static async atualizar(req, res) {
        try {
            const { id } = req.params;
            const antes = await HemocomponenteModel.buscarPorId(id);
            if (!antes) return enviarErro(req, res, STATUS.NAO_ENCONTRADO, 'Hemocomponente não encontrado.');

            await HemocomponenteModel.atualizar(id, req.body);

            const depois = await HemocomponenteModel.buscarPorId(id);
            await AuditoriaModel.registrarLog(
                req.session.usuario.id, 'EDICAO_BOLSA', 'hemocomponentes', Number(id),
                `${antes.codigo_original}. ${descreverMudancas(antes, depois) || 'Sem mudança nos campos principais.'}`);
            res.redirect(STATUS.VER_OUTRO, '/hemocomponentes');
        } catch (erro) {
            responderErro(req, res, erro, 'Erro ao atualizar os dados.');
        }
    }

    // Descarte lógico
    static async descartar(req, res) {
        try {
            const { id } = req.params;
            const encontrada = await HemocomponenteModel.deletar(id);
            if (!encontrada) return enviarErro(req, res, STATUS.NAO_ENCONTRADO, 'Hemocomponente não encontrado.');

            await AuditoriaModel.registrarLog(
                req.session.usuario.id, 'DESCARTE_BOLSA', 'hemocomponentes', Number(id), '');
            res.redirect(STATUS.VER_OUTRO, '/hemocomponentes');
        } catch (erro) {
            responderErro(req, res, erro, 'Erro ao descartar o item.');
        }
    }
}

module.exports = HemocomponenteController;
