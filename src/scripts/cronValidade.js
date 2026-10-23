const cron = require('node-cron');
const EstoqueService = require('../services/estoqueService');

// Expressão Cron: '0 0 * * *' significa "Executar à 00:00 todos os dias"
function iniciarRotinaValidade() {
    cron.schedule('0 0 * * *', async () => {
        console.log('[CRON] Iniciando verificação de hemocomponentes vencidos...');
        
        try {
            const bolsasDescartadas = await EstoqueService.invalidarVencidos();
            console.log(`[CRON] Sucesso: ${bolsasDescartadas} bolsas foram marcadas como "Descarte - Vencido".`);
        } catch (erro) {
            console.error('[CRON] Erro ao verificar validades:', erro);
        }
    });
    
    console.log('Rotina de verificação de validades (CRON) ativada.');
}

module.exports = iniciarRotinaValidade;
