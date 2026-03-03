# Собирает backend TypeScript → JavaScript для запуска в продакшне
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY prisma ./prisma/
ENV DATABASE_URL="postgresql://dummy:dummy@localhost/dummy"
RUN npx prisma generate
COPY . .
RUN npm run build

# Финальный образ — только production зависимости
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY prisma ./prisma/

EXPOSE ${PORT:-4000}
CMD ["node", "dist/index.js"]
