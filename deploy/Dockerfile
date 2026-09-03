# 多阶段构建:node 基础镜像跑 Vite 构建,nginx 静态服务运行;构建上下文 = 仓库根
FROM node:22-alpine AS build
WORKDIR /app
ARG NPM_REGISTRY=https://registry.npmjs.org
COPY bestiary/package.json bestiary/package-lock.json ./
RUN npm config set registry $NPM_REGISTRY && npm ci --no-audit --no-fund
COPY bestiary/ .
# 资产管线(images/ + enemies.json → public/img,回写 index.json 的 image 字段);public/img 不在 git,必须在镜像内生成
RUN npm run build
RUN npm run ui-build

FROM nginx:alpine
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
