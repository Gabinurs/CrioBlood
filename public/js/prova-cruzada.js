(function () {
    'use strict';
    var modal = document.querySelector('[data-modal-prova]');
    if (!modal) return;

    var form = modal.querySelector('[data-form-prova]');
    var campoItem = modal.querySelector('[data-prova-item]');
    var campoBolsa = modal.querySelector('[data-prova-bolsa]');
    var codigo = modal.querySelector('[data-prova-codigo]');
    var detalhes = modal.querySelector('[data-prova-detalhes]');
    var resultado = modal.querySelector('[name="resultado"]');
    var etiquetaModal = document.querySelector('[data-etiqueta-prova-modal]');
    var etiquetaFrame = etiquetaModal && etiquetaModal.querySelector('[data-etiqueta-prova-frame]');

    function fechar() {
        modal.close();
        form.reset();
        campoItem.value = '';
        campoBolsa.value = '';
    }

    document.querySelectorAll('[data-abrir-prova]').forEach(function (botao) {
        botao.addEventListener('click', function () {
            var itemId = botao.getAttribute('data-item-id');
            var cartao = botao.closest('.unidade-requisicao');
            var select = cartao && cartao.querySelector('[data-selecionar-bolsa]');
            if (!select || !select.value) {
                window.alert('Selecione uma bolsa antes de registrar a prova cruzada.');
                if (select) select.focus();
                return;
            }
            var opcao = select.options[select.selectedIndex];
            campoItem.value = itemId;
            campoBolsa.value = select.value;
            codigo.textContent = opcao.getAttribute('data-codigo') || '—';
            var local = opcao.getAttribute('data-interno') || 'Sem código local';
            var tipagem = opcao.getAttribute('data-tipagem') || 'Tipagem não informada';
            var volume = opcao.getAttribute('data-volume') || '—';
            var validade = opcao.getAttribute('data-validade') || '—';
            detalhes.textContent = local + ' · ' + tipagem + ' · ' + volume + ' mL · Validade ' + validade;
            modal.showModal();
            var dataHora = modal.querySelector('[data-datahora-display]');
            if (dataHora) dataHora.focus();
        });
    });

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
            window.alert('Selecione a unidade solicitada e a bolsa.');
            return;
        }
        if (resultado.value === 'INCOMPATIVEL') {
            if (!window.confirm('Registrar a prova como INCOMPATÍVEL? A bolsa não será reservada nem vinculada ao paciente.')) {
                evento.preventDefault();
            }
        }
    });
})();