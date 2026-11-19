const EstoqueModel = require('../models/estoqueModel');
const DashboardModel = require('../models/dashboardModel');
const { tratar } = require('../utils/erros');

class DashboardController {
    static async index(req, res) {
        try {
            const [resumo, matriz, vencimentos, contagens, urgentes] = await Promise.all([
                EstoqueModel.resumo(),
                EstoqueModel.matriz(),
                EstoqueModel.proximosVencimentos(5),
                DashboardModel.contagens(),
                DashboardModel.solicitacoesUrgentes(5)
            ]);

            // Total disponível por tipagem (A+, A-, ...) somando os produtos
            const porTipagem = matriz.linhas.map(l => ({ rotulo: l.rotulo, total: l.total }));
            const maiorTipo = Math.max(1, ...matriz.porTipo.map(t => t.total));

            res.render('dashboard/index', {
                usuario: req.session.usuario,
                resumo,
                contagens,
                porTipo: matriz.porTipo,
                maiorTipo,
                porTipagem,
                vencimentos,
                urgentes
            });
        } catch (erro) {
            tratar(req, res, erro, '/login', 'Erro ao carregar o dashboard');
        }
    }
}

module.exports = DashboardController;
