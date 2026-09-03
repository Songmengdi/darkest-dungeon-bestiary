# 多阶段构建:node 基础镜像跑 Vite 构建,nginx 静态服务运行
FROM node:22-alpine AS build
WORKDIR /app
ARG NPM_REGISTRY=https://registry.npmjs.org
COPY package.json package-lock.json ./
RUN npm config set registry $NPM_REGISTRY && npm ci --no-audit --no-fund
COPY . .
RUN npm run ui-build

FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
