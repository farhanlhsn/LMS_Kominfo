FROM node:24-alpine AS base
WORKDIR /app
RUN corepack enable

COPY package.json pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY packages ./packages
COPY apps/api ./apps/api

RUN pnpm install --frozen-lockfile=false
RUN pnpm --filter @lms/db prisma:generate
RUN pnpm --filter @lms/api build

EXPOSE 4000
CMD ["pnpm", "--filter", "@lms/api", "start"]
