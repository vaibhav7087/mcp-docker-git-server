# Sandboxed MCP Server Container
FROM node:22-alpine AS builder

WORKDIR /app
COPY package*.json tsconfig.json ./
RUN npm install
COPY src ./src
RUN npm run build

FROM node:22-alpine AS runner

WORKDIR /app
RUN apk add --no-cache docker-cli git
COPY package*.json ./
RUN npm install --omit=dev
COPY --from=builder /app/dist ./dist

ENV NODE_ENV=production
USER node

ENTRYPOINT ["node", "dist/index.js"]
