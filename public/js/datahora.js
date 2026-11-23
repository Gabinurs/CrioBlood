(function () {
    'use strict';

    var meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
        'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
    var pad = function (n) { return String(n).padStart(2, '0'); };

    function criarData(ano, mes, dia, hora, minuto) {
        return new Date(ano, mes, dia, dia ? hora || 0 : 0, minuto || 0, 0, 0);
    }
    function formatarValor(d) {
        return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) +
            'T' + pad(d.getHours()) + ':' + pad(d.getMinutes());
    }
    function formatarExibicao(d) {
        return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear() +
            '  ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
    }
    function lerValor(valor) {
        var m = String(valor || '').match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
        if (!m) return null;
        var d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5]), 0, 0);
        return d.getFullYear() === Number(m[1]) && d.getMonth() === Number(m[2]) - 1 &&
            d.getDate() === Number(m[3]) ? d : null;
    }
    function mesmoDia(a, b) {
        return a && b && a.getFullYear() === b.getFullYear() &&
            a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
    }

    document.querySelectorAll('[data-seletor-data-hora]').forEach(function (root) {
        var display = root.querySelector('[data-datahora-display]');
        var hidden = root.querySelector('[data-datahora-value]');
        var toggle = root.querySelector('[data-datahora-toggle]');
        var popup = root.querySelector('[data-datahora-popup]');
        var titulo = root.querySelector('[data-mes-ano]');
        var grade = root.querySelector('[data-grade-dias]');
        var hora = root.querySelector('[data-selecionar-hora]');
        var minuto = root.querySelector('[data-selecionar-minuto]');
        var selecionada = lerValor(hidden.value || root.getAttribute('data-valor-inicial')) || new Date();
        var mesVisivel = new Date(selecionada.getFullYear(), selecionada.getMonth(), 1);
        var copiaAntesDeAbrir = selecionada;

        for (var h = 0; h < 24; h++) {
            var oh = document.createElement('option');
            oh.value = pad(h);
            oh.textContent = pad(h);
            hora.appendChild(oh);
        }
        for (var m = 0; m < 60; m++) {
            var om = document.createElement('option');
            om.value = pad(m);
            om.textContent = pad(m);
            minuto.appendChild(om);
        }

        function sincronizar() {
            hidden.value = formatarValor(selecionada);
            display.value = formatarExibicao(selecionada);
            hora.value = pad(selecionada.getHours());
            minuto.value = pad(selecionada.getMinutes());
        }

        function desenharCalendario() {
            titulo.textContent = meses[mesVisivel.getMonth()] + ' de ' + mesVisivel.getFullYear();
            grade.replaceChildren();
            var primeiroDia = new Date(mesVisivel.getFullYear(), mesVisivel.getMonth(), 1);
            var deslocamento = (primeiroDia.getDay() + 6) % 7;
            var inicio = new Date(mesVisivel.getFullYear(), mesVisivel.getMonth(), 1 - deslocamento);
            var hoje = new Date();

            for (var i = 0; i < 42; i++) {
                var dia = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + i);
                var botao = document.createElement('button');
                botao.type = 'button';
                botao.className = 'dia-calendario';
                botao.textContent = String(dia.getDate());
                botao.setAttribute('data-data', formatarValor(new Date(dia.getFullYear(), dia.getMonth(), dia.getDate(), 0, 0)));
                if (dia.getMonth() !== mesVisivel.getMonth()) botao.classList.add('dia-outro-mes');
                if (mesmoDia(dia, hoje)) botao.classList.add('dia-hoje');
                if (mesmoDia(dia, selecionada)) {
                    botao.classList.add('dia-selecionado');
                    botao.setAttribute('aria-pressed', 'true');
                } else {
                    botao.setAttribute('aria-pressed', 'false');
                }
                botao.addEventListener('click', function () {
                    var d = lerValor(this.getAttribute('data-data'));
                    selecionada = new Date(d.getFullYear(), d.getMonth(), d.getDate(),
                        selecionada.getHours(), selecionada.getMinutes(), 0, 0);
                    mesVisivel = new Date(selecionada.getFullYear(), selecionada.getMonth(), 1);
                    desenharCalendario();
                });
                grade.appendChild(botao);
            }
        }

        function abrir() {
            copiaAntesDeAbrir = new Date(selecionada.getTime());
            var guardado = lerValor(hidden.value);
            if (guardado) selecionada = guardado;
            mesVisivel = new Date(selecionada.getFullYear(), selecionada.getMonth(), 1);
            sincronizar();
            desenharCalendario();
            popup.hidden = false;
            toggle.setAttribute('aria-expanded', 'true');
            display.setAttribute('aria-expanded', 'true');
        }
        function fechar(restaurar) {
            if (restaurar) selecionada = new Date(copiaAntesDeAbrir.getTime());
            sincronizar();
            popup.hidden = true;
            toggle.setAttribute('aria-expanded', 'false');
            display.setAttribute('aria-expanded', 'false');
        }

        root.querySelector('[data-mes-anterior]').addEventListener('click', function () {
            mesVisivel = new Date(mesVisivel.getFullYear(), mesVisivel.getMonth() - 1, 1);
            desenharCalendario();
        });
        root.querySelector('[data-proximo-mes]').addEventListener('click', function () {
            mesVisivel = new Date(mesVisivel.getFullYear(), mesVisivel.getMonth() + 1, 1);
            desenharCalendario();
        });
        hora.addEventListener('change', function () {
            selecionada.setHours(Number(hora.value));
        });
        minuto.addEventListener('change', function () {
            selecionada.setMinutes(Number(minuto.value));
        });
        root.querySelector('[data-datahora-agora]').addEventListener('click', function () {
            selecionada = new Date();
            mesVisivel = new Date(selecionada.getFullYear(), selecionada.getMonth(), 1);
            sincronizar();
            desenharCalendario();
        });
        root.querySelector('[data-datahora-confirmar]').addEventListener('click', function () {
            sincronizar();
            fechar(false);
        });
        root.querySelector('[data-datahora-cancelar]').addEventListener('click', function () {
            fechar(true);
        });
        toggle.addEventListener('click', function () {
            if (popup.hidden) abrir();
            else fechar(true);
        });
        display.addEventListener('click', abrir);
        display.addEventListener('keydown', function (evento) {
            if (evento.key === 'Enter' || evento.key === ' ') {
                evento.preventDefault();
                abrir();
            }
        });
        document.addEventListener('pointerdown', function (evento) {
            if (!popup.hidden && !root.contains(evento.target)) fechar(true);
        });
        document.addEventListener('keydown', function (evento) {
            if (evento.key === 'Escape' && !popup.hidden) {
                fechar(true);
                toggle.focus();
            }
        });

        sincronizar();
    });
})();