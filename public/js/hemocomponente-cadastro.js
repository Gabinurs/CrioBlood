(function () {
    'use strict';

    var tipo = document.getElementById('tipo');
    var coleta = document.getElementById('data_coleta');
    var validade = document.getElementById('data_validade');
    var marcarTodos = document.getElementById('marcar-exames');
    var exames = Array.prototype.slice.call(document.querySelectorAll('[data-exame]'));

    if (!tipo || !coleta || !validade) return;

    var prazos = {
        CH: { quantidade: 42, unidade: 'dias', rotulo: '42 dias' },
        PLAQUETAS: { quantidade: 7, unidade: 'dias', rotulo: '7 dias' },
        PLASMA: { quantidade: 1, unidade: 'anos', rotulo: '1 ano' },
        CRIO: { quantidade: 1, unidade: 'anos', rotulo: '1 ano' }
    };

    function dataLocalHoje() {
        var agora = new Date();
        var ano = agora.getFullYear();
        var mes = String(agora.getMonth() + 1).padStart(2, '0');
        var dia = String(agora.getDate()).padStart(2, '0');
        return ano + '-' + mes + '-' + dia;
    }

    function adicionarPrazo(dataISO, prazo) {
        var partes = dataISO.split('-').map(Number);
        if (partes.length !== 3 || partes.some(function (n) { return !Number.isInteger(n); })) return '';
        var ano = partes[0], mes = partes[1], dia = partes[2];
        var data = new Date(Date.UTC(ano, mes - 1, dia));

        // Confirma que a data escolhida existe no calendário.
        if (data.getUTCFullYear() !== ano || data.getUTCMonth() !== mes - 1 || data.getUTCDate() !== dia) return '';

        if (prazo.unidade === 'dias') {
            data.setUTCDate(data.getUTCDate() + prazo.quantidade);
        } else {
            var diaOriginal = data.getUTCDate();
            data.setUTCDate(1);
            data.setUTCFullYear(data.getUTCFullYear() + prazo.quantidade);
            var ultimoDiaMes = new Date(Date.UTC(data.getUTCFullYear(), data.getUTCMonth() + 1, 0)).getUTCDate();
            data.setUTCDate(Math.min(diaOriginal, ultimoDiaMes));
        }

        return data.toISOString().slice(0, 10);
    }

    function atualizarValidade() {
        var prazo = prazos[tipo.value];
        validade.value = '';

        if (!coleta.value || !prazo) {
            validade.removeAttribute('aria-label');
            validade.title = 'Selecione o hemocomponente e a data da coleta.';
            return;
        }

        validade.value = adicionarPrazo(coleta.value, prazo);
        validade.title = 'Validade automática: ' + prazo.rotulo + ' após a data da coleta.';
    }

    // Preenche a coleta com hoje somente quando ainda não existe valor.
    // O campo permanece editável para registrar uma data de coleta anterior.
    if (!coleta.value) coleta.value = dataLocalHoje();

    tipo.addEventListener('change', atualizarValidade);
    coleta.addEventListener('change', atualizarValidade);
    coleta.addEventListener('input', atualizarValidade);

    // Também calcula quando o formulário já abre com tipo ou data preenchidos.
    atualizarValidade();

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