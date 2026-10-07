# syntax=docker/dockerfile:1
# Image production cho wen-go (Next.js 16). Giải thích từng dòng: D:\docs\docker-lesson\03-ap-dung-wen-go.md

# ---------- Stage 1: cài dependencies ----------
FROM node:20-alpine AS deps
# Một số package native cần glibc-compat trên Alpine
RUN apk add --no-cache libc6-compat
WORKDIR /app
# Chỉ copy file khai báo dependency -> layer này được cache tới khi package*.json đổi
COPY package.json package-lock.json ./
RUN npm ci

# ---------- Stage 2: build ----------
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Biến NEXT_PUBLIC_* được Next.js NHÚNG vào bundle JS lúc build,
# nên phải truyền bằng --build-arg, truyền lúc `docker run` là quá muộn.
ARG NEXT_PUBLIC_MAPTILER_KEY
ARG NEXT_PUBLIC_BACKEND_ORIGIN
ENV NEXT_PUBLIC_MAPTILER_KEY=$NEXT_PUBLIC_MAPTILER_KEY \
    NEXT_PUBLIC_BACKEND_ORIGIN=$NEXT_PUBLIC_BACKEND_ORIGIN \
    NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# ---------- Stage 3: chạy ----------
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000

# Chỉ lấy đúng những gì cần để chạy; user `node` có sẵn trong image node
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static

USER node
EXPOSE 3000
CMD ["node", "server.js"]
