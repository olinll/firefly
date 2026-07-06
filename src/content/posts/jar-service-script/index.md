---
title: Linux 管理 JAR 服务的 Shell 脚本
slug: jar-service-script
published: 2025-01-02 00:00:00
updated: 2025-01-02 00:00:00
description: 提供一个开箱即用的 Shell 脚本，用于管理 Java JAR 包服务的启动、停止、重启与状态查看，适合生产环境部署。
image: api
category: 系统运维
tags: ["Linux", "运维", "Shell", "Java"]
draft: false
# pinned: false
---

在生产环境中直接用 `java -jar` 启动服务不便管理，以下脚本封装了 start / stop / restart / status 四个操作，支持后台运行。

> 尚未安装 JDK？参见 [Linux 手动安装 JDK 1.8 并配置环境变量](/posts/jdk-install/)

## 使用方法

```bash
sh server.sh start    # 启动服务
sh server.sh status   # 查看状态
sh server.sh stop     # 停止服务
sh server.sh restart  # 重启服务
```

## 脚本内容

将以下内容保存为 `server.sh`，修改顶部的 `APP_NAME` 和 `APP_PATH` 为实际值：

```bash title="server.sh"
#!/bin/bash

# 修改为实际的 JAR 文件名（不含路径）
APP_NAME=app.jar
# 修改为 JAR 文件所在目录
APP_PATH=/opt/app/jar

usage() {
    echo "Usage: sh server.sh [start|stop|restart|status]"
    exit 1
}

is_exist() {
    pid=$(ps -ef | grep $APP_NAME | grep -v grep | awk '{print $2}')
    if [ -z "${pid}" ]; then
        return 1
    else
        return 0
    fi
}

start_log() {
    is_exist
    if [ $? -eq 0 ]; then
        echo "${APP_NAME} 启动成功！pid=${pid}"
    else
        echo "${APP_NAME} 启动失败，请检查后重试"
    fi
}

start() {
    is_exist
    if [ $? -eq 0 ]; then
        echo "${APP_NAME} is already running. pid=${pid}"
    else
        nohup java -jar ${APP_PATH}/${APP_NAME} > /dev/null 2>&1 &
        start_log
    fi
}

stop() {
    is_exist
    if [ $? -eq 0 ]; then
        kill -9 $pid
        echo "${APP_NAME} 已关闭！pid=${pid}"
    else
        echo "${APP_NAME} is not running"
    fi
}

status() {
    is_exist
    if [ $? -eq 0 ]; then
        echo "${APP_NAME} is running. Pid is ${pid}"
    else
        echo "${APP_NAME} is not running."
    fi
}

restart() {
    stop
    echo "${APP_NAME} 准备重启..."
    sleep 5
    start
}

case "$1" in
    "start")   start   ;;
    "stop")    stop    ;;
    "status")  status  ;;
    "restart") restart ;;
    *)         usage   ;;
esac
```

> [!TIP]
> 如果 JAR 包名称包含版本号等动态部分（如 `app-1.0.0.20240101.jar`），可将 `APP_NAME` 设置为固定前缀，并将启动命令改为：
>
> ```bash
> nohup java -jar ${APP_PATH}/${APP_NAME}*.jar > /dev/null 2>&1 &
> ```

## 赋予执行权限

```bash
chmod +x server.sh
```

## 编辑建议

> 以下建议基于本条目内容生成，仅供发布前参考。

### 文章内容建议
- 建议补充"日志与 GC 参数注入"小节：当前 `nohup java -jar ... > /dev/null 2>&1 &` 把所有输出丢弃，生产场景应输出到 `${APP_PATH}/logs/app.$(date +%Y%m%d).log`；并建议加上 `-Xms512m -Xmx512m -XX:+UseG1GC` 等 JVM 参数范例。
- 建议补一段"systemd 服务化"对照：用 `systemd unit` 替代 shell 脚本的方案（含 `Restart=always`、`User=`、`WorkingDirectory=` 等字段），现代 Linux 推荐用 systemd 托管 Java 进程。
- 当前 stop 函数使用 `kill -9`，会跳过 JVM 清理逻辑（关闭 socket、flush buffer）；建议先 `kill -15` 等 30 秒，无响应再 `kill -9`，并在文末增加一行优雅停机配置。
- 缺少"健康检查"和"启动等待超时"逻辑：start 之后直接打"启动成功"是检查 `is_exist` 是否拿到 pid，进程可能在加载一半就崩了；建议加 30 秒内轮询健康接口或日志关键字。

### 修改建议
- `nohup java -jar ${APP_PATH}/${APP_NAME} > /dev/null 2>&1 &` 缺少数组引号包裹，若 `APP_NAME` 含空格会出问题；建议用 `"${APP_PATH}/${APP_NAME}"`。
- `is_exist()` 用 `awk '{print $2}'` 取 PID，但 `ps -ef` 输出列在不同 locale 下可能错位（虽然 PID 是第 2 列基本稳定）；建议改为 `pgrep -f "$APP_NAME"` 更稳健。
- 重启逻辑 `sleep 5` 是写死的，生产场景 JVM 启动 + 注册到注册中心可能需要 30-60 秒；建议把 sleep 时长做成可配置 `START_WAIT=30`。

### 合并建议
- 候选合并对象：`jdk-install`（前置依赖，文中已外链）、`log-cleanup-script`（都是 shell 脚本工具，但无合并价值）
- 合并理由：本文是单文件教程，无需合并；但建议在站内新建"shell-ops-toolkit"系列（`jar-service-script`、`log-cleanup-script`、`jdk-install`）并加导航。

### slug 建议
- 当前：`jar-service-script`
- 建议：保留
- 理由：slug 准确表达"管理 JAR 服务的 Shell 脚本"，与同系列 `log-cleanup-script` 命名风格一致。

### 分类建议
- 建议归类到：系统
- 理由：内容是 shell 脚本模板（start/stop/restart/status），与新分类"系统"中的"脚本"对应；不是"开发"（不是构建工具或 IDE 集成），也不是"服务"（不涉及具体应用部署流程）。

### tags 建议
- 建议：`[Shell, JAR, 服务管理]`
- 与现状对比：`["Linux", "运维", "Shell", "Java"]`，差异说明：原 tags 中"Linux"+"运维"过于宽泛且与多文重复；保留"Shell"作为技术名，新增"JAR"和"服务管理"作为更精准的主题词（"Java"作为语言名覆盖面过广，不如"JAR"具体）。

### 其他建议
- 建议在文末加一段"与 Spring Boot BootJar 对比"小节：现代 Spring Boot 应用有 `spring-boot-maven-plugin` 生成的 boot jar 与传统 fat jar 在启动方式、Class-Path 行为上的差异，提示读者注意 `-jar` 入口选择。
- 当前没有"开机自启"和"systemd unit"部分，建议补充一个 `jar.service` 模板文件，标注"生产环境推荐 systemd 方案"。
