# Usa uma imagem oficial, leve e segura do Node.js
FROM node:18-alpine

# Define o diretório de trabalho dentro do container
WORKDIR /usr/src/app

# Copia apenas os arquivos de dependências primeiro (otimiza o cache de build do Docker)
COPY package*.json ./

# Instala estritamente as dependências necessárias para produção
RUN npm ci --only=production

# Copia todo o restante do código fonte
COPY . .

# Sinaliza que a aplicação roda na porta 3000
EXPOSE 3000

# Comando para iniciar o servidor MVC
CMD ["node", "src/app.js"]
