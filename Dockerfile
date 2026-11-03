FROM node:22-bookworm-slim

WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# better-sqlite3 ships prebuilt binaries; the toolchain is only a fallback for unusual platforms.
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .
RUN npm run build

ENV NODE_ENV=production \
    TUTORLY_DB_PATH=/app/data/tutorly.db
EXPOSE 5117

# Fresh demo data on every start.
CMD ["sh", "-c", "npm run seed && npm start"]
