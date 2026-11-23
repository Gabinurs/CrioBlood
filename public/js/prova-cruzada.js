(function () {
    'use strict';
    var modal = document.querySelector('[data-modal-prova]');
    if (!modal) return;

    var form = modal.querySelector('[data-form-prova]');
    var campoItem = modal.querySelector('[data-prova-item]');
    var campoBolsa = modal.querySelector('[data-prova-bolsa]');
    var codigo = modal.querySelector('[data-prova-codigo]');
    var detalhes = modal.querySelector('[data-prova-detalhes]');
    var triagem = modal.querySelector('[data-prova-triagem]');
    var resultado = modal.querySelector('[name="resultado"]');

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
            triagem.textContent = opcao.getAttribute('data-triagem')
                ? 'Triagem ABO/Rh geral: compatível pelas regras cadastradas. A prova cruzada continua obrigatória.'
                : 'Atenção: a triagem geral ABO/Rh não sugere compatibilidade. Não registre resultado compatível se houver divergência.';
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