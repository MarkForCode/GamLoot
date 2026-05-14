FROM node:20-alpine

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps ./apps
COPY packages ./packages

RUN pnpm install --frozen-lockfile

EXPOSE 8081
EXPOSE 19000
EXPOSE 19001
EXPOSE 19002
EXPOSE 19006

CMD ["pnpm", "--filter", "@gam/user-app", "dev", "--host", "lan", "--port", "8081"]
