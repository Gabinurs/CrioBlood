const cron = require('node-cron');
const EstoqueService = require('../services/estoqueService');

async function verificarValidades(origem) {
    try {
        const total = await EstoqueService.invalidarVencidos();
        console.log(`[CRON] (${origem}) ${total} bolsa(s) marcada(s) como vencida(s).`);
    } catch (erro) {
        console.error('[CRON] Erro ao verificar validades:', erro);
    }
}

// Roda à meia-noite (horário de Brasília) e também ao iniciar o sistema,
// para não deixar bolsas vencidas "disponíveis" se o servidor ficou desligado.
function iniciarRotinaValidade() {
    cron.schedule('0 0 * * *', () => verificarValidades('diária'), {
        timezone: 'America/Sao_Paulo'
    });

    verificarValidades('inicialização');
    console.log('Rotina de verificação de validades (CRON) ativada.');
}

module.exports = iniciarRotinaValidade;
