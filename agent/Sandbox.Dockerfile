FROM node:24.22.1-bookworm-slim@sha256:55fb5f5a527ea2c5c4a95f963e48ef90aa38c7b346054fdc8ee9957a2b55d205
WORKDIR /opt/backend
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --ignore-scripts --no-audit --no-fund
WORKDIR /opt/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --ignore-scripts --no-audit --no-fund
WORKDIR /tmp
USER node
