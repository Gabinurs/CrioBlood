// Comportamentos comuns das telas (arquivo externo: o CSP do helmet bloqueia scripts inline)
(function () {
    document.addEventListener('submit', function (evento) {
        var formulario = evento.target;
        var mensagem = formulario.getAttribute('data-confirmar');
        if (mensagem && !window.confirm(mensagem)) evento.preventDefault();
    });

    // Filtro de tabelas tradicional
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
                    if (valor && linha.getAttribute('data-' + nome) !== valor) combina = false;
                });
                linha.hidden = !combina;
                if (combina) visiveis++;
            });
            if (aviso) aviso.hidden = visiveis > 0;
        }
        if (texto) texto.addEventListener('input', filtrar);
        selects.forEach(function (campo) { campo.addEventListener('change', filtrar); });
    });

    // Consulta de receptores: pesquisa parcial, sem diferenciar maiúsculas ou acentos
    var buscaReceptor = document.querySelector('[data-busca-receptor]');
    if (buscaReceptor) {
        var linhasReceptor = Array.prototype.slice.call(document.querySelectorAll('[data-receptor-linha]'));
        var semReceptor = document.querySelector('[data-sem-receptor]');
        var contador = document.querySelector('[data-contador-receptores]');
        var instrucao = document.querySelector('[data-instrucao-busca]');
        var limpar = document.querySelector('[data-limpar-busca]');

        function normalizar(valor) {
            return (valor || '').toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        }

        function filtrarReceptores() {
            var termo = normalizar(buscaReceptor.value.trim());
            var encontrados = 0;
            linhasReceptor.forEach(function (linha) {
                var nome = normalizar(linha.getAttribute('data-nome-receptor'));
                var corresponde = termo.length > 0 && nome.includes(termo);
                linha.hidden = !corresponde;
                if (corresponde) encontrados++;
            });
            if (contador) contador.textContent = encontrados;
            if (semReceptor) semReceptor.hidden = termo.length === 0 || encontrados > 0;
            if (instrucao) {
                instrucao.textContent = termo.length === 0
                    ? 'Digite um nome acima para exibir os resultados.'
                    : encontrados + (encontrados === 1 ? ' receptor encontrado.' : ' receptores encontrados.');
            }
        }
        buscaReceptor.addEventListener('input', filtrarReceptores);
        if (limpar) limpar.addEventListener('click', function () {
            buscaReceptor.value = '';
            filtrarReceptores();
            buscaReceptor.focus();
        });
    }

    // Modal de cadastro de receptor
    var modal = document.querySelector('[data-modal-receptor]');
    if (modal) {
        var botoesAbrir = document.querySelectorAll('[data-abrir-cadastro]');
        var botoesFechar = modal.querySelectorAll('[data-fechar-cadastro]');
        function abrirModal() {
            modal.hidden = false;
            document.body.classList.add('modal-aberto');
            var primeiroCampo = modal.querySelector('input[name="nome"]');
            if (primeiroCampo) primeiroCampo.focus();
        }
        function fecharModal() {
            modal.hidden = true;
            document.body.classList.remove('modal-aberto');
        }
        botoesAbrir.forEach(function (botao) { botao.addEventListener('click', abrirModal); });
        botoesFechar.forEach(function (botao) { botao.addEventListener('click', fecharModal); });
        document.addEventListener('keydown', function (evento) {
            if (evento.key === 'Escape' && !modal.hidden) fecharModal();
        });
        if (!modal.hidden) document.body.classList.add('modal-aberto');
    }

    // Exige justificativa explícita para resultados positivos de Controle Rh e PAI.
    document.querySelectorAll('[data-resultado-alerta]').forEach(function (campo) {
        var tipo = campo.getAttribute('data-resultado-alerta');
        var justificativa = document.querySelector('[data-justificativa="' + tipo + '"]');
        var textarea = justificativa ? justificativa.querySelector('textarea') : null;
        function atualizar() {
            var positivo = campo.value === 'POSITIVO';
            if (justificativa) justificativa.hidden = !positivo;
            if (textarea) { textarea.required = positivo; if (!positivo) textarea.value = ''; }
            if (positivo && textarea) {
                var mensagem = tipo === 'pai'
                    ? 'PAI POSITIVO: informe a justificativa. Este resultado bloqueará a solicitação e a transfusão neste sistema.'
                    : 'Controle Rh POSITIVO: confirme o resultado e informe a justificativa.';
                var resposta = window.prompt(mensagem, textarea.value || '');
                if (resposta === null || resposta.trim().length < 5) {
                    campo.value = '';
                    justificativa.hidden = true;
                    textarea.required = false;
                    textarea.value = '';
                    window.alert('Resultado positivo não registrado. Selecione novamente e informe uma justificativa válida.');
                    return;
                }
                textarea.value = resposta.trim();
                textarea.focus();
            }
        }
        campo.addEventListener('change', atualizar);
    });

    document.querySelectorAll('.alerta-ok').forEach(function (aviso) {
        setTimeout(function () { aviso.hidden = true; }, 6000);
    });
})();
