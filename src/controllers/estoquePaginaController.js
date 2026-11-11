const EstoqueConsultaService = require('../services/estoqueConsultaService');
const EquipamentoService = require('../services/equipamentoService');
const AuditoriaService = require('../services/auditoriaService');
const { ErroNegocio, avisar, tratar } = require('../utils/erros');

class EstoquePaginaController {
    static async index(req, res) {
        try {
            const [resumo, matriz, bolsas] = await Promise.all([
                EstoqueConsultaService.resumo(),
                EstoqueConsultaService.matriz(),
                EstoqueConsultaService.listarBolsas()
            ]);
            res.render('estoque/index', {
                resumo, matriz, bolsas, tipos: EstoqueConsultaService.TIPOS, usuario: req.session.usuario
            });
        } catch (erro) {
            tratar(req, res, erro, '/dashboard', 'Erro ao carregar o estoque');
        }
    }

    static async formLocalizacao(req, res) {
        try {
            const id = parseInt(req.params.id, 10);
            const bolsa = await EstoqueConsultaService.buscarBolsa(id);
            if (!bolsa) {
                avisar(req, 'erro', 'Bolsa não encontrada.');
                return res.redirect('/estoque');
            }
            const [equipamentos, atual] = await Promise.all([
                EquipamentoService.listarAtivos(),
                EstoqueConsultaService.buscarLocalizacao(id)
            ]);
            res.render('estoque/localizacao', {
                bolsa, equipamentos, atual, valores: {}, usuario: req.session.usuario
            });
        } catch (erro) {
            tratar(req, res, erro, '/estoque', 'Erro ao abrir a localização da bolsa');
        }
    }

    static async salvarLocalizacao(req, res) {
        const id = parseInt(req.params.id, 10);
        try {
            const bolsa = await EstoqueConsultaService.alocar(id, req.body);
            await AuditoriaService.registrarLog(req.session.usuario.id, 'ALOCACAO_BOLSA', 'hemocomponentes', id, '');
            avisar(req, 'ok', `Local da bolsa ${bolsa.codigo_original} atualizado.`);
            res.redirect('/estoque');
        } catch (erro) {
            if (erro instanceof ErroNegocio) {
                const [bolsa, equipamentos, atual] = await Promise.all([
                    EstoqueConsultaService.buscarBolsa(id),
                    EquipamentoService.listarAtivos(),
                    EstoqueConsultaService.buscarLocalizacao(id)
                ]);
                if (!bolsa) return tratar(req, res, erro, '/estoque', 'Erro ao alocar bolsa');
                return res.status(400).render('estoque/localizacao', {
                    bolsa, equipamentos, atual, valores: req.body, erro: erro.message,
                    usuario: req.session.usuario
                });
            }
            tratar(req, res, erro, '/estoque', 'Erro ao alocar bolsa');
        }
    }

    static async removerLocalizacao(req, res) {
        try {
            const id = parseInt(req.params.id, 10);
            await EstoqueConsultaService.remover(id);
            await AuditoriaService.registrarLog(req.session.usuario.id, 'REMOCAO_LOCALIZACAO', 'hemocomponentes', id, '');
            avisar(req, 'ok', 'Localização removida.');
            res.redirect('/estoque');
        } catch (erro) {
            tratar(req, res, erro, '/estoque', 'Erro ao remover localização');
        }
    }
}

module.exports = EstoquePaginaController;
