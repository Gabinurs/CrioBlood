const EquipamentoModel = require('../models/equipamentoModel');
const AuditoriaModel = require('../models/auditoriaModel');
const { ErroNegocio, avisar, tratar, enviarErro } = require('../utils/erros');

const STATUS = require('../utils/status');
class EquipamentoController {
    static async listar(req, res) {
        try {
            const equipamentos = await EquipamentoModel.listar();
            res.render('equipamentos/index', { equipamentos, usuario: req.session.usuario });
        } catch (erro) {
            tratar(req, res, erro, '/dashboard', 'Erro ao listar equipamentos');
        }
    }

    static formNovo(req, res) {
        res.render('equipamentos/form', {
            equipamento: null, valores: {}, tipos: EquipamentoModel.TIPOS, usuario: req.session.usuario
        });
    }

    static async criar(req, res) {
        try {
            const id = await EquipamentoModel.criar(req.body);
            await AuditoriaModel.registrarLog(req.session.usuario.id, 'CADASTRO_EQUIPAMENTO', 'equipamentos', id, req.body.nome || '');
            avisar(req, 'ok', 'Equipamento cadastrado.');
            res.redirect(STATUS.VER_OUTRO, '/equipamentos');
        } catch (erro) {
            if (erro instanceof ErroNegocio) {
                return res.status(erro.statusCode || STATUS.ENTIDADE_INVALIDA).render('equipamentos/form', {
                    equipamento: null, valores: req.body, erro: erro.message,
                    tipos: EquipamentoModel.TIPOS, usuario: req.session.usuario
                });
            }
            tratar(req, res, erro, '/equipamentos', 'Erro ao cadastrar equipamento');
        }
    }

    static async formEditar(req, res) {
        try {
            const equipamento = await EquipamentoModel.buscarPorId(req.params.id);
            if (!equipamento) {
                return enviarErro(req, res, STATUS.NAO_ENCONTRADO, 'Equipamento não encontrado.');
            }
            res.render('equipamentos/form', {
                equipamento, valores: {}, tipos: EquipamentoModel.TIPOS, usuario: req.session.usuario
            });
        } catch (erro) {
            tratar(req, res, erro, '/equipamentos', 'Erro ao abrir equipamento');
        }
    }

    static async atualizar(req, res) {
        try {
            await EquipamentoModel.atualizar(req.params.id, req.body);
            await AuditoriaModel.registrarLog(req.session.usuario.id, 'EDICAO_EQUIPAMENTO', 'equipamentos', Number(req.params.id), '');
            avisar(req, 'ok', 'Equipamento atualizado.');
            res.redirect(STATUS.VER_OUTRO, '/equipamentos');
        } catch (erro) {
            if (erro instanceof ErroNegocio) {
                const equipamento = await EquipamentoModel.buscarPorId(req.params.id);
                return res.status(erro.statusCode || STATUS.ENTIDADE_INVALIDA).render('equipamentos/form', {
                    equipamento, valores: req.body, erro: erro.message,
                    tipos: EquipamentoModel.TIPOS, usuario: req.session.usuario
                });
            }
            tratar(req, res, erro, '/equipamentos', 'Erro ao atualizar equipamento');
        }
    }
}

module.exports = EquipamentoController;
