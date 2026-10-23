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

        <div class="bg-dark-slate/90 border border-gray-700 border-t-4 border-t-cyber-yellow p-8 shadow-[0_0_15px_rgba(252,238,9,0.1)] relative">
            <h1 class="text-2xl text-cyber-yellow tracking-widest uppercase mb-8 drop-shadow-[0_0_5px_rgba(252,238,9,0.3)]">Novo Hemocomponente</h1>
            
            <form action="/hemocomponentes/novo" method="POST" class="space-y-6">
                
                <div>
                    <label for="lote_id" class="block text-electric-purple uppercase text-sm tracking-wider mb-2">ID do Lote de Origem</label>
                    <input type="number" id="lote_id" name="lote_id" class="w-full bg-matte-black border border-gray-700 text-cyber-yellow p-3 outline-none focus:border-electric-purple focus:shadow-[0_0_8px_rgba(176,38,255,0.4)] transition-all" value="<%= typeof lote_id !== 'undefined' ? lote_id : '' %>" required>
                </div>

                <div>
                    <label for="tipo" class="block text-electric-purple uppercase text-sm tracking-wider mb-2">Tipo de Hemocomponente</label>
                    <select id="tipo" name="tipo" class="w-full bg-matte-black border border-gray-700 text-cyber-yellow p-3 outline-none focus:border-electric-purple focus:shadow-[0_0_8px_rgba(176,38,255,0.4)] transition-all" required>
                        <option value="" class="text-gray-500">Selecione...</option>
                        <option value="Concentrado de Hemácias">Concentrado de Hemácias (CH)</option>
                        <option value="Plasma Fresco Congelado">Plasma Fresco Congelado (PFC)</option>
                        <option value="Concentrado de Plaquetas">Concentrado de Plaquetas (CP)</option>
                        <option value="Crioprecipitado">Crioprecipitado (CRIO)</option>
                    </select>
                </div>

                <div>
                    <label for="volume_ml" class="block text-electric-purple uppercase text-sm tracking-wider mb-2">Volume (ml)</label>
                    <input type="number" step="0.1" id="volume_ml" name="volume_ml" class="w-full bg-matte-black border border-gray-700 text-cyber-yellow p-3 outline-none focus:border-electric-purple transition-all" required>
                </div>

                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label for="data_extracao" class="block text-electric-purple uppercase text-sm tracking-wider mb-2">Data da Extração</label>
                        <input type="date" id="data_extracao" name="data_extracao" class="w-full bg-matte-black border border-gray-700 text-cyber-yellow p-3 outline-none focus:border-electric-purple transition-all" required>
                    </div>
                    <div>
                        <label for="data_validade" class="block text-electric-purple uppercase text-sm tracking-wider mb-2">Data de Validade</label>
                        <input type="date" id="data_validade" name="data_validade" class="w-full bg-matte-black border border-gray-700 text-cyber-yellow p-3 outline-none focus:border-electric-purple transition-all" required>
                    </div>
                </div>

                <div>
                    <label for="status" class="block text-electric-purple uppercase text-sm tracking-wider mb-2">Status Inicial</label>
                    <select id="status" name="status" class="w-full bg-matte-black border border-gray-700 text-cyber-yellow p-3 outline-none focus:border-electric-purple transition-all" required>
                        <option value="Em Quarentena">Em Quarentena (Aguardar Sorologia)</option>
                        <option value="Disponível">Disponível</option>
                    </select>
                </div>

                <div class="pt-6 flex items-center space-x-4 border-t border-gray-800">
                    <button type="submit" class="border border-cyber-yellow text-cyber-yellow px-6 py-3 uppercase tracking-widest font-bold hover:bg-cyber-yellow hover:text-matte-black transition-all shadow-[0_0_10px_rgba(252,238,9,0.2)]">
                        Salvar Registo
                    </button>
                    <a href="/hemocomponentes" class="text-gray-500 hover:text-danger-red uppercase tracking-wider text-sm transition-colors">Cancelar Operação</a>
                </div>
            </form>
        </div>
    </div>
</body>
</html>
