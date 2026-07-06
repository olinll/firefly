---
title: PostgreSQL 安装指南（Ubuntu / Docker）
slug: postgresql-install
published: 2025-01-24 00:00:00
updated: 2025-01-24 00:00:00
description: 介绍在 Ubuntu 上二进制安装 PostgreSQL 14 及使用 Docker Compose 部署的方式，包括修改数据目录和密码等基础配置。
image: api
category: 中间件
tags: ["PostgreSQL", "数据库"]
draft: false
# pinned: false
---

## 一、Ubuntu 二进制安装

```bash
# 安装 PostgreSQL 14
apt install -y postgresql-14

# 查看服务状态
systemctl status postgresql
```

### 修改数据库密码

```bash
# 切换到 postgres 用户并登录
su - postgres
psql

# 或直接以 root 身份登录
psql -U postgres
```

```sql
-- 修改密码
ALTER USER postgres WITH PASSWORD 'your-password';
```

## 二、Docker Compose 部署

适合测试环境，可在一台主机运行多个 PostgreSQL 实例：

```yaml title="docker-compose.yml"
services:
  pgsql:
    image: postgres:14
    container_name: postgres
    restart: always
    command: >
      postgres
      -c config_file=/etc/postgresql/postgresql.conf
      -c hba_file=/etc/postgresql/pg_hba.conf
    environment:
      POSTGRES_PASSWORD: Passwd@2026
      TZ: Asia/Shanghai
    ports:
      - "5432:5432"
    volumes:
      - /opt/pgsql/data:/var/lib/postgresql/data
      - /opt/pgsql/config/postgresql.conf:/etc/postgresql/postgresql.conf:ro
      - /opt/pgsql/config/pg_hba.conf:/etc/postgresql/pg_hba.conf:ro
    networks:
      - app-net

networks:
  app-net:
    external: true
```
