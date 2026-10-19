FROM node:24-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/
COPY prisma7.config.ts tsconfig*.json nest-cli.json ./

RUN npm install

COPY src ./src
RUN npx prisma generate
RUN npm run build

FROM node:24-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

COPY package*.json ./
COPY prisma ./prisma/
COPY prisma7.config.ts ./
RUN npm install --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/generated ./src/generated

EXPOSE 4000

CMD ["node", "dist/main.js"]
