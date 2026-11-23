(function () {
    'use strict';

    var modal = document.querySelector('[data-modal-prova]');
    if (!modal) return;

    var requisicaoId = modal.querySelector('form').getAttribute('action').match(/solicitacoes\/(\d+)\/provas-cruzadas/)[1];
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
    var bolsasVerificadas = new Map();

    function definirResultadoVisual(elemento, tipo, tituloTexto, mensagem, detalhesTexto) {
        elemento.hidden = false;
        elemento.classList.remove('resultado-codigo-ok', 'resultado-codigo-erro', 'resultado-codigo-alerta');
        elemento.classList.add(tipo);
        elemento.querySelector('[data-resultado-titulo]').textContent = tituloTexto;
        elemento.querySelector('[data-resultado-mensagem]').textContent = mensagem;
        elemento.querySelector('[data-resultado-detalhes]').textContent = detalhesTexto || '';
    }

    function limparVerificacao(cartao) {
        var itemId = cartao.querySelector('[data-verificar-bolsa]').getAttribute('data-item-id');
        bolsasVerificadas.delete(itemId);
        var resultadoVisual = cartao.querySelector('[data-resultado-codigo]');
        resultadoVisual.hidden = true;
        resultadoVisual.classList.remove('resultado-codigo-ok', 'resultado-codigo-erro', 'resultado-codigo-alerta');
        cartao.querySelector('[data-abrir-prova]').disabled = true;
    }

    async function verificarCodigo(botao) {
        var itemId = botao.getAttribute('data-item-id');
        var cartao = botao.closest('.unidade-requisicao');
        var input = cartao && cartao.querySelector('[data-codigo-bolsa]');
        var visual = cartao && cartao.querySelector('[data-resultado-codigo]');
        var abrir = cartao && cartao.querySelector('[data-abrir-prova]');
        if (!input || !visual || !abrir) return;

        var codigoDigitado = input.value.trim();
        limparVerificacao(cartao);
        if (!codigoDigitado) {
            definirResultadoVisual(visual, 'resultado-codigo-erro', 'Informe o código da bolsa', 'Digite ou leia o código original ou o código local CrioBlood.', '');
            input.focus();
            return;
        }

        botao.disabled = true;
        botao.textContent = 'Verificando…';
        try {
            var url = '/solicitacoes/' + encodeURIComponent(requisicaoId) +
                '/itens/' + encodeURIComponent(itemId) +
                '/verificar-bolsa?codigo=' + encodeURIComponent(codigoDigitado);
            var resposta = await fetch(url, {
                headers: { 'Accept': 'application/json' },
                credentials: 'same-origin'
            });
            var dados = await resposta.json();
            if (!resposta.ok) throw new Error(dados.erro || 'Não foi possível validar esta bolsa.');

            bolsasVerificadas.set(itemId, dados);
            var b = dados.bolsa;
            var comp = dados.compatibilidade;
            var detalhesTexto = b.codigoInterno + ' · ' + b.tipo + ' · ' +
                b.abo + b.fatorRh + ' · ' + (b.volumeMl || '—') + ' mL · Validade ' + b.validade;

            if (comp.excecaoPossivel) {
                definirResultadoVisual(
                    visual, 'resultado-codigo-alerta', 'Exceção RhD exige autorização',
                    comp.mensagem,
                    detalhesTexto
                );
            } else {
                definirResultadoVisual(
                    visual, 'resultado-codigo-ok', 'Bolsa localizada e compatível',
                    comp.mensagem,
                    detalhesTexto
                );
            }
            abrir.disabled = false;
            abrir.textContent = comp.excecaoPossivel
                ? 'Registrar autorização e prova cruzada'
                : (comp.tipoVerificacao === 'PROVA_CRUZADA' ? 'Registrar prova cruzada' : 'Registrar conferência');
        } catch (erro) {
            definirResultadoVisual(visual, 'resultado-codigo-erro', 'Bolsa não liberada', erro.message, '');
            abrir.disabled = true;
        } finally {
            botao.disabled = false;
            botao.textContent = 'Verificar código';
        }
    }

    document.querySelectorAll('[data-verificar-bolsa]').forEach(function (botao) {
        botao.addEventListener('click', function () { verificarCodigo(botao); });
        var card = botao.closest('.unidade-requisicao');
        var input = card && card.querySelector('[data-codigo-bolsa]');
        if (input) {
            input.addEventListener('input', function () { limparVerificacao(card); });
            input.addEventListener('keydown', function (evento) {
                if (evento.key === 'Enter') {
                    evento.preventDefault();
                    verificarCodigo(botao);
                }
            });
        }
    });

    function definirExcecaoVisivel(visivel) {
        blocoExcecao.hidden = !visivel;
        campoExcecao.required = visivel;
        campoSemAntiD.required = visivel;
        campoAutorizador.required = visivel;
        campoJustificativa.required = visivel;
    }

    function abrirModalProva(botao) {
        var itemId = botao.getAttribute('data-item-id');
        var dados = bolsasVerificadas.get(itemId);
        if (!dados || !dados.bolsa || !dados.compatibilidade) {
            window.alert('Primeiro informe e verifique o código da bolsa.');
            return;
        }

        var b = dados.bolsa;
        var comp = dados.compatibilidade;
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
            ? 'A prova cruzada é realizada pelo serviço de hemoterapia. O CrioBlood apenas registra o resultado informado pelo profissional executor.'
            : 'Este registro documenta a conferência aplicável ao componente. Para plasma e crioprecipitado, a norma não exige prova de compatibilidade; siga o protocolo institucional.';
        definirExcecaoVisivel(Boolean(comp.excecaoPossivel));
        form.reset();
        campoItem.value = itemId;
        campoBolsa.value = b.id;
        definirExcecaoVisivel(Boolean(comp.excecaoPossivel));

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
            window.alert('Verifique o código da bolsa antes de registrar.');
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
            var mensagem = 'Registrar o resultado INCOMPATÍVEL? A bolsa não será reservada nem vinculada ao receptor.';
            if (!window.confirm(mensagem)) evento.preventDefault();
        }
    });
})();