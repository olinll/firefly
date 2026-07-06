---
title: Linux 手动安装 JDK 1.8 并配置环境变量
slug: jdk-install
published: 2025-01-05 00:00:00
updated: 2025-01-05 00:00:00
description: 通过下载 tar.gz 包手动安装 JDK 1.8，配置 JAVA_HOME 等环境变量，适用于 CentOS、Debian、Ubuntu 等主流发行版。
image: api
category: 中间件
tags: ["JDK", "Java", "环境配置"]
draft: false
# pinned: false
---

一般情况下推荐直接下载 tar.gz 包配置环境变量，而不是通过包管理器安装，便于管理多个 JDK 版本。

## 一、下载解压

```bash
# 下载 JDK 1.8
# 华为云官方地址
wget https://repo.huaweicloud.com/java/jdk/8u201-b09/jdk-8u201-linux-x64.tar.gz

# 解压并移动到 /opt
tar -zxvf jdk-8u201-linux-x64.tar.gz
mv jdk1.8.0_201 /opt/jdk1.8/
```

## 二、配置环境变量

```bash
# 编辑系统环境变量
vim /etc/profile

# 在文件末尾追加以下内容
# Java 1.8
export JAVA_HOME=/opt/jdk1.8
export PATH=$JAVA_HOME/bin:$PATH
export CLASSPATH=.:$JAVA_HOME/lib/dt.jar:$JAVA_HOME/lib/tools.jar

# 使配置立即生效
source /etc/profile

# 验证安装，显示版本号即成功
java -version
```

```bash
# 预期输出
java version "1.8.0_201"
Java(TM) SE Runtime Environment (build 1.8.0_201-b09)
Java HotSpot(TM) 64-Bit Server VM (build 25.201-b09, mixed mode)
```

> [!TIP]
> 如果服务器上需要同时管理多个 JDK 版本，可以将不同版本分别解压到 `/opt/jdk1.8/`、`/opt/jdk11/`、`/opt/jdk17/` 等目录，通过修改 `JAVA_HOME` 快速切换。
