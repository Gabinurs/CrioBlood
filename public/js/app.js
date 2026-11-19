// Comportamentos comuns das telas (arquivo externo: o CSP do helmet bloqueia scripts inline)
(function () {
    // Botão "Voltar" das páginas de erro (o CSP bloqueia onclick inline)
    document.addEventListener('click', function (evento) {
        var botao = evento.target.closest && evento.target.closest('[data-voltar]');
        if (!botao) return;
        evento.preventDefault();
        if (window.history.length > 1) window.history.back(); else window.location.href = '/dashboard';
    });

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

    // ---------- Aparência: tema, menu lateral e animações (somente visual) ----------
    var raiz = document.documentElement;

    function guardar(chave, valor) {
        try { localStorage.setItem(chave, valor); } catch (erro) { /* sem armazenamento: vale só nesta página */ }
    }

    // Alternar tema claro/escuro
    document.querySelectorAll('[data-tema-alternar]').forEach(function (botao) {
        function rotular() {
            var escuro = raiz.getAttribute('data-tema') === 'dark';
            botao.setAttribute('aria-label', escuro ? 'Mudar para o tema claro' : 'Mudar para o tema escuro');
            botao.setAttribute('title', escuro ? 'Tema claro' : 'Tema escuro');
        }
        rotular();

        botao.addEventListener('click', function () {
            var novoTema = raiz.getAttribute('data-tema') === 'dark' ? 'light' : 'dark';
            raiz.classList.add('tema-animando');
            raiz.setAttribute('data-tema', novoTema);
            guardar('crioblood.tema', novoTema);
            rotular();
            setTimeout(function () { raiz.classList.remove('tema-animando'); }, 450);
        });
    });

    // Menu lateral: recolhe sozinho; o botão "fixar" mantém aberto
    var botaoFixar = document.querySelector('[data-menu-fixar]');
    if (botaoFixar) {
        function rotularFixar() {
            var fixo = raiz.getAttribute('data-menu') === 'fixo';
            botaoFixar.setAttribute('aria-pressed', fixo ? 'true' : 'false');
            botaoFixar.setAttribute('title', fixo ? 'Soltar menu (recolher sozinho)' : 'Fixar menu aberto');
            botaoFixar.setAttribute('aria-label', botaoFixar.getAttribute('title'));
        }
        rotularFixar();

        botaoFixar.addEventListener('click', function () {
            var novoModo = raiz.getAttribute('data-menu') === 'fixo' ? 'auto' : 'fixo';
            raiz.setAttribute('data-menu', novoModo);
            guardar('crioblood.menu', novoModo);
            rotularFixar();
            botaoFixar.blur(); // devolve o foco para o menu recolher assim que o mouse sair
        });
    }

    // Menu em telas pequenas: abre como gaveta
    function alternarGaveta(abrir) {
        document.body.classList.toggle('menu-aberto', abrir);
    }
    document.querySelectorAll('[data-menu-abrir]').forEach(function (botao) {
        botao.addEventListener('click', function () { alternarGaveta(true); });
    });
    document.querySelectorAll('[data-menu-fechar]').forEach(function (area) {
        area.addEventListener('click', function () { alternarGaveta(false); });
    });
    document.addEventListener('keydown', function (evento) {
        if (evento.key === 'Escape') alternarGaveta(false);
    });

    // Números dos indicadores "sobem" até o valor real (o texto final nunca muda)
    var semMovimento = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!semMovimento) {
        document.querySelectorAll('.indicador strong').forEach(function (el) {
            var textoFinal = el.textContent.trim();
            var alvo = parseInt(textoFinal, 10);
            if (!/^\d+$/.test(textoFinal) || alvo === 0 || alvo > 100000) return;

            var duracao = 800;
            var inicio = null;
            function passo(agora) {
                if (inicio === null) inicio = agora;
                var progresso = Math.min((agora - inicio) / duracao, 1);
                var suave = 1 - Math.pow(1 - progresso, 3);
                el.textContent = progresso < 1 ? String(Math.round(alvo * suave)) : textoFinal;
                if (progresso < 1) requestAnimationFrame(passo);
            }
            el.textContent = '0';
            requestAnimationFrame(passo);
        });
    }

    // Some com os avisos de sucesso depois de alguns segundos
    document.querySelectorAll('.alerta-ok').forEach(function (aviso) {
        setTimeout(function () { aviso.hidden = true; }, 6000);
    });
})();
