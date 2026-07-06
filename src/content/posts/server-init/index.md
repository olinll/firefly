---
title: 服务器初始化完整配置流程
slug: server-init
published: 2025-02-13 00:00:00
updated: 2025-02-13 00:00:00
description: 记录生产环境服务器从零开始的完整初始化流程，包括换源、时区配置、K8s 集群搭建、MinIO、Redis 集群、MySQL 单节点安装。
image: api
category: 系统运维
tags: ["运维", "Linux", "Homelab"]
draft: false
# pinned: false
---

本文记录生产环境服务器的完整初始化配置流程，适用于新机器的快速上线。

## 1. 基础配置

```shell
hostnamectl set-hostname your-hostname
vim /etc/hosts
```

## 2. 换源

根据发行版替换为国内镜像源（阿里云 / 腾讯云 / 清华 TUNA）。

## 3. 时区配置

```shell
timedatectl set-timezone Asia/Shanghai
timedatectl status
```

## 4. 安装 K8s 集群（KubeSphere 离线）

> [!NOTE]
> K8s 集群使用 Harbor 作为私有镜像仓库，安装参见：[Harbor 私有镜像仓库安装指南](/posts/harbor-install/)

```shell
apt install -y socat conntrack

mkdir -p /etc/docker
cat > /etc/docker/daemon.json <<'EOF'
{
  "log-opts": { "max-size": "5m", "max-file": "3" },
  "exec-opts": ["native.cgroupdriver=systemd"],
  "data-root": "/opt/docker"
}
EOF

./kk init registry -f config.yaml -a kubesphere-4.1.tar.gz
sh create_project_harbor.sh
./kk artifact image push -f config.yaml -a kubesphere-4.1.tar.gz
./kk create cluster -f config.yaml -a kubesphere-4.1.tar.gz --with-local-storage

helm upgrade --install -n kubesphere-system --create-namespace ks-core ks-core-1.1.3.tgz \
  --set global.imageRegistry=harbor.local/ks \
  --set extension.imageRegistry=harbor.local/ks \
  --debug --wait
```

## 5. 安装 MinIO

```shell
wget https://dl.min.io/server/minio/release/linux-amd64/archive/minio.RELEASE.2025-04-22T22-12-26Z
mkdir -p /opt/minio
mv minio.RELEASE.2025-04-22T22-12-26Z /opt/minio/minio
chmod +x /opt/minio/minio
systemctl daemon-reload
systemctl enable --now minio
systemctl status minio
```

详细安装步骤参见：[MinIO 安装指南](/posts/02-apps/2026-02-01-minio-install/)

## 6. 搭建 Redis 集群（3 主 3 从）

> [!NOTE]
> 单机 Redis 编译安装参见：[CentOS 编译安装 Redis 6.2](/posts/centos-redis-install/)

```bash
wget https://download.redis.io/releases/redis-7.4.6.tar.gz
tar -zxvf redis-7.4.6.tar.gz
apt install gcc make -y
cd redis-7.4.6 && make && sudo make install

mkdir -p /opt/redis/cluster/{7001,7002}

# 启动所有实例后建集群
redis-cli --cluster create \
  node1:7001 node2:7001 node3:7001 \
  node1:7002 node2:7002 node3:7002 \
  --cluster-replicas 1 -a your-password

redis-cli -c -h node1 -p 7001 -a your-password cluster nodes
```

## 7. 安装 MySQL 8.1（Ubuntu）

> [!NOTE]
> 更详细的 MySQL 8.1 安装配置（含外部访问、数据目录迁移）参见：[Ubuntu MySQL 8.1 安装指南](/posts/ubuntu-mysql-81/)

```shell
wget https://downloads.mysql.com/archives/get/p/23/file/mysql-server_8.1.0-1ubuntu22.04_amd64.deb-bundle.tar
tar -xf mysql-server_8.1.0-1ubuntu22.04_amd64.deb-bundle.tar

apt install ./mysql-common_8.1.0-*.deb \
  ./mysql-community-client-plugins_8.1.0-*.deb \
  ./libmysqlclient22_8.1.0-*.deb \
  ./mysql-community-client-core_8.1.0-*.deb \
  ./mysql-community-client_8.1.0-*.deb \
  ./mysql-community-server-core_8.1.0-*.deb \
  ./mysql-community-server_8.1.0-*.deb

# 修改数据目录
vim /etc/mysql/mysql.conf.d/mysqld.cnf
# datadir = /opt/mysql/data

vim /etc/apparmor.d/usr.sbin.mysqld
# 添加：/opt/mysql/ r,  /opt/mysql/** rwk,

systemctl reload apparmor
mkdir -p /opt/mysql && chown -R mysql:mysql /opt/mysql
```

