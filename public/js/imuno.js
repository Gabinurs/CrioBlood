// Interação da tela Imuno: exige justificativa em modal quando PAI ou Controle é positivo.
(function () {
    var form = document.querySelector('[data-form-imuno]');
    var modal = document.querySelector('[data-modal-justificativa]');
    if (!form || !modal || typeof modal.showModal !== 'function') return;

    var campoAtual = null;
    var hiddenAtual = null;
    var texto = modal.querySelector('[data-campo-justificativa]');

    function abrirJustificativa(campo) {
        var tipo = campo.getAttribute('data-imuno-resultado');
        campoAtual = campo;
        hiddenAtual = form.querySelector('[name="' + (tipo === 'controle' ? 'controle_rh' : tipo) + '_justificativa"]');
        modal.querySelector('[data-titulo-justificativa]').textContent =
            'Justificativa — ' + (tipo === 'pai' ? 'PAI' : 'Controle') + ' positivo';
        modal.querySelector('[data-texto-justificativa]').textContent =
            'O resultado positivo exige justificativa e bloqueará a solicitação transfusional.';
        texto.value = hiddenAtual.value || '';
        modal.showModal();
        texto.focus();
    }

    form.querySelectorAll('[data-imuno-resultado]').forEach(function (campo) {
        campo.addEventListener('change', function () {
            var tipo = campo.getAttribute('data-imuno-resultado');
            var justificativa = form.querySelector('[name="' + (tipo === 'controle' ? 'controle_rh' : tipo) + '_justificativa"]');
            if (campo.value === 'POSITIVO') abrirJustificativa(campo);
            else if (justificativa) justificativa.value = '';
        });
    });

    modal.querySelector('[data-confirmar-justificativa]').addEventListener('click', function () {
        var valor = texto.value.trim();
        if (valor.length < 5) {
            texto.setCustomValidity('Informe uma justificativa com pelo menos 5 caracteres.');
            texto.reportValidity();
            texto.focus();
            return;
        }
        texto.setCustomValidity('');
        if (hiddenAtual) hiddenAtual.value = valor;
        modal.close();
    });

    modal.querySelector('[data-cancelar-justificativa]').addEventListener('click', function () {
        if (campoAtual) campoAtual.value = '';
        if (hiddenAtual) hiddenAtual.value = '';
        modal.close();
    });

    var imprimirEtiqueta = document.querySelector('[data-imprimir-etiqueta]');
    if (imprimirEtiqueta) imprimirEtiqueta.addEventListener('click', function () { window.print(); });
    var fecharEtiqueta = document.querySelector('[data-fechar-etiqueta]');
    if (fecharEtiqueta) fecharEtiqueta.addEventListener('click', function () { window.close(); });

    form.addEventListener('submit', function (evento) {
        ['pai', 'controle'].forEach(function (tipo) {
            var campo = form.querySelector('[data-imuno-resultado="' + tipo + '"]');
            var justificativa = form.querySelector('[name="' + (tipo === 'controle' ? 'controle_rh' : tipo) + '_justificativa"]');
            if (campo && campo.value === 'POSITIVO' && (!justificativa || justificativa.value.trim().length < 5)) {
                evento.preventDefault();
                abrirJustificativa(campo);
            }
        });
    });
})();
