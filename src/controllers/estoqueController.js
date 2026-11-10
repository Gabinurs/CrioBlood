const EstoqueService = require('../services/estoqueService');

class EstoqueController {
    
    // Aloca a bolsa em um freezer/geladeira
    static async salvarLocalizacao(req, res) {
        try {
            const dadosArmazenamento = {
                hemocomponente_id: req.body.hemocomponente_id,
                equipamento_id: req.body.equipamento_id,
                gaveta: req.body.gaveta,
                caixa: req.body.caixa,
                posicao_exata: req.body.posicao_exata
            };

            await EstoqueService.alocarHemocomponente(dadosArmazenamento);
            res.redirect(`/hemocomponentes/editar/${dadosArmazenamento.hemocomponente_id}?sucesso=alocado`);
        } catch (erro) {
            console.error('Erro ao alocar hemocomponente:', erro);
            res.status(500).send('Erro ao salvar a localização.');
        }
    }

    // Finaliza o fluxo registrando a transfusão
    static async realizarSaida(req, res) {
        try {
            const dadosSaida = {
                hemocomponente_id: req.body.hemocomponente_id,
                paciente_nome: req.body.paciente_nome,
                prontuario: req.body.prontuario,
                medico_solicitante: req.body.medico_solicitante,
                observacoes: req.body.observacoes
            };

            await EstoqueService.registrarTransfusao(dadosSaida);
            res.redirect('/hemocomponentes?sucesso=transfusao_registrada');
        } catch (erro) {
            console.error('Erro ao registrar transfusão:', erro);
            res.status(500).send('Erro crítico ao registrar a saída da bolsa.');
        }
    }
}

module.exports = EstoqueController;
