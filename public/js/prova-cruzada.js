(function () {
    'use strict';

    var modal = document.querySelector('[data-modal-prova]');
    if (!modal) return;

    var action = modal.querySelector('form').getAttribute('action') || '';
    var match = action.match(/solicitacoes\/(\d+)\/provas-cruzadas/);
    if (!match) return;

    var form = modal.querySelector('[data-form-prova]');
    var campoItem = modal.querySelector('[data-prova-item]');
    var campoBolsa = modal.querySelector('[data-prova-bolsa]');
    var codigo = modal.querySelector('[data-prova-codigo]');
    var detalhes = modal.querySelector('[data-prova-detalhes]');
    var resultado = modal.querySelector('[name="resultado"]');
    var titulo = modal.querySelector('[data-titulo-prova]');
    var rotuloResultado = modal.querySelector('[data-rotulo-resultado]');
    var rotuloResponsavel = modal.querySelector('[data-rotulo-responsavel]');
    var avisoTipo = modal.querySelector('[data-aviso-tipo-verificacao]');
    var blocoExcecao = modal.querySelector('[data-excecao-rhd]');
    var campoExcecao = modal.querySelector('[name="excecao_rhd_confirmada"]');
    var campoSemAntiD = modal.querySelector('[name="sem_historico_anti_d"]');
    var campoAutorizador = modal.querySelector('[name="autorizador_nome"]');
    var campoJustificativa = modal.querySelector('[name="justificativa_excecao"]');

    var etiquetaModal = document.querySelector('[data-etiqueta-prova-modal]');
    var etiquetaFrame = etiquetaModal && etiquetaModal.querySelector('[data-etiqueta-prova-frame]');

    function definirExcecaoVisivel(visivel) {
        blocoExcecao.hidden = !visivel;
        campoExcecao.required = visivel;
        campoSemAntiD.required = visivel;
        campoAutorizador.required = visivel;
        campoJustificativa.required = visivel;
    }

    function abrirModalProva(botao) {
        // Os dados da bolsa foram carregados no servidor e a análise só é apresentada
        // depois que o usuário entra no módulo Compatibilidade.
        var d = botao.dataset;
        var b = {
            id: d.bolsaId,
            codigoOriginal: d.codigoOriginal || '',
            codigoInterno: d.codigoInterno || '',
            tipo: d.tipo || '',
            abo: d.abo || '',
            fatorRh: d.rh || '',
            volumeMl: d.volume || '',
            validade: d.validade || ''
        };
        var comp = {
            permitido: d.permitido === 'true',
            excecaoPossivel: d.excecaoPossivel === 'true',
            tipoVerificacao: d.tipoVerificacao || (b.tipo === 'CH' ? 'PROVA_CRUZADA' : 'CONFERENCIA_COMPATIBILIDADE')
        };

        if (!b.id || !comp.permitido && !comp.excecaoPossivel) {
            window.alert('Esta bolsa ainda não está liberada para registrar prova/conferência. Consulte o resultado no módulo Compatibilidade.');
            return;
        }

        var itemId = botao.getAttribute('data-item-id');
        campoItem.value = itemId;
        campoBolsa.value = b.id;
        codigo.textContent = b.codigoOriginal;
        detalhes.textContent = (b.codigoInterno || 'Sem código local') + ' · ' +
            b.abo + b.fatorRh + ' · ' + (b.volumeMl || '—') + ' mL · Validade ' + b.validade;

        var isProvaCruzada = comp.tipoVerificacao === 'PROVA_CRUZADA';
        titulo.textContent = isProvaCruzada ? 'Prova cruzada' :
            (b.tipo === 'CRIO' ? 'Conferência do crioprecipitado' : 'Conferência de compatibilidade');
        rotuloResultado.textContent = isProvaCruzada
            ? 'Resultado da prova cruzada *'
            : (b.tipo === 'CRIO' ? 'Condição do componente *' : 'Conferência de compatibilidade *');
        rotuloResponsavel.textContent = isProvaCruzada
            ? 'Colaborador que realizou a prova *'
            : 'Colaborador que realizou a conferência *';

        var opcaoCompat = resultado.querySelector('option[value="COMPATIVEL"]');
        var opcaoIncomp = resultado.querySelector('option[value="INCOMPATIVEL"]');
        opcaoCompat.textContent = isProvaCruzada ? 'Compatível' : 'Conferência conforme';
        opcaoIncomp.textContent = isProvaCruzada ? 'Incompatível' : 'Conferência não conforme';
        avisoTipo.textContent = isProvaCruzada
            ? 'A prova cruzada laboratorial deve ser realizada pelo profissional habilitado. O CrioBlood registra o resultado informado.'
            : 'Registre a conferência aplicável ao componente, conforme o protocolo do serviço de hemoterapia.';

        form.reset();
        campoItem.value = itemId;
        campoBolsa.value = b.id;
        definirExcecaoVisivel(comp.excecaoPossivel);
        modal.showModal();

        var dataHora = modal.querySelector('[data-datahora-display]');
        if (dataHora) dataHora.focus();
    }

    document.querySelectorAll('[data-abrir-prova]').forEach(function (botao) {
        botao.addEventListener('click', function () { abrirModalProva(botao); });
    });

    function fechar() {
        modal.close();
        form.reset();
        campoItem.value = '';
        campoBolsa.value = '';
        definirExcecaoVisivel(false);
    }

    modal.querySelectorAll('[data-fechar-prova]').forEach(function (botao) {
        botao.addEventListener('click', fechar);
    });
    modal.addEventListener('click', function (evento) {
        if (evento.target === modal) fechar();
    });

    if (etiquetaModal && etiquetaFrame) {
        document.querySelectorAll('[data-abrir-etiqueta]').forEach(function (botao) {
            botao.addEventListener('click', function () {
                etiquetaModal.showModal();
                etiquetaFrame.src = botao.getAttribute('data-abrir-etiqueta');
            });
        });
        etiquetaModal.querySelector('[data-fechar-etiqueta]').addEventListener('click', function () {
            etiquetaModal.close();
            etiquetaFrame.src = 'about:blank';
        });
        etiquetaModal.addEventListener('click', function (evento) {
            if (evento.target === etiquetaModal) {
                etiquetaModal.close();
                etiquetaFrame.src = 'about:blank';
            }
        });
        etiquetaModal.addEventListener('close', function () {
            etiquetaFrame.src = 'about:blank';
        });
    }

    form.addEventListener('submit', function (evento) {
        if (!campoItem.value || !campoBolsa.value) {
            evento.preventDefault();
            window.alert('A bolsa selecionada não foi encontrada. Volte à etapa da requisição e associe uma bolsa.');
            return;
        }
        if (blocoExcecao && !blocoExcecao.hidden) {
            if (!campoExcecao.checked || !campoSemAntiD.checked ||
                !campoAutorizador.value.trim() || !campoJustificativa.value.trim()) {
                evento.preventDefault();
                window.alert('A exceção RhD exige autorização, confirmação de ausência de sensibilização anti-D e justificativa.');
                return;
            }
        }
        if (resultado.value === 'INCOMPATIVEL') {
            var mensagem = 'Registrar o resultado INCOMPATÍVEL? A bolsa será liberada de volta ao estoque e deixará de ficar vinculada a esta unidade.';
            if (!window.confirm(mensagem)) evento.preventDefault();
        }
    });
})();