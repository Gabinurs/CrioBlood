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

    // Busca de receptores com autocomplete e seleção antes de mostrar ações.
    var buscaReceptor = document.querySelector('[data-busca-receptor]');
    if (buscaReceptor) {
        var opcoesReceptor = Array.prototype.slice.call(document.querySelectorAll('[data-opcao-receptor]'));
        var sugestoes = document.querySelector('[data-sugestoes-receptor]');
        var selecionado = document.querySelector('[data-receptor-selecionado]');
        var instrucao = document.querySelector('[data-instrucao-busca]');
        var limpar = document.querySelector('[data-limpar-busca]');
        var trocar = document.querySelector('[data-trocar-receptor]');

        function normalizar(valor) {
            return (valor || '').toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        }
        function fecharSugestoes() {
            if (sugestoes) sugestoes.hidden = true;
            buscaReceptor.setAttribute('aria-expanded', 'false');
        }
        function filtrarReceptores() {
            var termo = normalizar(buscaReceptor.value.trim());
            var encontrados = 0;
            opcoesReceptor.forEach(function (opcao) {
                var corresponde = termo.length > 0 && normalizar(opcao.getAttribute('data-nome')).includes(termo);
                opcao.hidden = !corresponde;
                if (corresponde) encontrados++;
            });
            var mostrar = termo.length > 0 && encontrados > 0 && (!selecionado || selecionado.hidden);
            if (sugestoes) sugestoes.hidden = !mostrar;
            buscaReceptor.setAttribute('aria-expanded', mostrar ? 'true' : 'false');
            if (instrucao && (!selecionado || selecionado.hidden)) {
                instrucao.textContent = termo.length === 0
                    ? 'Nenhum paciente selecionado.'
                    : encontrados === 0 ? 'Nenhum receptor encontrado. Confira o nome ou clique em Inserir.' : 'Selecione um paciente na lista que apareceu abaixo do campo.';
            }
        }
        function selecionarReceptor(opcao) {
            var nome = opcao.getAttribute('data-nome');
            selecionado.querySelector('[data-selecionado-nome]').textContent = nome;
            selecionado.querySelector('[data-selecionado-nascimento]').textContent = opcao.getAttribute('data-nascimento');
            selecionado.querySelector('[data-selecionado-prontuario]').textContent = opcao.getAttribute('data-prontuario');
            selecionado.querySelector('[data-acao-dossie]').href = opcao.getAttribute('data-dossie');
            selecionado.querySelector('[data-acao-amostra]').href = opcao.getAttribute('data-amostra');
            selecionado.querySelector('[data-acao-edicao]').href = opcao.getAttribute('data-edicao');
            selecionado.querySelector('[data-acao-urgencia]').href = opcao.getAttribute('data-urgencia');
            selecionado.hidden = false;
            buscaReceptor.value = nome;
            fecharSugestoes();
            if (instrucao) instrucao.textContent = 'Paciente selecionado. Escolha uma das ações ao lado.';
        }
        opcoesReceptor.forEach(function (opcao) {
            opcao.addEventListener('click', function () { selecionarReceptor(opcao); });
        });
        buscaReceptor.addEventListener('input', function () {
            if (selecionado && !selecionado.hidden) selecionado.hidden = true;
            filtrarReceptores();
        });
        buscaReceptor.addEventListener('focus', filtrarReceptores);
        if (limpar) limpar.addEventListener('click', function () {
            buscaReceptor.value = '';
            if (selecionado) selecionado.hidden = true;
            fecharSugestoes();
            if (instrucao) instrucao.textContent = 'Nenhum paciente selecionado.';
            buscaReceptor.focus();
        });
        if (trocar) trocar.addEventListener('click', function () {
            if (selecionado) selecionado.hidden = true;
            buscaReceptor.value = '';
            fecharSugestoes();
            if (instrucao) instrucao.textContent = 'Pesquise e selecione outro paciente.';
            buscaReceptor.focus();
        });
        document.addEventListener('click', function (evento) {
            if (!evento.target.closest('.campo-busca-receptor')) fecharSugestoes();
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

    // Navegação segura entre as etapas do formulário de solicitação transfusional.
    var formularioSolicitacao = document.querySelector('[data-form-solicitacao]');
    if (formularioSolicitacao) {
        var etapasSolicitacao = Array.prototype.slice.call(formularioSolicitacao.querySelectorAll('[data-etapa]'));
        var paineisSolicitacao = Array.prototype.slice.call(formularioSolicitacao.querySelectorAll('[data-painel-etapa]'));
        var voltarSolicitacao = formularioSolicitacao.querySelector('[data-voltar-etapa]');
        var proximaSolicitacao = formularioSolicitacao.querySelector('[data-proxima-etapa]');
        var salvarSolicitacao = formularioSolicitacao.querySelector('[data-salvar-solicitacao]');

        function mostrarEtapaSolicitacao(numero) {
            paineisSolicitacao.forEach(function (painel, indice) {
                painel.hidden = indice !== numero - 1;
            });
            etapasSolicitacao.forEach(function (botao, indice) {
                botao.classList.toggle('ativa', indice === numero - 1);
                botao.setAttribute('aria-selected', indice === numero - 1 ? 'true' : 'false');
            });
            if (voltarSolicitacao) voltarSolicitacao.hidden = numero === 1;
            if (proximaSolicitacao) proximaSolicitacao.hidden = numero === 2;
            if (salvarSolicitacao) salvarSolicitacao.hidden = numero !== 2;
        }

        function validarEtapaSolicitacao(numero) {
            var painel = paineisSolicitacao[numero - 1];
            if (!painel) return false;
            var camposInvalidos = Array.prototype.slice.call(
                painel.querySelectorAll('input, select, textarea')
            ).filter(function (campo) {
                return !campo.disabled && !campo.checkValidity();
            });
            if (camposInvalidos.length) {
                camposInvalidos[0].reportValidity();
                camposInvalidos[0].focus();
                return false;
            }
            return true;
        }

        if (proximaSolicitacao) proximaSolicitacao.addEventListener('click', function () {
            if (validarEtapaSolicitacao(1)) mostrarEtapaSolicitacao(2);
        });
        if (voltarSolicitacao) voltarSolicitacao.addEventListener('click', function () {
            mostrarEtapaSolicitacao(1);
        });
        etapasSolicitacao.forEach(function (botao, indice) {
            botao.addEventListener('click', function () {
                var destino = indice + 1;
                if (destino === 1 || validarEtapaSolicitacao(1)) mostrarEtapaSolicitacao(destino);
            });
        });
        formularioSolicitacao.addEventListener('submit', function (evento) {
            if (!validarEtapaSolicitacao(1)) {
                evento.preventDefault();
                mostrarEtapaSolicitacao(1);
            } else if (!validarEtapaSolicitacao(2)) {
                evento.preventDefault();
                mostrarEtapaSolicitacao(2);
            }
        });
        mostrarEtapaSolicitacao(1);
    }



    // Validade automática conforme o hemocomponente e a data da coleta.
    var tipoBolsa = document.getElementById('tipo');
    var coletaBolsa = document.getElementById('data_coleta');
    var validadeBolsa = document.getElementById('data_validade');
    var regraValidade = document.getElementById('regra-validade');
    var ajudaValidade = document.getElementById('ajuda-validade');
    function calcularValidadeBolsa() {
        if (!tipoBolsa || !coletaBolsa || !validadeBolsa) return;
        var prazos = { CH: { dias: 35, texto: '35 dias' }, PLASMA: { anos: 1, texto: '1 ano' }, CRIO: { anos: 1, texto: '1 ano' }, PLAQUETAS: { dias: 5, texto: '5 dias' } };
        var prazo = prazos[tipoBolsa.value];
        if (!prazo) {
            if (regraValidade) regraValidade.textContent = 'Prazo aplicado: aguardando seleção do hemocomponente.';
            if (ajudaValidade) ajudaValidade.textContent = 'Selecione o hemocomponente e a data da coleta.';
            return;
        }
        if (regraValidade) regraValidade.textContent = 'Prazo aplicado: ' + prazo.text + ' após a data da coleta.';
        if (ajudaValidade) ajudaValidade.textContent = 'Calculada automaticamente. Você pode conferir a data exibida.';
        if (!coletaBolsa.value) { validadeBolsa.value = ''; return; }
        var partes = coletaBolsa.value.split('-').map(Number);
        var data = new Date(partes[0], partes[1] - 1, partes[2]);
        if (prazo.dias) data.setDate(data.getDate() + prazo.dias);
        if (prazo.anos) data.setFullYear(data.getFullYear() + prazo.anos);
        var ano = data.getFullYear();
        var mes = String(data.getMonth() + 1).padStart(2, '0');
        var dia = String(data.getDate()).padStart(2, '0');
        validadeBolsa.value = ano + '-' + mes + '-' + dia;
    }
    if (tipoBolsa && coletaBolsa && validadeBolsa) {
        tipoBolsa.addEventListener('change', calcularValidadeBolsa);
        coletaBolsa.addEventListener('change', calcularValidadeBolsa);
    }

    var marcarExamesBolsa = document.querySelector('[data-marcar-exames]');
    if (marcarExamesBolsa) {
        var checksExamesBolsa = Array.prototype.slice.call(document.querySelectorAll('[data-exame-bolsa]'));
        var contadorExames = document.getElementById('contador-exames');
        function atualizarContadorExames() {
            var marcados = checksExamesBolsa.filter(function (c) { return c.checked; }).length;
            if (contadorExames) contadorExames.textContent = marcados + ' de ' + checksExamesBolsa.length + ' selecionados';
            marcarExamesBolsa.textContent = marcados === checksExamesBolsa.length ? 'Desmarcar todos' : 'Marcar todos';
        }
        checksExamesBolsa.forEach(function (c) { c.addEventListener('change', atualizarContadorExames); });
        marcarExamesBolsa.addEventListener('click', function () {
            var marcar = !checksExamesBolsa.every(function (c) { return c.checked; });
            checksExamesBolsa.forEach(function (c) { c.checked = marcar; });
            atualizarContadorExames();
        });
        atualizarContadorExames();
    }
})();
