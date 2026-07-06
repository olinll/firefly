---
title: 多个docker-compose实例共享网络
slug: docker-compose-network
published: 2025-01-25 00:00:00
updated: 2025-01-25 00:00:00
description: 让你的多个docker-compose实例共同使用一个内部网络
image: api
category: 容器虚拟化
tags: ["Docker"]
draft: false
# pinned: false
---

## 创建容器内的网络

```yaml
services:
  app:
    networks:
      - net

networks:
  net:
    driver: bridge
    name: app-network
```

## 绑定容器外的网络

> [!IMPORTANT]
> 使用 `external: true` 时，目标网络必须预先通过 `docker network create` 创建，否则 compose 启动会报错。

**这个网络必须存在**

```yaml
services:
  app:
    networks:
      - net

networks:
  net:
    external: true
    name: lin-net
```

## 绑定ip地址

```yaml
services:
  app:
    networks:
      net:
        ipv4_address: 172.20.0.102
```

## Docker网络允许外部访问

> [!WARNING]
> `iptables -A FORWARD -j ACCEPT` 会放行所有转发流量，存在安全风险。生产环境应使用更精确的 iptables 规则限制来源和目标。

```shell
# 开放
iptables -A FORWARD -j ACCEPT

yum install iptables-services
sudo service iptables save
systemctl enable iptables
systemctl start iptables
```
