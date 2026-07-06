---
title: TrueNAS 全方位监控实战：Prometheus + Grafana 方案
slug: truenas-prometheus-grafana-monitoring
published: 2025-03-08 00:00:00
updated: 2025-03-08 00:00:00
description: 通过 Graphite 协议采集 TrueNAS SCALE / Core 指标，经 graphite-prometheus 转换后交由 Prometheus 存储、Grafana 可视化，搭建一套独立于 TrueNAS 自带报告的长期监控。
image: api
category: HomeLab
tags: ["TrueNAS", "TrueNAS SCALE", "Prometheus", "Grafana", "Graphite", "Docker Compose", "HomeLab", "ZFS"]
draft: false
# pinned: false
---

TrueNAS 自带的 Reporting 模块能看当前状态，但**历史数据保留有限、无法配置告警**，遇到磁盘温度异常、ZFS 池容量缓慢增长、网络流量突增这类场景就不够用了。本文搭建一套独立的 Prometheus + Grafana 监控，对 TrueNAS 做长期采集与可视化。

## 1. 架构概览

整条数据链路：

```
TrueNAS ──(Graphite 协议 @ 9109)──▶ graphite-prometheus ──(/metrics @ 9108)──▶ Prometheus ──(查询)──▶ Grafana
```

- **TrueNAS**：原生支持以 Graphite 协议向外推送系统指标（CPU、磁盘、ZFS、网络等）。
- **graphite-prometheus**：由 [Supporterino/truenas-graphite-to-prometheus](https://github.com/Supporterino/truenas-graphite-to-prometheus) 提供，把 Graphite 推送协议转换为 Prometheus 可抓取的 `/metrics` 端点。
- **Prometheus**：时序数据库，按间隔主动抓取转换器暴露的指标。
- **Grafana**：从 Prometheus 查询数据并可视化。

> [!NOTE]
> 为什么需要一个"转换器"：TrueNAS 只会 Graphite（推送模型），Prometheus 只认 HTTP pull（拉取模型）。两者协议和方向都不兼容，必须在中间夹一层 graphite-prometheus 做翻译。

## 2. 前置条件

在 TrueNAS Web UI 中启用 Graphite 上报：

**System Settings → Reporting → Exporters**（或旧版 **Reporting → Settings**）

- **Type**：`Graphite`
- **Destination**：`<监控主机 IP>:9109`
- **Separate Instances**：建议开启，便于多主机时按实例区分

开启后 TrueNAS 会以约 10 秒一次的频率向目标地址推送指标。

## 3. 编写 docker-compose.yaml

> [!NOTE]
> Docker Compose 安装与使用参见：[Docker Compose 安装配置](/posts/docker-compose-setup/)

在准备部署的宿主机上创建一个空目录，新建 `docker-compose.yaml`：

```yaml
services:
  # 时序数据库：存储监控指标
  prometheus:
    image: prom/prometheus:latest
    container_name: prometheus
    restart: unless-stopped
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus-data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.retention.time=365d'
    ports:
      - "9090:9090"
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost:9090/-/healthy"]
      interval: 30s
      timeout: 5s
      retries: 3

  # 可视化面板：看硬盘和 ZFS 状态
  grafana:
    image: grafana/grafana:latest
    container_name: grafana
    restart: unless-stopped
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=Aa123456
    ports:
      - "3000:3000"
    volumes:
      - grafana-data:/var/lib/grafana
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 5s
      retries: 3

  # TrueNAS Graphite → Prometheus 转换服务
  graphite-prometheus:
    image: ghcr.io/supporterino/truenas-graphite-to-prometheus:latest
    container_name: graphite-prometheus
    restart: unless-stopped
    ports:
      - "9109:9109/tcp"   # Graphite 接收端（TrueNAS 推送，TCP）
      - "9109:9109/udp"   # Graphite 接收端（TrueNAS 推送，UDP）
      - "9108:9108/tcp"   # Prometheus 抓取端
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost:9108/metrics"]
      interval: 30s
      timeout: 5s
      retries: 3

volumes:
  prometheus-data:
  grafana-data:
```

> [!TIP]
> 关于镜像加速：上面使用的都是官方镜像地址（`prom/...`、`grafana/...`、`ghcr.io/...`）。在国内网络环境下如果拉取缓慢或失败，可使用你自己的镜像加速服务，把域名前缀加在 image 前即可，例如：`your-accel.example.com/prom/prometheus:latest`。**请不要直接使用别人的私有加速域名**，可能随时失效或泄露他人 token。

## 4. 编写 prometheus.yml

在同一目录下创建 `prometheus.yml`：

```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'truenas'
    scrape_interval: 10s
    static_configs:
      - targets: ['10.0.0.16:9108']
    relabel_configs:
      - target_label: instance
        replacement: 'truenas'
```

> [!IMPORTANT]
> 请替换为你的实际 IP：把 `10.0.0.16` 替换为**运行 graphite-prometheus 容器的宿主机 IP**。如果 Prometheus 与 graphite-prometheus 在同一个 compose 网络里，也可以直接用 `graphite-prometheus:9108` 服务名互访。

## 5. 配置项说明

下面逐项解释上述配置背后的考量，遇到问题或要做调整时可以对照。

### 5.1 `storage.tsdb.retention.time=365d`

Prometheus 默认只保留 15 天数据。这里保留 **365 天（一整年）**，方便做磁盘温度、SMART、ZFS 容量等长周期趋势分析。一年的数据大约占用 10–30 GB（视指标数量和抓取频率），需要为 `prometheus-data` 卷预留足够磁盘空间。如果磁盘紧张可以酌情缩短到 90d / 180d。

### 5.2 `scrape_interval: 10s`

Prometheus 全局 `scrape_interval` 用官方推荐的 15s，但对 TrueNAS 这个 job **单独覆盖为 10s**，对齐 TrueNAS Graphite 上报频率——更高的频率（比如 1s）会产生大量重复值、白白撑大 TSDB；更低则会漏点。

### 5.3 镜像均固定为 `:latest`

所有镜像都显式写了 `:latest`，不省略 tag。省略 tag 虽然默认也是 `latest`，但显式写出更清晰，避免与工具链（如 Watchtower、Renovate）交互时产生歧义。**生产环境**建议进一步固定到具体版本号（如 `prom/prometheus:v2.54.0`），防止上游突然大版本升级带来破坏性变更。

### 5.4 端口协议（9109 / 9108）

graphite-prometheus 的 9109 是 Graphite 协议接收端，Graphite 协议**同时支持 TCP 明文和 UDP 明文**。Docker Compose 的 `"9109:9109"` 默认只映射 TCP——如果 TrueNAS 配的是 UDP 推送，会出现"TrueNAS 发得出去但转换器收不到"的隐蔽问题。**这里同时显式映射 `/tcp` 和 `/udp`，一次避免两种场景的坑**。9108 是 Prometheus 抓取端，只走 HTTP/TCP。

### 5.5 Grafana 默认密码 `Aa123456`

这个密码**仅为演示方便**，强度非常弱。部署完成后请**立即登录 Grafana 改成复杂密码**（推荐 16 位以上、包含大小写字母 + 数字 + 符号）。更规范的做法是把密码放在 `.env` 文件并用 `${GF_SECURITY_ADMIN_PASSWORD}` 从 compose 读取，避免明文写入版本库。

### 5.6 Healthcheck

三个服务都加了 healthcheck，每 30 秒探测一次：

- **prometheus**：`/-/healthy` 端点
- **grafana**：`/api/health` 端点
- **graphite-prometheus**：`/metrics` 端点（能返回即视为存活）

配合 `restart: unless-stopped`，容器进程挂掉或卡死时能被自动重启。可以用 `docker compose ps` 查看每个服务的健康状态。

## 6. 启动与验证

### 6.1 启动容器

```bash
docker compose up -d
docker compose ps
```

三个容器的 `STATUS` 列应当显示为 `running (healthy)`。

### 6.2 端口与访问地址

| 端口 | 服务 | 用途 |
|------|------|------|
| 3000 | Grafana | 可视化 Web UI（默认用户 `admin`） |
| 9090 | Prometheus | Prometheus Web UI（查询 + 查看 target 状态） |
| 9108 | graphite-prometheus | `/metrics` 端点，Prometheus 从这里抓 |
| 9109 | graphite-prometheus | Graphite 协议接收端，TrueNAS 推到这里 |

### 6.3 确认数据链路通了

1. 浏览器打开 `http://<服务器 IP>:9090/targets`，`truenas` job 的 state 应当为 **UP**。
2. 打开 `http://<服务器 IP>:9090/graph`，在查询框搜 `truenas_`，能看到一堆以 `truenas_` 开头的指标，说明转换器在正常工作。
3. 如果 target 一直 `DOWN`：先看 graphite-prometheus 的日志 `docker logs graphite-prometheus`，通常是 TrueNAS 没推数据、或目标 IP/端口写错。

## 7. 导入推荐的 Grafana 仪表板

项目作者提供了一份现成的 TrueNAS SCALE 仪表板：

👉 **[truenas_scale.json](https://github.com/Supporterino/truenas-graphite-to-prometheus/blob/main/dashboards/truenas_scale.json)**

导入步骤：

1. 登录 Grafana (`http://<服务器 IP>:3000`)。**首次使用需要添加 Prometheus 数据源**：
   - 侧栏 → **Connections → Data sources → Add data source → Prometheus**
   - **URL**：填 `http://prometheus:9090`（同 compose 网络内访问）或 `http://<服务器 IP>:9090`
   - 拉到底点 **Save & test**，显示 `Successfully queried` 即可
2. 侧栏 → **Dashboards → New → Import**
3. 选择 **Upload JSON file**，上传下载好的 `truenas_scale.json`
4. 在导入界面的数据源下拉里选刚才创建的 Prometheus，点 **Import**

导入后即可看到 TrueNAS 的 CPU、内存、ZFS 池、磁盘温度、网络流量等面板。后续可在此基础上按需调整 Panel，或在 Prometheus / Grafana 里按指标配置告警规则。

> [!NOTE]
> 作者注：本文在 TrueNAS SCALE 24.x 上验证过；Core 版本的 Graphite 上报路径略有差异，但配置项名称一致，按 Web UI 提示操作即可。

## 编辑建议

> 以下建议基于本条目内容生成，仅供发布前参考。

### 文章内容建议
- 建议补充"告警规则"小节：第 5 节只讲了数据采集和可视化，没讲如何在 Prometheus 里配 `PromQL` 告警（磁盘温度 > 50°C 持续 10 分钟、ZFS 池容量 > 85% 持续 1 小时）以及 Alertmanager 集成，监控无告警等于半成品。
- 建议补充"Grafana 告警"小节：Grafana 8+ 内置 unified alerting，可在面板上直接配告警，对小规模部署更轻量；与 Prometheus Alertmanager 形成两条路径供读者选择。
- 建议补充"持久化与备份"：prometheus-data 与 grafana-data 卷的备份策略（直接打包 sqlite + TSDB 目录 vs 走 PVE 备份），目前完全没提数据安全。
- 建议补充"多 TrueNAS 实例监控"：第 4 节 prometheus.yml 只配了一个 target，多台 NAS 时如何在 labels 里区分（`relabel_configs` 加 `instance` 标签）；目前示例不够通用。

### 修改建议
- 第 5.5 节 "Grafana 默认密码 `Aa123456`" 提到要改复杂密码、放到 `.env` 读取，但没给具体的 `.env` 文件模板和 `docker-compose.yaml` 改 `${GF_SECURITY_ADMIN_PASSWORD}` 的完整对比，建议补充完整示例。
- 第 3 节 docker-compose.yaml 中 `image: ... :latest` 与 5.3 节"生产建议固定版本号"形成自相矛盾；建议要么文首明确"本文示例用 `:latest`，生产前请改固定版本"，要么直接给出版本号示例。
- 第 2 节前置条件只讲 TrueNAS Web UI 开启 Graphite 推送，没讲 TrueNAS 上需要打开的防火墙端口（9109 TCP+UDP 入站），对把监控主机放在另一台机器的读者是个常见坑。

### 合并建议
- 候选合并对象：`beszel-install`（同属自建监控）
- 合并理由：可在文末"## 监控方案对比"加一段"轻量级选 Beszel / 重量级选 Prometheus+Grafana"对比表，反向亦然（Beszel 文末加链接）。
- 候选合并对象：`zfs-pool-migration-reconstruction-guide`（同 ZFS 场景）
- 合并理由：本文监控的指标核心是 ZFS 池状态，可在文末"## 相关阅读"加链接到 ZFS 池迁移教程，反向亦然。

### slug 建议
- 当前：`truenas-prometheus-grafana-monitoring`
- 建议：保留
- 理由：slug 完整覆盖三大关键词（TrueNAS 系统 / Prometheus 存储 / Grafana 展示 + monitoring 用途），可搜索性极强；偏长但可接受。

### 分类建议
- 建议归类到：服务
- 理由：监控 + 时序数据库 + 可视化属典型服务类（数据库/监控/自建应用）；当前 `HomeLab 私有云` 涵盖过广。
- 备选：容器（核心是 Docker Compose 部署）

### tags 建议
- 建议：`[TrueNAS, Prometheus, Grafana]`
- 与现状对比：`[TrueNAS, TrueNAS SCALE, PrometrueNAS, Graphite, Docker Compose, HomeLab, ZFS]`（保留主技术 + 主题词），差异说明：tag 偏多；`TrueNAS` 与 `TrueNAS SCALE` 重复，保留一个；`Docker Compose` 已在文中展开，tag 中不必重复；`Graphite` 是协议而非核心组件可保留作为补充；建议精简为 `[TrueNAS, Prometheus, Grafana, Graphite]`。

### 其他建议
- 建议补充配图：第 6 节 `http://<server-ip>:9090/targets` 截图显示 state: UP、导入 truenas_scale.json 后的 Grafana 仪表板完整截图（含 ZFS 池、磁盘温度、网络流量等面板）。
- 建议在文首加"前置环境"小卡：作者使用的 TrueNAS SCALE 版本、Docker Compose 版本、监控主机 OS 版本，让读者评估兼容性。
