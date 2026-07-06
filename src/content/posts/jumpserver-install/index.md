---
title: JumpServer 开源堡垒机安装指南
slug: jumpserver-install
published: 2025-02-12 00:00:00
updated: 2025-02-12 00:00:00
description: JumpServer 是由开源中国团队使用 Python 开发的开源堡垒机，遵循 Apache 2.0 协议。适合企业级运维安全审计，支持服务器、网络设备、云资源的集中管理与操作审计。
image: api
category: HomeLab
tags: ["JumpServer", "堡垒机", "运维", "Homelab"]
draft: false
# pinned: false
---

JumpServer 是由开源中国团队使用 Python 开发的开源堡垒机，遵循 Apache 2.0 协议。适合企业级运维安全审计，支持服务器、网络设备、云资源的集中管理与操作审计。

- 官网：[jumpserver.org](https://www.jumpserver.org/)
- 文档：[JumpServer 使用文档 v4](https://docs.jumpserver.org/zh/v4/)

## 部署

> [!WARNING]
>
> 不推荐在已有业务的机器上部署，建议使用干净的专用机器。

**最低硬件配置：** 2 核 CPU / 8G 内存 / 60G 硬盘

参考官方文档进行安装：[Linux 单机部署](https://docs.jumpserver.org/zh/v4/installation/setup_linux_standalone/requirements/)

## 常见问题

### Redis 启动失败（Memory overcommit）

如果 Redis 容器无法启动并报以下错误：

```
WARNING Memory overcommit must be enabled!
```

执行以下命令修复：

```shell
echo 'vm.overcommit_memory = 1' | sudo tee -a /etc/sysctl.conf
sysctl -p
```

### Windows 远程应用无法连接 RDP

如果资产设置了 RDP 连接要求使用 SSL 连接层，需在 JumpServer 中创建自定义平台模板：

1. 进入 **资产管理 → 平台列表**，创建新平台
2. 名称：`Windows-SSL`，基础：`Windows`，编码：`UTF-8`
3. RDP security：`TLS`
4. 提交后，将对应资产的系统平台修改为 `Windows-SSL`

详见：[远程应用 - JumpServer 文档](https://docs.jumpserver.org/zh/v4/manual/admin/system_settings/remote_apps/)
