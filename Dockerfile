# Aziel Runtime stdio MCP (Glama / local Docker).
# Default CMD bridges to POST $AZIEL_RUNTIME_URL/mcp.
# Required egress: outbound DNS + HTTPS to *.vibelock.workers.dev / Cloudflare
# (/mcp and /v1/fraggate/*). glibc (bookworm) resolves those names more
# reliably than musl Alpine in common CI / Glama containers.
# DNS failure is FG-DNS (remote:false) — never a FragGate execution receipt
# and never a silent --local fallback.
# Author: Aziel Eliab.
FROM node:22-bookworm-slim
WORKDIR /app
COPY package.json package-lock.json* ./
COPY . .
RUN if [ -f package-lock.json ]; then npm ci --omit=dev --no-audit --no-fund --ignore-scripts; else npm install --omit=dev --no-audit --no-fund --ignore-scripts; fi
ENV NODE_ENV=production
ENV AZIEL_RUNTIME_URL=https://aziel-runtime.vibelock.workers.dev
CMD ["node", "cli/mcp-stdio.mjs"]
