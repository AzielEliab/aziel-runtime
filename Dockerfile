FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
COPY . .
RUN npm install --omit=dev
ENV NODE_ENV=production
ENV AZIEL_RUNTIME_URL=https://aziel-runtime.vibelock.workers.dev
ENTRYPOINT ["node", "cli/mcp-stdio.mjs"]
