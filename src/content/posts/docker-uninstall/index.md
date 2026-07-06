---
title: Docker 卸载指南
slug: docker-uninstall
published: 2025-02-01 00:00:00
updated: 2025-02-01 00:00:00
description: 介绍在 Ubuntu 和 CentOS/RHEL 系统上完整卸载 Docker 的步骤，包括停止服务、移除软件包、清理残留文件和目录。
image: api
category: 容器虚拟化
tags: ["Docker", "运维"]
draft: false
# pinned: false
---

> [!CAUTION]
> 卸载前请确认是否需要保留容器、镜像、卷或配置文件，以下操作将**永久删除**所有 Docker 数据。

## Ubuntu / Debian

```bash
# 1. 停止 Docker 相关服务
sudo systemctl stop docker docker.socket containerd.service

# 2. 移除 Docker 包
sudo apt purge -y docker-ce docker-ce-cli containerd.io docker-compose-plugin docker-scan-plugin
sudo apt autoremove -y

# 3. 删除残留文件与目录
sudo rm -rf /var/lib/docker /var/lib/containerd
sudo rm -rf /etc/docker /etc/default/docker
rm -rf ~/.docker
sudo rm -rf /var/log/docker /var/log/containerd
```

## CentOS / RHEL

```bash
# 1. 停止服务
sudo systemctl stop docker containerd
sudo systemctl disable docker containerd

# 2. 移除 Docker 包
sudo yum remove -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
sudo yum autoremove -y

# 3. 清理残留文件
sudo rm -rf /var/lib/docker /var/lib/containerd /etc/docker ~/.docker
sudo rm -rf /usr/lib/systemd/system/docker.service /usr/lib/systemd/system/docker.socket
sudo systemctl daemon-reload
```
