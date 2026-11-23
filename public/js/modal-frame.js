(function () {
    'use strict';
    document.addEventListener('click', function (evento) {
        var imprimir = evento.target.closest && evento.target.closest('[data-imprimir]');
        if (!imprimir) return;
        evento.preventDefault();
        window.print();
    });
})();