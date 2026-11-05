<!DOCTYPE html>
<html lang="pt-PT">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><%= title %></title>
    
    <link href="https://fonts.googleapis.com/css2?family=Share+Tech+Mono&display=swap" rel="stylesheet">
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    colors: {
                        'matte-black': '#090a0c', 'dark-slate': '#1a1c23',
                        'cyber-yellow': '#fcee09', 'electric-purple': '#b026ff', 'danger-red': '#ff2a2a'
                    },
                    fontFamily: { mono: ['"Share Tech Mono"', 'monospace'] }
                }
            }
        }
    </script>
</head>
<body class="bg-matte-black text-gray-300 font-mono min-h-screen p-8" style="background-image: linear-gradient(rgba(26, 28, 35, 0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(26, 28, 35, 0.8) 1px, transparent 1px); background-size: 30px 30px;">
    
    <div class="max-w-2xl mx-auto">
        <!-- Navegação -->
        <nav class="mb-6 text-sm">
            <a href="/hemocomponentes" class="text-electric-purple hover:text-cyber-yellow transition-colors">&larr; Voltar à Listagem</a>
        </nav>

        <div class="bg-dark-slate/90 border border-gray-700 border-t-4 border-t-electric-purple p-8 shadow-[0_0_15px_rgba(176,38,255,0.1)] relative">
            <h1 class="text-2xl text-electric-purple tracking-widest uppercase mb-8 drop-shadow-[0_0_5px_rgba(176,38,255,0.3)]">Editar Hemocomponente #<%= hemocomponente.id %></h1>
            
            <form action="/hemocomponentes/editar/<%= hemocomponente.id %>" method="POST" class="space-y-6">
                
                <div>
                    <label for="tipo" class="block text-electric-purple uppercase text-sm tracking-wider mb-2">Tipo de Hemocomponente</label>
                    <select id="tipo" name="tipo" class="w-full bg-matte-black border border-gray-700 text-cyber-yellow p-3 outline-none focus:border-cyber-yellow transition-all" required>
                        <option value="Concentrado de Hemácias" <%= hemocomponente.tipo === 'Concentrado de Hemácias' ? 'selected' : '' %>>Concentrado de Hemácias (CH)</option>
                        <option value="Plasma Fresco Congelado" <%= hemocomponente.tipo === 'Plasma Fresco Congelado' ? 'selected' : '' %>>Plasma Fresco Congelado (PFC)</option>
                        <option value="Concentrado de Plaquetas" <%= hemocomponente.tipo === 'Concentrado de Plaquetas' ? 'selected' : '' %>>Concentrado de Plaquetas (CP)</option>
                        <option value="Crioprecipitado" <%= hemocomponente.tipo === 'Crioprecipitado' ? 'selected' : '' %>>Crioprecipitado (CRIO)</option>
                    </select>
                </div>

                <div>
                    <label for="volume_ml" class="block text-electric-purple uppercase text-sm tracking-wider mb-2">Volume (ml)</label>
                    <input type="number" step="0.1" id="volume_ml" name="volume_ml" class="w-full bg-matte-black border border-gray-700 text-cyber-yellow p-3 outline-none focus:border-cyber-yellow transition-all" value="<%= hemocomponente.volume_ml %>" required>
                </div>

                <div>
                    <label for="data_validade" class="block text-electric-purple uppercase text-sm tracking-wider mb-2">Data de Validade</label>
                    <% 
                        let dataFormatada = '';
                        if(hemocomponente.data_validade) {
                            dataFormatada = new Date(hemocomponente.data_validade).toISOString().split('T')[0];
                        }
                    %>
                    <input type="date" id="data_validade" name="data_validade" class="w-full bg-matte-black border border-gray-700 text-cyber-yellow p-3 outline-none focus:border-cyber-yellow transition-all" value="<%= dataFormatada %>" required>
                </div>

                <div>
                    <label for="status" class="block text-electric-purple uppercase text-sm tracking-wider mb-2">Status Operacional</label>
                    <select id="status" name="status" class="w-full bg-matte-black border border-gray-700 text-cyber-yellow p-3 outline-none focus:border-cyber-yellow transition-all" required>
                        <option value="Em Quarentena" <%= hemocomponente.status === 'Em Quarentena' ? 'selected' : '' %>>Em Quarentena</option>
                        <option value="Disponível" <%= hemocomponente.status === 'Disponível' ? 'selected' : '' %>>Disponível</option>
                        <option value="Reservado" <%= hemocomponente.status === 'Reservado' ? 'selected' : '' %>>Reservado</option>
                        <option value="Utilizado" <%= hemocomponente.status === 'Utilizado' ? 'selected' : '' %>>Utilizado (Transfusão)</option>
                        <option value="Descartado" <%= hemocomponente.status === 'Descartado' ? 'selected' : '' %>>Descartado</option>
                    </select>
                </div>

                <div class="pt-6 flex items-center space-x-4 border-t border-gray-800">
                    <button type="submit" class="border border-electric-purple text-electric-purple px-6 py-3 uppercase tracking-widest font-bold hover:bg-electric-purple hover:text-white transition-all shadow-[0_0_10px_rgba(176,38,255,0.2)]">
                        Atualizar Dados
                    </button>
                    <a href="/hemocomponentes" class="text-gray-500 hover:text-danger-red uppercase tracking-wider text-sm transition-colors">Cancelar Edição</a>
                </div>
            </form>
        </div>
    </div>
</body>
</html>
