// Comportamentos comuns das telas (arquivo externo: o CSP do helmet bloqueia scripts inline)
(function () {
    // Confirmação antes de enviar formulários com data-confirmar="mensagem"
    document.addEventListener('submit', function (evento) {
        var formulario = evento.target;
        var mensagem = formulario.getAttribute('data-confirmar');
        if (mensagem && !window.confirm(mensagem)) {
            evento.preventDefault();
        }
    });

    // Filtro de tabelas: <div data-filtravel> com campos [data-filtro-texto] e [data-filtro-campo="status"]
    document.querySelectorAll('[data-filtravel]').forEach(function (area) {
        var texto = area.querySelector('[data-filtro-texto]');
        var selects = area.querySelectorAll('[data-filtro-campo]');
        var linhas = area.querySelectorAll('tr[data-busca]');
        var aviso = area.querySelector('[data-sem-resultado]');

        function filtrar() {
            var termo = texto ? texto.value.trim().toLowerCase() : '';
            var visiveis = 0;

            linhas.forEach(function (linha) {
                var combina = linha.getAttribute('data-busca').indexOf(termo) !== -1;

                selects.forEach(function (campo) {
                    var valor = campo.value;
                    var nome = campo.getAttribute('data-filtro-campo');
                    if (valor && linha.getAttribute('data-' + nome) !== valor) {
                        combina = false;
                    }
                });

                linha.hidden = !combina;
                if (combina) visiveis++;
            });

            if (aviso) aviso.hidden = visiveis > 0;
        }

        if (texto) texto.addEventListener('input', filtrar);
        selects.forEach(function (campo) { campo.addEventListener('change', filtrar); });
    });

    // Some com os avisos de sucesso depois de alguns segundos
    document.querySelectorAll('.alerta-ok').forEach(function (aviso) {
        setTimeout(function () { aviso.hidden = true; }, 6000);
    });
})();