> [!WARNING]
> `--initialize-insecure` 会创建无密码的 root 账户，初始化完成后必须立即设置 root 密码。

```shell
sudo -u mysql mysqld --initialize-insecure --user=mysql --datadir=/opt/mysql/data
systemctl start mysql && systemctl enable mysql
```

## 编辑建议

> 以下建议基于本条目内容生成，仅供发布前参考。

### 文章内容建议
- 建议补充"4. 换源"小节的具体命令模板：当前只写了"根据发行版替换为国内镜像源（阿里云/腾讯云/清华 TUNA）"，对新手来说不够具体；可以直接放一段 `sed` 替换模板或 `apt/yum` 源切换脚本。
- 第五节"安装 KubeSphere 离线"和"第六节安装 MinIO / 第七节 Redis 集群"职责差异很大，建议把本文定位为"索引文章"：每节只列关键命令 + 外链到独立文章（`harbor-install`、`minio-install`、`centos-redis-install`、`ubuntu-mysql-81`），与现有链接关系一致。
- 建议在文首加一个流程图/时序图：从裸机 → hosts/时区 → 换源 → K8s → MinIO/Redis/MySQL 的部署顺序，避免读者把数据库装在 K8s 之上导致路径冲突。
- 第二节"基础配置"和第三节"时区配置"应该和 `chrony-time-sync`、`alpine-install-config` 中的"校时"等小节合并为 `linux-post-install-checklist` 单篇，避免每次装系统都写一遍。

### 修改建议
- `cat > /etc/docker/daemon.json <<'EOF'` 之后没有 `daemon-reload` 与 `systemctl restart docker`；K8s 安装前 docker 必须重启生效，建议补充。
- MySQL 数据目录迁移到 `/opt/mysql/data` 后，没有 `mysql_upgrade` 或新实例初始化后再迁移数据的说明；建议补一段"数据迁移"和"全新初始化"两种场景分支。
- 文中"Redis 集群 3 主 3 从"代码块用了 `apt install gcc make`，但前置已经假设是 Ubuntu；如果读者用 CentOS/RHEL 则要 `yum install gcc make`，建议在标题或注释中标注"以下命令以 Ubuntu 为例"。

### 合并建议
- 候选合并对象：`chrony-time-sync`（时区/校时基础配置重复）、`centos-install-config` / `ubuntu-install-config`（换源、时区、SELinux 关闭等初始化步骤重复）
- 合并理由：本文本质是"服务器初始化"流程汇总，建议保留作为索引页，主体内容拆为：`linux-post-install-checklist`（基础配置 + 换源 + 时区）、`k8s-kubesphere-offline-install`（K8s + Harbor + KubeSphere）、`minio-cluster-deploy`（MinIO/Redis 集群）三篇独立文章。

### slug 建议
- 当前：`server-init`
- 建议：保留
- 理由：slug 简洁且与"服务器初始化"主题强对位；但建议在后续重构中改名为 `server-init-playbook` 或 `homelab-init-runbook` 以便和其他"安装指南"区分。

### 分类建议
- 建议归类到：系统
- 理由：本文内容（基础配置、换源、时区、Docker、MinIO、Redis、MySQL 安装）属于"系统初始化 + 基础服务部署"范畴，与新分类"系统"中的"OS 安装、初始化、底层工具、脚本"对应；尽管涉及 K8s 和中间件，但目前 K8s 章节只列了 3 行命令，并没真正展开。

### tags 建议
- 建议：`[Linux, 初始化, 部署]`
- 与现状对比：`["运维", "Linux", "Homelab"]`，差异说明：原 tags 中"运维"过于宽泛、"Homelab" 仅是场景说明；改为更聚焦的"初始化"+"部署"两个主题词，便于在标签云中聚合同类文章。

### 其他建议
- 建议在文末加一段"机器清单模板"：每台机器装好后填一份（hostname/IP/role/初始化完成时间/责任人），方便后续维护。
- K8s 章节的 `kk` 命令（KubeKey）路径不清晰，建议补一句前置要求："请先下载 KubeKey 4.1 二进制并放置到 `/usr/local/bin/kk`"；否则新读者会卡在这一步。