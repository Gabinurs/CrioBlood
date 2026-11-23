(function () {
    'use strict';
    var busca = document.querySelector('[data-busca-receptor]');
    if (!busca) return;

    var sugestoes = document.querySelector('[data-sugestoes-receptor]');
    var areaInserir = document.querySelector('[data-receptor-inserir]');
    var selecionado = document.querySelector('[data-receptor-selecionado]');
    var instrucao = document.querySelector('[data-instrucao-busca]');
    var modal = document.querySelector('[data-modal-receptor]');
    var temporizador = null;
    var requisicao = null;

    function urlPaciente(id, sufixo) { return '/pacientes/' + encodeURIComponent(id) + sufixo; }
    function limparSugestoes() {
        sugestoes.replaceChildren();
        sugestoes.hidden = true;
        busca.setAttribute('aria-expanded', 'false');
    }
    function limparSelecionado() {
        selecionado.hidden = true;
        selecionado.removeAttribute('data-id');
        if (instrucao) instrucao.textContent = 'Nenhum receptor selecionado.';
    }
    function selecionar(p) {
        selecionado.hidden = false;
        selecionado.dataset.id = p.id;
        selecionado.dataset.nome = p.nome;
        selecionado.dataset.nascimento = p.nascimento;
        selecionado.dataset.prontuario = p.prontuario;
        selecionado.dataset.tipagem = p.tipagem;
        selecionado.dataset.amostra = p.ultima_amostra_id || '';
        selecionado.dataset.ativo = p.ativo ? 'true' : 'false';
        selecionado.querySelector('[data-selecionado-nome]').textContent = p.nome;
        selecionado.querySelector('[data-selecionado-nascimento]').textContent = p.nascimento;
        selecionado.querySelector('[data-selecionado-prontuario]').textContent = p.prontuario;
        selecionado.querySelector('[data-selecionado-tipagem]').textContent = p.tipagem;
        selecionado.querySelector('[data-acao-dossie]').href = urlPaciente(p.id, '/dossie');
        selecionado.querySelector('[data-acao-edicao]').href = urlPaciente(p.id, '/editar');
        selecionado.querySelector('[data-acao-amostra]').href = urlPaciente(p.id, '/amostras/nova');
        selecionado.querySelector('[data-acao-imuno]').href = p.ultima_amostra_id
            ? urlPaciente(p.id, '/amostras/' + p.ultima_amostra_id + '/imuno')
            : urlPaciente(p.id, '/dossie#amostras');
        selecionado.querySelector('[data-acao-urgencia]').href =
            '/solicitacoes/nova?paciente_id=' + encodeURIComponent(p.id) + '&urgencia=EXTREMA_URGENCIA';
        if (instrucao) instrucao.textContent = p.ativo ? 'Receptor selecionado. Escolha uma ação.' : 'Receptor inativo. Consulte ou edite o cadastro.';
        limparSugestoes();
        areaInserir.hidden = true;
        busca.value = p.nome;
    }
    function criarOpcao(p) {
        var botao = document.createElement('button');
        botao.type = 'button';
        botao.className = 'sugestao-receptor';
        var nome = document.createElement('strong');
        nome.textContent = p.nome;
        var detalhe = document.createElement('small');
        detalhe.textContent = 'Nascimento: ' + p.nascimento + ' · Prontuário: ' + p.prontuario +
            ' · ABO/Rh: ' + p.tipagem + (p.ativo ? '' : ' · INATIVO');
        botao.append(nome, detalhe);
        botao.addEventListener('click', function () { selecionar(p); });
        sugestoes.appendChild(botao);
    }
    async function pesquisar(termo) {
        if (requisicao) requisicao.abort();
        requisicao = new AbortController();
        try {
            var resposta = await fetch('/pacientes/buscar?q=' + encodeURIComponent(termo), {
                headers: { 'Accept': 'application/json' },
                signal: requisicao.signal
            });
            if (!resposta.ok) throw new Error('Falha na pesquisa');
            var dados = await resposta.json();
            limparSugestoes();
            dados.forEach(criarOpcao);
            if (dados.length) {
                sugestoes.hidden = false;
                busca.setAttribute('aria-expanded', 'true');
                areaInserir.hidden = true;
            } else {
                sugestoes.hidden = true;
                areaInserir.hidden = false;
            }
        } catch (erro) {
            if (erro.name !== 'AbortError') {
                limparSugestoes();
                if (instrucao) instrucao.textContent = 'Não foi possível pesquisar agora. Tente novamente.';
            }
        }
    }
    busca.addEventListener('input', function () {
        window.clearTimeout(temporizador);
        limparSelecionado();
        areaInserir.hidden = true;
        var termo = busca.value.trim();
        if (termo.length < 2) { limparSugestoes(); return; }
        temporizador = window.setTimeout(function () { pesquisar(termo); }, 220);
    });
    document.querySelector('[data-limpar-busca]')?.addEventListener('click', function () {
        busca.value = '';
        limparSugestoes();
        limparSelecionado();
        areaInserir.hidden = true;
        busca.focus();
    });
    document.querySelector('[data-trocar-receptor]')?.addEventListener('click', function () {
        limparSelecionado();
        busca.value = '';
        busca.focus();
    });
    function abrirModal() {
        if (!modal) return;
        modal.hidden = false;
        document.body.classList.add('modal-aberto');
        var primeiro = modal.querySelector('input[name="nome"]');
        if (primeiro) primeiro.focus();
    }
    function fecharModal() {
        if (!modal) return;
        modal.hidden = true;
        document.body.classList.remove('modal-aberto');
    }
    document.querySelectorAll('[data-abrir-cadastro]').forEach(function (botao) {
        botao.addEventListener('click', abrirModal);
    });
    document.querySelectorAll('[data-fechar-cadastro]').forEach(function (botao) {
        botao.addEventListener('click', fecharModal);
    });
    document.addEventListener('keydown', function (evento) {
        if (evento.key === 'Escape' && modal && !modal.hidden) fecharModal();
    });
    if (modal && !modal.hidden) abrirModal();
})();