const db = require('../database');

class DashboardController {
    static async index(req, res) {
        try {
            // Query para somar o volume (ml) de cada tipo de hemocomponente em estoque
            const query = `
                SELECT tipo, SUM(volume_ml) as total_volume 
                FROM hemocomponentes 
                WHERE status != 'Descartado' 
                GROUP BY tipo
            `;
            const [resultados] = await db.query(query);

            // Separa os dados em arrays para o Chart.js
            const labels = resultados.map(item => item.tipo);
            const dadosVolume = resultados.map(item => item.total_volume);

            res.render('dashboard/index', {
                title: 'Painel de Controle - CrioBlood',
                usuario: req.session.usuario,
                // Converte os arrays para strings JSON para serem injetados no frontend
                chartLabels: JSON.stringify(labels),
                chartData: JSON.stringify(dadosVolume)
            });
        } catch (erro) {
            console.error('Erro ao carregar o dashboard:', erro);
            res.status(500).send('Erro ao processar os dados do painel.');
        }
    }
}

module.exports = DashboardController;
