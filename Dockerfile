FROM node:20-alpine

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

# Roda sem privilégios de root
USER node

EXPOSE 3000

CMD ["node", "src/app.js"]
