const LoteModel = require('../models/loteModel');
const AuditoriaModel = require('../models/auditoriaModel');
const { paginar } = require('../utils/paginacao');
const { avisar, tratar, enviarErro } = require('../utils/erros');

const STATUS = require('../utils/status');
class LoteController {
    // Listar lotes cadastrados
    static async listar(req, res) {
        try {
            const { linhas, paginacao } = await paginar(
                req, () => LoteModel.contar(), (pag) => LoteModel.listar(pag));

            res.render('lotes/index', {
                usuario: req.session.usuario,
                lotes: linhas,
                paginacao
            });
        } catch (erro) {
            console.error('Erro ao listar lotes:', erro.message);
            enviarErro(req, res, STATUS.ERRO_INTERNO, 'Não foi possível carregar os lotes de recebimento.');
        }
    }

    // Abrir um novo lote
    static async abrir(req, res) {
        try {
            const codigo = await LoteModel.abrir(req.session.usuario.id);

            avisar(req, 'ok', `Lote ${codigo} aberto. Já é possível cadastrar as bolsas recebidas.`);
            return res.redirect(STATUS.VER_OUTRO, '/lotes');
        } catch (erro) {
            console.error('Erro ao abrir lote:', erro.message);
            return enviarErro(req, res, STATUS.ERRO_INTERNO, 'Não foi possível abrir o lote de recebimento.');
        }
    }

    // Exibe o comprovante imprimível do recebimento, com os códigos originais e internos.
    static async relatorio(req, res) {
        try {
            const dados = await LoteModel.buscarRelatorio(Number(req.params.id));
            if (!dados) {
                return enviarErro(req, res, STATUS.NAO_ENCONTRADO, 'Lote não encontrado.');
            }

            res.render('lotes/relatorio', {
                lote: dados.lote,
                bolsas: dados.bolsas,
                usuario: req.session.usuario
            });
        } catch (erro) {
            console.error('Erro ao gerar relatório do lote:', erro.message);
            return enviarErro(req, res, STATUS.ERRO_INTERNO, 'Não foi possível gerar o relatório de recebimento.');
        }
    }

    // Fechar um lote
    static async fechar(req, res) {
        const id = parseInt(req.params.id, 10);

        try {
            const codigo = await LoteModel.fechar(id, req.session.usuario.id);

            await AuditoriaModel.registrarLog(
                req.session.usuario.id, 'FECHAMENTO_LOTE', 'lotes_recebimento', id, codigo);

            avisar(req, 'ok', `Lote ${codigo} fechado com sucesso.`);
            return res.redirect(STATUS.VER_OUTRO, '/lotes');
        } catch (erro) {
            return tratar(req, res, erro, '/lotes', 'Erro ao fechar lote');
        }
    }
}

module.exports = LoteController;
