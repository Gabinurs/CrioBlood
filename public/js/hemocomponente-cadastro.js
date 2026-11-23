(function () {
    'use strict';

    var coleta = document.getElementById('data_coleta');
    var marcarTodos = document.getElementById('marcar-exames');
    var exames = Array.prototype.slice.call(document.querySelectorAll('[data-exame]'));

    if (!coleta) return;

    function dataLocalHoje() {
        var agora = new Date();
        var ano = agora.getFullYear();
        var mes = String(agora.getMonth() + 1).padStart(2, '0');
        var dia = String(agora.getDate()).padStart(2, '0');
        return ano + '-' + mes + '-' + dia;
    }

    // Preenche a coleta com hoje somente quando ainda não existe valor.
    // O campo permanece editável para registrar uma data de coleta anterior.
    if (!coleta.value) coleta.value = dataLocalHoje();

    if (marcarTodos) {
        marcarTodos.addEventListener('click', function () {
            exames.forEach(function (exame) { exame.checked = true; });
        });
    }

    exames.forEach(function (exame) {
        exame.addEventListener('change', atualizarContador);
    });

    function atualizarContador() {
        var contador = document.getElementById('contador-exames');
        if (!contador) return;
        var selecionados = exames.filter(function (exame) { return exame.checked; }).length;
        contador.textContent = selecionados + ' de ' + exames.length + ' selecionados';
    }

    atualizarContador();
})();