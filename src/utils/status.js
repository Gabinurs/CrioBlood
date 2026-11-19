// Códigos de status HTTP usados no sistema (use estes nomes em vez de números soltos).
//
//  2xx  deu certo
//  3xx  redirecionamentos (após um POST bem-sucedido o sistema responde 303 e abre a tela de destino)
//  4xx  erro de quem fez a requisição
//  5xx  erro do servidor
module.exports = Object.freeze({
    OK: 200,                    // página ou JSON entregue normalmente
    REDIRECIONAR: 302,          // GET que leva a outra página (ex.: sem login -> /login)
    VER_OUTRO: 303,             // POST concluído -> "veja a página de destino" (padrão Post/Redirect/Get)
    REQUISICAO_INVALIDA: 400,   // endereço ou parâmetro malformado (ex.: id que não é número)
    NAO_AUTENTICADO: 401,       // login ou senha incorretos
    PROIBIDO: 403,              // logado, mas sem permissão (ou token CSRF inválido)
    NAO_ENCONTRADO: 404,        // página ou registro inexistente
    CONFLITO: 409,              // conflita com o estado atual (duplicado, lote fechado, posição ocupada...)
    ENTIDADE_INVALIDA: 422,     // dados enviados não passaram na validação (formato, tamanho, regra)
    MUITAS_REQUISICOES: 429,    // limite de tentativas excedido
    ERRO_INTERNO: 500,          // falha inesperada no servidor
    INDISPONIVEL: 503           // banco de dados fora do ar
});
