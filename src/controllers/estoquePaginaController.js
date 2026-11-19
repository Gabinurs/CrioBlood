const { paginar } = require('../utils/paginacao');
const EstoqueModel = require('../models/estoqueModel');
const EquipamentoModel = require('../models/equipamentoModel');
const AuditoriaModel = require('../models/auditoriaModel');
const { ErroNegocio, avisar, tratar, enviarErro } = require('../utils/erros');

const STATUS = require('../utils/status');
class EstoquePaginaController {
    static async index(req, res) {
        try {
            const [resumo, matriz, { linhas: bolsas, paginacao }] = await Promise.all([
                EstoqueModel.resumo(),
                EstoqueModel.matriz(),
                paginar(req, () => EstoqueModel.contarBolsas(), (pag) => EstoqueModel.listarBolsas(pag))
            ]);
            res.render('estoque/index', {
                resumo, matriz, bolsas, paginacao, tipos: EstoqueModel.TIPOS, usuario: req.session.usuario
            });
        } catch (erro) {
            tratar(req, res, erro, '/dashboard', 'Erro ao carregar o estoque');
        }
    }

    static async formLocalizacao(req, res) {
        try {
            const id = parseInt(req.params.id, 10);
            const bolsa = await EstoqueModel.buscarBolsa(id);
            if (!bolsa) {
                return enviarErro(req, res, STATUS.NAO_ENCONTRADO, 'Bolsa não encontrada.');
            }
            const [equipamentos, atual] = await Promise.all([
                EquipamentoModel.listarAtivos(),
                EstoqueModel.buscarLocalizacao(id)
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
            const bolsa = await EstoqueModel.alocar(id, req.body);
            await AuditoriaModel.registrarLog(req.session.usuario.id, 'ALOCACAO_BOLSA', 'hemocomponentes', id, '');
            avisar(req, 'ok', `Local da bolsa ${bolsa.codigo_original} atualizado.`);
            res.redirect(STATUS.VER_OUTRO, '/estoque');
        } catch (erro) {
            if (erro instanceof ErroNegocio) {
                const [bolsa, equipamentos, atual] = await Promise.all([
                    EstoqueModel.buscarBolsa(id),
                    EquipamentoModel.listarAtivos(),
                    EstoqueModel.buscarLocalizacao(id)
                ]);
                if (!bolsa) return tratar(req, res, erro, '/estoque', 'Erro ao alocar bolsa');
                return res.status(erro.statusCode || STATUS.ENTIDADE_INVALIDA).render('estoque/localizacao', {
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
            await EstoqueModel.remover(id);
            await AuditoriaModel.registrarLog(req.session.usuario.id, 'REMOCAO_LOCALIZACAO', 'hemocomponentes', id, '');
            avisar(req, 'ok', 'Localização removida.');
            res.redirect(STATUS.VER_OUTRO, '/estoque');
        } catch (erro) {
            tratar(req, res, erro, '/estoque', 'Erro ao remover localização');
        }
    }
}

module.exports = EstoquePaginaController;
