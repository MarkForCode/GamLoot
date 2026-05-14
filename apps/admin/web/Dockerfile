FROM node:20-alpine

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps ./apps
COPY packages ./packages

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @gam/admin-web build

EXPOSE 3001

CMD ["pnpm", "--filter", "@gam/admin-web", "exec", "next", "start", "-H", "0.0.0.0", "-p", "3001"]
