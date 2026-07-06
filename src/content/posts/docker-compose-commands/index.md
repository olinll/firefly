---
title: Docker Compose 常用命令
slug: docker-compose-commands
published: 2025-01-29 00:00:00
updated: 2025-01-29 00:00:00
description: 整理 Docker Compose 最常用的启动、停止、重建等命令，适合日常快速查阅。
image: api
category: 容器虚拟化
tags: ["Docker", "Docker Compose"]
draft: false
# pinned: false
---

```bash
# 前台启动（查看日志输出）
docker-compose up

# 后台启动
docker-compose up -d

# 停止并移除容器
docker-compose down

# 重建镜像后启动
docker-compose up -d --build

# 查看容器状态
docker-compose ps

# 查看日志
docker-compose logs -f

# 重启指定服务
docker-compose restart <service>

# 进入容器
docker-compose exec <service> /bin/bash
```
