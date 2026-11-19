const cron = require('node-cron');
const ValidadeService = require('../services/validadeService');

async function verificarValidades(origem) {
    try {
        const { vencidas, solicitacoesLiberadas } = await ValidadeService.invalidarVencidos();
        console.log(`[CRON] (${origem}) ${vencidas} bolsa(s) vencida(s); ${solicitacoesLiberadas} solicitação(ões) voltaram para pendente.`);
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
