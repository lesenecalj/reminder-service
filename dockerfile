FROM node:20-alpine AS builder
WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci

COPY tsconfig*.json ./ 

COPY . .
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /usr/src/app/dist ./dist

ENV NODE_ENV=dev
ENV WS_PORT=8080

EXPOSE 8080

CMD ["node", "dist/server.js"]