# 部署

生产镜像:`registry.cn-hangzhou.aliyuncs.com/songm_d/dd1-bestiary`(ACR 旧版个人版,公开仓库)。
生产环境:home03(root@192.168.0.3),容器 `dd1-bestiary`,8899 → 80,源码与部署文件在 `/opt/bestiary-repo/`。

## 常规发布(CI 自动构建)

push 到 `main` 触发 [docker-publish.yml](../.github/workflows/docker-publish.yml):
构建并推送 `latest` + `sha-<短哈希>` 双标签(sha 标签用于回滚定位)。
前提:仓库 secrets `ACR_USERNAME` / `ACR_PASSWORD`(阿里云 ACR 固定登录密码,非 RAM AccessKey)。

服务器端拉取更新:

```bash
ssh root@192.168.0.3
cd /opt/bestiary-repo/deploy
docker compose pull && docker compose up -d
```

## 本机构建推送(绕过 CI)

```bash
docker build -f deploy/Dockerfile \
  -t registry.cn-hangzhou.aliyuncs.com/songm_d/dd1-bestiary:latest .
docker push registry.cn-hangzhou.aliyuncs.com/songm_d/dd1-bestiary:latest
```

之后服务器端同上 `pull && up -d`。临时验证可推 `:dev` 标签,在 03 上
`docker run --rm -d -p 8900:80 <镜像>:dev` 冒烟,不占用 8899。

注意:构建上下文必须是**仓库根**(白名单排除项在 `deploy/Dockerfile.dockerignore`,
改排除项时 `!bestiary` 与 `!deploy` 两条不能丢)。

## 服务器源码重建(无网推送通道时的兜底)

03 上 `/opt/bestiary-repo/` 已有源码(git pull 或上传),直接:

```bash
cd /opt/bestiary-repo/deploy
docker compose up -d --build
```

## 回滚

把旧 sha 标签重新打为 `latest`,compose 无需改动:

```bash
docker pull registry.cn-hangzhou.aliyuncs.com/songm_d/dd1-bestiary:sha-abc1234
docker tag  registry.cn-hangzhou.aliyuncs.com/songm_d/dd1-bestiary:sha-abc1234 \
            registry.cn-hangzhou.aliyuncs.com/songm_d/dd1-bestiary:latest
docker compose up -d
```
