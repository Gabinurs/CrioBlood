(function () {
    'use strict';
    var modal = document.querySelector('[data-amostra-modal]');
    var frame = document.querySelector('[data-amostra-modal-frame]');
    var titulo = document.querySelector('[data-amostra-modal-titulo]');
    if (!modal || !frame || !titulo) return;

    function fechar() {
        modal.close();
        frame.src = 'about:blank';
    }

    document.querySelectorAll('[data-amostra-modal-url]').forEach(function (botao) {
        botao.addEventListener('click', function () {
            var url = botao.getAttribute('data-amostra-modal-url');
            titulo.textContent = botao.getAttribute('data-amostra-modal-titulo') || 'Detalhes da amostra';
            modal.showModal();
            frame.src = url + (url.indexOf('?') >= 0 ? '&' : '?') + 'modal=1';
        });
    });

    modal.querySelector('[data-amostra-modal-fechar]').addEventListener('click', fechar);
    modal.addEventListener('click', function (evento) {
        if (evento.target === modal) fechar();
    });
    modal.addEventListener('close', function () { frame.src = 'about:blank'; });
    frame.addEventListener('load', function () {
        try {
            var doc = frame.contentDocument;
            if (doc && doc.body && doc.body.dataset.modalConcluido === 'true') {
                fechar();
                window.location.reload();
            }
        } catch (erro) {
            // O iframe é servido pela própria aplicação; falhas não interrompem o dossiê.
        }
    });
})();