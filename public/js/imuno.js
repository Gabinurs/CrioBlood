(function () {
    'use strict';
    var form = document.querySelector('[data-form-imuno]');
    var modal = document.querySelector('[data-modal-justificativa]');
    if (!form || !modal) return;
    var campo = modal.querySelector('[data-campo-justificativa]');
    var alvo = null;
    var voltar = null;

    function abrirJustificativa(select) {
        alvo = select;
        voltar = select.value;
        var tipo = select.getAttribute('data-imuno-resultado');
        modal.querySelector('[data-titulo-justificativa]').textContent = tipo === 'pai' ? 'Justificativa do PAI positivo' : 'Justificativa do Controle positivo';
        modal.querySelector('[data-texto-justificativa]').textContent = 'O resultado positivo exige justificativa e mantém a solicitação transfusional bloqueada.';
        campo.value = form.querySelector('[data-justificativa-value="' + tipo + '"]').value;
        modal.showModal();
        campo.focus();
    }

    form.querySelectorAll('[data-imuno-resultado]').forEach(function (select) {
        select.addEventListener('change', function () {
            if (select.value === 'POSITIVO') abrirJustificativa(select);
            else {
                var tipo = select.getAttribute('data-imuno-resultado');
                form.querySelector('[data-justificativa-value="' + tipo + '"]').value = '';
            }
        });
    });

    modal.querySelector('[data-cancelar-justificativa]').addEventListener('click', function () {
        if (alvo) alvo.value = voltar === 'POSITIVO' ? '' : voltar;
        modal.close();
    });
    modal.querySelector('[data-confirmar-justificativa]').addEventListener('click', function () {
        var texto = campo.value.trim();
        if (texto.length < 5) {
            campo.setCustomValidity('Informe uma justificativa com pelo menos 5 caracteres.');
            campo.reportValidity();
            campo.setCustomValidity('');
            return;
        }
        var tipo = alvo.getAttribute('data-imuno-resultado');
        form.querySelector('[data-justificativa-value="' + tipo + '"]').value = texto;
        modal.close();
    });
    modal.addEventListener('cancel', function () {
        if (alvo && !form.querySelector('[data-justificativa-value="' + alvo.getAttribute('data-imuno-resultado') + '"]').value) {
            alvo.value = '';
        }
    });
})();