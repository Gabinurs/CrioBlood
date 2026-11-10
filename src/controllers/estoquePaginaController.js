const EstoqueConsultaService = require('../services/estoqueConsultaService');
const { tratar } = require('../utils/erros');

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
}

module.exports = EstoquePaginaController;
