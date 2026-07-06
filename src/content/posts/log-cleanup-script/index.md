---
title: Linux 定期清理日志文件脚本（Crontab）
slug: log-cleanup-script
published: 2025-01-01 00:00:00
updated: 2025-01-01 00:00:00
description: 使用 Shell 脚本结合 Crontab 定期清理 Linux 服务器上的过期日志文件，防止磁盘空间被日志耗尽。
image: api
category: 系统运维
tags: ["Linux", "运维", "Shell", "Crontab"]
draft: false
# pinned: false
---

日志文件不断累积会耗尽磁盘空间，影响服务稳定性。通过 Shell 脚本 + Crontab 可以自动清理超过指定天数的旧日志，同时保留近期日志以便问题追溯。

## 清理脚本

将以下内容保存为 `/app/clear-logfile.sh`，按需修改日志目录和保留天数：

```bash title="/app/clear-logfile.sh"
#!/bin/bash

# 日志目录（修改为实际路径）
LOG_DIR=/opt/app/logs
# 保留最近 N 天的日志
KEEP_DAYS=7

echo "开始清理日志..."

# 查找并删除超过 KEEP_DAYS 天的 .log 文件
find ${LOG_DIR}/* -mtime +${KEEP_DAYS} -name "*.log" -exec rm -rf {} + 2>&1

echo "日志清理完成"
```

> [!TIP]
> `find` 命令参数说明：
>
> - `-mtime +7`：查找 7 天前修改的文件
> - `-name "*.log"`：只匹配 `.log` 文件，可改为 `*` 匹配所有文件
> - `-exec rm -rf {} +`：批量删除匹配到的文件

## 赋予执行权限

```bash
chmod +x /app/clear-logfile.sh
```

## 配置 Crontab 定时执行

```bash
crontab -e
```

添加以下内容（每天 23:00 执行）：

```bash
0 23 * * * /app/clear-logfile.sh
```

常用 Crontab 时间格式参考：

| 表达式 | 含义 |
|---|---|
| `0 23 * * *` | 每天 23:00 |
| `0 */6 * * *` | 每 6 小时 |
| `0 0 * * 0` | 每周日 00:00 |
| `0 0 1 * *` | 每月 1 日 00:00 |

```bash
# 查看已配置的定时任务
crontab -l
```

## 编辑建议

> 以下建议基于本条目内容生成，仅供发布前参考。

### 文章内容建议
- 建议补充"日志压缩保留"小节：当前脚本是直接 `rm -rf`，对大流量服务的近期日志（如近 7 天）建议用 `gzip` 压缩后再保留，可显著降低磁盘占用；用 `find ... -exec gzip {} +` 即可。
- 建议补充"按大小清理"的替代方案：`find ${LOG_DIR} -type f -size +500M -delete`，适合日志突增场景；并给出"按天数 vs 按大小"两种策略的选型建议。
- 建议补一段"日志轮转（logrotate）原生方案"作为对比：`/etc/logrotate.d/` 是 Linux 自带机制，90% 场景不需要自己写脚本；可以与本文脚本并存为"二、logrotate 推荐 / 三、自定义脚本兜底"。
- 当前脚本里 `LOG_DIR=/opt/app/logs` 是写死的；建议补一句"如果是多目录清理，可改为 `for d in /opt/app/*/logs; do ... done` 循环"。

### 修改建议
- `find ${LOG_DIR}/* -mtime +${KEEP_DAYS} -name "*.log" -exec rm -rf {} +` 用了 `rm -rf`（带 `-r` 递归）匹配的是文件、不是目录，使用 `-r` 是多余且有误导性（文件不需要递归）；建议改为 `rm -f`。
- 脚本中 `find ${LOG_DIR}/* -mtime +7` 没有引号包裹变量；若路径含空格（如 `/opt/My App/logs`）会报错；建议改为 `find "${LOG_DIR}"/* ...`，并对 `${LOG_DIR}` 加引号兜底。
- 缺少错误处理：脚本退出码始终为 0，crontab 日志里看不出成败；建议末尾加 `exit $?` 或在 `find` 失败时 `exit 1`，便于监控/告警集成。

### 合并建议
- 候选合并对象：`log-cleanup-script`（自身就是独立文章，无强合并需求）、`jar-service-script`（同属 shell 脚本工具，可考虑归入"linux-shell-toolkit" 系列）
- 合并理由：本文单议题清晰（清理日志），不建议与 `jar-service-script` 合并；但建议与"logrotate 教程"（如有）做"原生方案 vs 自定义脚本"的二选一对照表，方便读者决策。如暂无 logrotate 文章，可在文末加"延伸阅读"位。

### slug 建议
- 当前：`log-cleanup-script`
- 建议：保留
- 理由：slug 准确表达"日志清理 + 脚本"两要素，命名风格与 `jar-service-script`、`chrony-time-sync` 一致。

### 分类建议
- 建议归类到：系统
- 理由：内容是 Linux 基础运维脚本（find + crontab），与新分类"系统"中的"脚本"对应；不是"开发"（不是 IDE/代码片段/构建工具），也不是"服务"（不涉及具体应用的日志管理）。

### tags 建议
- 建议：`[Shell, 日志清理, Crontab]`
- 与现状对比：`["Linux", "运维", "Shell", "Crontab"]`，差异说明：原 tags 中"Linux"+"运维"过于宽泛且与多文重复；改用"日志清理"作为主题词（精准描述文章功能），保留 Shell/Crontab 作为技术名。

### 其他建议
- 建议在文末加一个"容器日志清理"小节：Docker 默认日志驱动 json-file 不配置 rotate 也会撑爆磁盘，给一条 `logrotate.d/docker` 配置 + 引用 `docker-uninstall` 或 `docker-guide` 文中相关章节。
- 脚本建议提供 systemd timer 替代 crontab 的版本（`OnCalendar=daily` + `Persistent=true`），现代 Linux 发行版更推荐 timer。
