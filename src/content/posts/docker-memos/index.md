---
title: Docker 部署 Memos 笔记服务
slug: docker-memos
published: 2025-02-02 00:00:00
updated: 2025-02-02 00:00:00
description: Memos 是一款隐私优先的轻量级笔记服务，支持 Web、Android、iOS 多端访问，支持多用户，附件存储兼容 AWS S3 协议。
image: api
category: HomeLab
tags: ["Docker", "Memos", "Homelab"]
draft: false
# pinned: false
---

Memos 是一款隐私优先的轻量级笔记服务，支持 Web、Android、iOS 多端访问，支持多用户，附件存储兼容 AWS S3 协议。

官网：[usememos.com](https://www.usememos.com) | 仓库：[usememos/memos](https://github.com/usememos/memos)

> [!NOTE]
>
> 最新版 0.25 无法直接被 iOS 客户端连接，需同时部署 Mortis 服务做兼容（提供 Memos 0.21.0 OpenAPI 支持）。

## 部署

```yaml title="docker-compose.yml"
services:
  memos:
    image: neosmemo/memos:0.25.1
    container_name: memos
    hostname: memos
    ports:
      - 5230:5230
    volumes:
      - ./data:/var/opt/memos
    restart: always
    networks:
      - app-net
  mortis:
    image: ghcr.io/mudkipme/mortis:0.25.1
    container_name: mortis
    ports:
      - "5231:5231"
    entrypoint: ["/app/mortis"]
    command: ["-grpc-addr=memos:5230"]
    restart: always
    depends_on:
      - memos
    networks:
      - app-net

networks:
  app-net:
    external: true
```

> [!NOTE]
>
> 尚未部署 MinIO？参见：[MinIO 对象存储安装指南](/posts/minio-install/)

## 配置 MinIO 附件存储

在 Memos 设置页面中填写以下信息：

| 配置项 | 说明 |
|---|---|
| 文件路径模板 | `assets/{timestamp}{filename}` |
| Access Key ID | MinIO 访问密钥 |
| Access Key Secret | MinIO 密钥 |
| Endpoint | MinIO 地址（如 `https://minio.example.com`） |
| Region | 自定义区域名（如 `memos`） |
| Bucket | 存储桶名称 |
| Use Path Style | 勾选 |
