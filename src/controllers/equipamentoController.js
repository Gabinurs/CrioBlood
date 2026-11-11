const EquipamentoService = require('../services/equipamentoService');
const AuditoriaService = require('../services/auditoriaService');
const { ErroNegocio, avisar, tratar } = require('../utils/erros');

class EquipamentoController {
    static async listar(req, res) {
        try {
            const equipamentos = await EquipamentoService.listar();
            res.render('equipamentos/index', { equipamentos, usuario: req.session.usuario });
        } catch (erro) {
            tratar(req, res, erro, '/dashboard', 'Erro ao listar equipamentos');
        }
    }

    static formNovo(req, res) {
        res.render('equipamentos/form', {
            equipamento: null, valores: {}, tipos: EquipamentoService.TIPOS, usuario: req.session.usuario
        });
    }

    static async criar(req, res) {
        try {
            const id = await EquipamentoService.criar(req.body);
            await AuditoriaService.registrarLog(req.session.usuario.id, 'CADASTRO_EQUIPAMENTO', 'equipamentos', id, req.body.nome || '');
            avisar(req, 'ok', 'Equipamento cadastrado.');
            res.redirect('/equipamentos');
        } catch (erro) {
            if (erro instanceof ErroNegocio) {
                return res.status(400).render('equipamentos/form', {
                    equipamento: null, valores: req.body, erro: erro.message,
                    tipos: EquipamentoService.TIPOS, usuario: req.session.usuario
                });
            }
            tratar(req, res, erro, '/equipamentos', 'Erro ao cadastrar equipamento');
        }
    }

    static async formEditar(req, res) {
        try {
            const equipamento = await EquipamentoService.buscarPorId(req.params.id);
            if (!equipamento) {
                avisar(req, 'erro', 'Equipamento não encontrado.');
                return res.redirect('/equipamentos');
            }
            res.render('equipamentos/form', {
                equipamento, valores: {}, tipos: EquipamentoService.TIPOS, usuario: req.session.usuario
            });
        } catch (erro) {
            tratar(req, res, erro, '/equipamentos', 'Erro ao abrir equipamento');
        }
    }

    static async atualizar(req, res) {
        try {
            await EquipamentoService.atualizar(req.params.id, req.body);
            await AuditoriaService.registrarLog(req.session.usuario.id, 'EDICAO_EQUIPAMENTO', 'equipamentos', Number(req.params.id), '');
            avisar(req, 'ok', 'Equipamento atualizado.');
            res.redirect('/equipamentos');
        } catch (erro) {
            if (erro instanceof ErroNegocio) {
                const equipamento = await EquipamentoService.buscarPorId(req.params.id);
                return res.status(400).render('equipamentos/form', {
                    equipamento, valores: req.body, erro: erro.message,
                    tipos: EquipamentoService.TIPOS, usuario: req.session.usuario
                });
            }
            tratar(req, res, erro, '/equipamentos', 'Erro ao atualizar equipamento');
        }
    }
}

module.exports = EquipamentoController;
