---
title: MinIO 对象存储安装指南（Docker / 二进制）
slug: minio-install
published: 2025-01-20 00:00:00
updated: 2025-01-20 00:00:00
description: 介绍使用 Docker Compose 和二进制文件两种方式部署 MinIO 最后免费版本，配置 Systemd 服务实现开机自启。
image: api
category: 中间件
tags: ["MinIO", "对象存储", "Docker"]
draft: false
# pinned: false
---

MinIO 是一个兼容 Amazon S3 接口的高性能开源对象存储服务，适合存储非结构化数据（图片、视频、备份文件等）。

> [!WARNING]
> MinIO 从 `RELEASE.2025-04-22T22-12-26Z` 版本起转为收费授权，本文部署的是该最后免费版本。

官网：[https://www.minio.org.cn](https://www.minio.org.cn)

## 一、Docker Compose 部署（推荐）

```yaml title="docker-compose.yaml"
services:
  minio:
    image: minio/minio:RELEASE.2025-04-22T22-12-26Z
    container_name: minio
    hostname: minio
    ports:
      - 9000:9000   # API
      - 9001:9001   # Console
    volumes:
      - ./data:/data
    environment:
      - MINIO_ROOT_USER=admin
      - MINIO_ROOT_PASSWORD=Aa123456
    restart: always
    command: server --address ':9000' --console-address ':9001' /data
    networks:
      - app-net

networks:
  app-net:
    external: true
```

## 二、二进制文件部署

二进制文件归档下载地址：[minio-archive](https://dl.min.io/server/minio/release/linux-amd64/archive/)

### 1. 下载并配置

```bash
wget https://dl.min.io/server/minio/release/linux-amd64/archive/minio.RELEASE.2025-04-22T22-12-26Z
mkdir -p /opt/minio
mv minio.RELEASE.2025-04-22T22-12-26Z /opt/minio/minio
chmod +x /opt/minio/minio
```

### 2. 创建配置文件

```bash title="/opt/minio/minio.conf"
# 数据存放目录
MINIO_VOLUMES="/opt/minio/data"
# 端口配置：API:9000，Console:9001
MINIO_OPTS="--address :9000 --console-address :9001"
# 管理员账号
MINIO_ROOT_USER="admin"
MINIO_ROOT_PASSWORD="Aa123456"
```

### 3. 配置 Systemd 服务

```ini title="/etc/systemd/system/minio.service"
[Unit]
Description=MinIO
Documentation=https://docs.min.io
Wants=network-online.target
After=network-online.target
AssertFileIsExecutable=/opt/minio/minio

[Service]
User=root
Group=root
EnvironmentFile=/opt/minio/minio.conf
ExecStart=/opt/minio/minio server $MINIO_OPTS $MINIO_VOLUMES
Restart=always
LimitNOFILE=65536
TimeoutStopSec=infinity
SendSIGKILL=no

[Install]
WantedBy=multi-user.target
```

### 4. 启动服务

```bash
systemctl daemon-reload
systemctl enable minio
systemctl start minio
systemctl status minio
journalctl -u minio.service -f
```

> [!TIP]
> 安装完成后，建议配置存储桶安全策略防止目录泄露：[MinIO 存储桶安全策略配置](/posts/minio-bucket-policy/)
