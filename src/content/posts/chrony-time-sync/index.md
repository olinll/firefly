---
title: Linux 服务器时间同步配置（Chrony）
slug: chrony-time-sync
published: 2025-01-03 00:00:00
updated: 2025-01-03 00:00:00
description: 使用 Chrony 工具为 Linux 服务器配置时间同步，支持阿里云、腾讯云等国内 NTP 源及内网 NTP 服务器。
image: api
category: 系统运维
tags: ["Linux", "运维", "时间同步"]
draft: false
# pinned: false
---

> [!NOTE]
> 时间同步是服务器初始化的基础步骤之一，完整初始化流程参见：[CentOS 安装与初始化配置](/posts/centos-install-config/)

服务器时间同步非常重要，数据库、缓存、日志、监控等服务都依赖准确的时间。随着运行时间增长，系统时钟会产生漂移，建议通过 Chrony 定期同步。

## 一、设置时区

```bash
sudo timedatectl set-timezone Asia/Shanghai
```

## 二、安装 Chrony

```bash
# CentOS / RHEL
yum install -y chrony

# Ubuntu / Debian
apt install -y chrony
```

> [!TIP]
> 如果服务器无法直连公网，可先配置 HTTP 代理再安装：
>
> ```bash
> export http_proxy=http://192.168.1.87:3128
> export https_proxy=http://192.168.1.87:3128
> ```

## 三、配置 NTP 服务器

```bash title="/etc/chrony.conf"
# 内网 NTP 服务器（优先）
server 192.168.1.244 iburst

# 国内公共 NTP 源（备用）
server ntp.aliyun.com iburst
server time1.cloud.tencent.com iburst
server ntp1.aliyun.com iburst
server ntp.sjtu.edu.cn iburst
server cn.ntp.org.cn iburst
```

## 四、启动服务

```bash
systemctl enable chronyd --now
systemctl status chronyd
```

## 五、验证时间同步

```bash
# 查看同步跟踪状态
chronyc tracking

# 查看时间源列表
chronyc sources -v
```

## 六、启用 NTP 并查看状态

```bash
timedatectl set-ntp true
timedatectl
```

## 编辑建议

> 以下建议基于本条目内容生成，仅供发布前参考。

### 文章内容建议
- 建议补充"时区与 RTC（硬件时钟）"小节：`timedatectl set-local-rtc 0` 与 BIOS 时间关系，虚拟机/物理机表现差异，避免读者把 Windows + Linux 双系统时间错乱归咎到 chrony。
- 第五节"验证时间同步"建议补 `chronyc makestep` 强制立即同步（默认 chronyd 是渐进式调整），方便在初始化阶段立刻拿到正确时间。
- 第二节"安装 Chrony"只给了 yum/apt 两条命令，建议补一段"内网完全无外网"场景：用 `chronyc tracking` 验证 fallback 到内网 NTP（如 `192.168.1.244`）成功。
- 建议补一节"硬件时间同步"：`hwclock --systohc` 把系统时间写回硬件时钟，物理机断电/重启后能保持时间；虚拟机通常不需要。

### 修改建议
- 文首外链 `centos-install-config` 但 `server-init` 文中也有时区配置；建议在文末补一节"相关阅读"统一收口，避免交叉链接散落。
- `/etc/chrony.conf` 配置示例同时给了 6 个 NTP 源，按 chrony 文档建议一般配 3-4 个即可；建议精简为 `192.168.1.244` + `ntp.aliyun.com` + `time1.cloud.tencent.com` 三组，并在注释中说明"前面的优先级高、后面的为 fallback"。
- 第二节"安装 Chrony"提示中给出的 `192.168.1.87:3128` 是内网代理，建议改为占位符 `<proxy_host>:<port>` 避免暴露内网拓扑。

### 合并建议
- 候选合并对象：`alpine-install-config`（"二、5. 校时"小节内容重叠）、`ubuntu-install-config`（"3. 解决 LVM 硬盘空间减半问题"前后的时区配置）、`debian-install-config`（"三、配置系统"中的时区相关）
- 合并理由：四篇安装文档都重复了"时区 + chrony"步骤，建议把本文作为唯一来源，其他三篇改为外链 `chrony-time-sync` 即可；当前外链关系已建立，只是内文还有重复。

### slug 建议
- 当前：`chrony-time-sync`
- 建议：保留
- 理由：slug 简短、表意清晰（chrony + 时间同步）；与全站其他运维类（如 `log-cleanup-script`、`jar-service-script`）命名风格一致。

### 分类建议
- 建议归类到：系统
- 理由：内容是 Linux 底层工具（chronyd + timedatectl）的安装与配置，与新分类"系统"中的"底层工具"对应；不是"网络"（虽然 NTP 涉及网络协议），也不是"服务"（没有守护进程的深度调优）。

### tags 建议
- 建议：`[Chrony, 时间同步]`
- 与现状对比：`["Linux", "运维", "时间同步"]`，差异说明：原 tags 中"Linux"+"运维"组合过于泛化（与多文重复），改为"Chrony"作为主技术名 + "时间同步"作为主题词，简洁精准；如需补充可加 `NTP`。

### 其他建议
- 建议加一张"chronyd 同步流程"图：NTP server → chronyd → kernel clock → RTC → 应用层，体现 chronyd 与其他时间源的协作关系。
- 文中 `/etc/chrony.conf` 给的是无 `pool`/`allow`/`rtcsync` 等关键参数的精简配置，建议补一段"最小可用 vs 完整生产配置"对照，区分家用与生产场景。
