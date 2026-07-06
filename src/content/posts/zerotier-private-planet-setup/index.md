---
title: 突破内网延迟：ZeroTier 私有 Planet 节点搭建全攻略
slug: zerotier-private-planet-setup
published: 2025-02-25 00:00:00
updated: 2025-02-25 00:00:00
description: 基于 xubiaolin/docker-zerotier-planet 镜像搭建国内云服务器上的 ZeroTier 私有 Planet 根节点，从容器部署、客户端 planet 文件替换到延迟验证的完整流程，并给出局域网互访与 Moon 进阶方案。
image: api
category: HomeLab
tags: ["ZeroTier", "内网穿透", "Planet", "Moon", "VPN", "SDN", "组网", "Docker", "Docker Compose", "HomeLab"]
draft: false
# pinned: false
---

ZeroTier 官方的 Planet 根节点都在北美 / 欧洲，国内客户端每次握手、心跳都要绕一圈海外——社区普遍反映延迟 150~300 ms 起步。把 Planet 搬到自己的国内云服务器上，控制面延迟通常能降到 **20~50 ms** 区间，同时 ZeroTier 的控制数据不再经第三方。本文基于 [xubiaolin/docker-zerotier-planet](https://github.com/xubiaolin/docker-zerotier-planet) 镜像，走一遍完整流程：**容器部署 → 提取 planet 文件 → 多平台客户端替换 → 验证延迟改善 → (可选) 局域网互访和 Moon**。

> [!NOTE]
> 延迟数据说明：上面的 150~300 ms / 20~50 ms 是社区典型观察值，与你的客户端所在运营商、自建 Planet 所在地域、中间网络质量都有关。**务必在替换前后各 `ping` 一次做自己的基线对比**（见第 5.3 节）。

## 1. 前置条件

- **一台公网可访问的云服务器**（1H1G 即可，国内节点优先；带宽 1 Mbps 以上体验更好）
- **Docker + Docker Compose** 已安装
- 有公网 IPv4（IPv6 可选）
- 云厂商**安全组**和主机**防火墙**（ufw / firewalld）放行下表端口：

| 端口 | 协议 | 用途 |
|------|------|------|
| 9993 | **UDP** | ZeroTier 核心通信（P2P 握手、心跳、数据转发） |
| 9994 | TCP | 可选备用通道（UDP 被运营商封锁时 fallback） |
| 9995 | TCP | 可选备用通道 |
| 3443 | TCP | Planet 管理 Web UI |
| 3000 | TCP | 内置文件服务器（方便直接下载 planet 文件） |

> [!WARNING]
> UDP 9993 必须通：ZeroTier 主通道是 **UDP**，很多云厂商默认安全组只放行 TCP。如果 9993/udp 没开，客户端 peers 列表里会看到 PLANET 行的 link 是 **RELAY** 而不是 **DIRECT**，性能直接大打折扣。

## 2. 部署 Planet 容器

### 2.1 创建目录并写 docker-compose.yaml

```bash
mkdir -p /data/zerotier-planet/{data,dist,ztncui,zerotier-one}
cd /data/zerotier-planet
```

`docker-compose.yaml`：

```yaml
services:
  zerotier-planet:
    image: xubiaolin/zerotier-planet:latest
    container_name: zerotier-planet
    restart: unless-stopped
    network_mode: host          # 推荐 host：ZeroTier 多端口 + NAT 穿透需求复杂
    volumes:
      - ./data:/app/data
      - ./dist:/app/dist        # planet / moon 等文件的生成目录
      - ./ztncui:/app/ztncui
      - ./zerotier-one:/var/lib/zerotier-one
    environment:
      IP_ADDR4: "你的公网IPv4"   # 必填
      IP_ADDR6: ""               # 有 IPv6 可填
      ZT_PORT: 9993
      API_PORT: 3443
      FILE_SERVER_PORT: 3000
```

### 2.2 启动并查看日志

```bash
docker compose up -d
docker compose logs -f zerotier-planet
```

日志里看到 `planet generated` / `server started` 等提示即部署成功。首次启动容器会生成你专属的 Planet 密钥和 `planet` 文件。

### 2.3 首次登录管理 UI

浏览器打开 `http://<公网IP>:3443`，用 README 里给出的默认凭据登录（一般是 `admin` / `password`，**请立即在 UI 中修改**）。管理 UI 提供网络创建、节点授权、IP 分配等图形化操作。

## 3. 创建一个 ZeroTier 网络

在管理 UI 中：

1. **Add network** → 填写网络名称 → **Create**
2. 进入网络详情 → **Easy setup** → **Generate network address**
3. 配置好 IPv4 分配段（默认的 `10.x.x.x/24` 够用）→ **Submit**

**复制生成的 16 位网络 ID**，稍后客户端 `zerotier-cli join` 要用。

## 4. 替换客户端的 Planet 文件

只有替换了 planet 文件的客户端，才会连接到你的自建 Planet 而不是 ZeroTier 官方 Planet。

### 4.1 从服务器获取 planet 文件

两种方式任选：

```bash
# 方式 A：docker cp 直接从容器内取出
docker cp zerotier-planet:/app/dist/planet ./planet

# 方式 B：通过容器内置的文件服务器下载（端口 3000）
curl -O http://<你的公网IP>:3000/planet
```

### 4.2 把 planet 放到各平台的正确位置

| 平台 | Planet 文件路径 |
|------|---------------|
| **Linux** | `/var/lib/zerotier-one/planet` |
| **macOS** | `/Library/Application Support/ZeroTier/One/planet` |
| **Windows** | `C:\ProgramData\ZeroTier\One\planet` |
| **Android** | ⚠️ 受沙箱限制，官方 App 不开放修改 planet 路径 |
| **iOS** | ⚠️ 同上 |

> [!CAUTION]
> Android / iOS 的限制：移动端的 ZeroTier 官方 App 不支持自定义 Planet，无法走自建 Planet 直连。如果手机端必须接入：

- 在有 root / 越狱的设备上通过文件管理器替换（折腾度高）
- 或者让手机通过已替换 planet 的路由器 / NAS 作为 gateway 间接接入

### 4.3 重启客户端 ZeroTier 服务

替换 planet 文件后，必须**重启 ZeroTier 服务**才会重新加载：

**Linux（systemd）**：

```bash
sudo systemctl restart zerotier-one
```

**Windows（PowerShell 管理员）**：

```powershell
Restart-Service "ZeroTier One"
# 或在服务管理器 services.msc 里手动重启 "ZeroTier One"
```

**macOS**：从菜单栏 ZeroTier 图标退出 App 再重新打开；或命令行 `sudo launchctl unload/load com.zerotier.one.plist`。

### 4.4 验证 Planet 替换已生效

```bash
zerotier-cli peers
```

输出里找 **PLANET** 那一行，`<path>` 列的 IP 应当是**你自建服务器的公网 IP**（不再是 ZeroTier 官方 IP 如 `50.7.73.34` 等）：

```
<ztaddr>   <ver>  <role> <lat> <link>   <lastTX> <lastRX> <path>
881b287f44 1.14.1 PLANET    20 DIRECT   459      449      <你的公网IP>/9994
```

同时可以和替换前做延迟对比：

```bash
# 替换前记录
ping -c 20 50.7.73.34   # ZeroTier 官方 Planet 之一

# 替换后
ping -c 20 <你的公网IP>
```

## 5. 加入网络

在客户端上执行：

```bash
zerotier-cli join <你的网络ID>
```

然后**回到管理 UI 把这个新节点 Authorize**（在 Members 列表里勾选），客户端就会拿到一个网络内 IP（如 `10.147.17.x`）。

常用子命令：

```bash
zerotier-cli info               # 查看本机节点 ID
zerotier-cli listnetworks       # 查看已加入的网络
zerotier-cli leave <网络ID>     # 退出网络
zerotier-cli peers              # 查看所有对端
```

## 6. (可选) 让 ZeroTier 客户端访问服务端所在的局域网

这一节是**进阶场景**：你的自建 Planet 服务器本身也部署在某个家庭 / 办公室局域网里（比如 `192.168.1.0/24`），希望外部 ZeroTier 客户端加入虚拟网络后，能**穿透访问这个局域网里的其他设备**（NAS、打印机、摄像头等）。

如果你只是把 Planet 服务器当作公网路由节点、不需要访问它所在的局域网，**跳过整个第 6 节**。

### 6.1 开启并持久化 ip_forward

```bash
# 写入配置文件（持久化，重启后仍生效）
echo "net.ipv4.ip_forward=1" | sudo tee /etc/sysctl.d/99-ip-forward.conf

# 立即加载
sudo sysctl --system
```

> [!WARNING]
> 原始的 sysctl -w 不持久化：`sysctl -w net.ipv4.ip_forward=1` 只影响**当前运行时**，重启丢失。必须写进 `/etc/sysctl.conf` 或 `/etc/sysctl.d/*.conf`，再用 `sysctl --system` 加载才算持久化。

### 6.2 配置 iptables NAT + FORWARD

先查出两个网卡名：

```bash
ip a
# 输出里找两张网卡：
# - 物理网卡：通常是 eth0 / enp0s3 / ens33 / ovs_eth0 等
# - ZeroTier 虚拟网卡：以 zt 开头，如 ztre4xmo4y
```

> [!CAUTION]
> 不要直接抄 `ovs_eth0`：原笔记里 `PHY_IF=ovs_eth0` 是作者在 OpenVSwitch 环境（PVE / OpenStack 等）下的网卡名。**绝大多数读者的物理网卡是 `eth0` / `enp0s3` / `ens33` 等**，直接抄会报错。务必用 `ip a` 看自己实际的网卡名。

替换 `PHY_IF` 和 `ZT_IF` 的值后执行：

```bash
export PHY_IF=eth0           # ← 你的物理网卡
export ZT_IF=ztre4xmo4y      # ← 你的 ZeroTier 虚拟网卡

# 出站 SNAT（ZeroTier 流量伪装成服务器的本地 IP 出去）
sudo iptables -t nat -A POSTROUTING -o $PHY_IF -j MASQUERADE

# 双向 FORWARD 放行
sudo iptables -A FORWARD -i $PHY_IF -o $ZT_IF -m state --state RELATED,ESTABLISHED -j ACCEPT
sudo iptables -A FORWARD -i $ZT_IF -o $PHY_IF -j ACCEPT
```

三条规则的作用：

- **第 1 条 POSTROUTING MASQUERADE**：ZeroTier 客户端访问局域网设备时，源地址改写为服务器的物理网卡 IP，让局域网设备回包能回得来
- **第 2 条 FORWARD**：允许局域网 → ZeroTier 方向的**回包**通过（只放行已建立的连接）
- **第 3 条 FORWARD**：允许 ZeroTier → 局域网方向的**新建连接**通过

### 6.3 持久化 iptables 规则

默认 iptables 规则重启后丢失，必须显式保存：

```bash
# Debian / Ubuntu
sudo apt install -y iptables-persistent
sudo netfilter-persistent save

# CentOS / RHEL
sudo iptables-save > /etc/sysconfig/iptables
```

### 6.4 管理 UI 配置子网路由

在 Planet 管理 UI 中打开对应网络 → **Managed Routes** → 添加一条路由：

- **Destination**：你的局域网段（如 `192.168.1.0/24`）
- **Via**：服务器在 ZeroTier 网络里的 IP（`zerotier-cli listnetworks` 里查）

配置后，ZeroTier 客户端就能直接 ping 到 `192.168.1.x` 的设备。

## 7. (可选) 加入 Moon 二级根节点

> [!NOTE]
> 先判断你到底需不需要 Moon：自建 Planet 之后，**大多数场景不再需要 Moon**。Moon 适合的情况：

- **多地域部署**：比如东部一个 Moon、西部一个 Moon，让客户端就近选择
- **Planet 单点冗余**：Moon 做二级根节点，Planet 挂了还能继续发现对端

一般家庭 / 小团队自建一个 Planet 节点就够了，直接跳过本节。

如果确实需要 Moon：容器里的 `dist/` 目录下会生成一个 `.moon` 文件，文件名类似 `000000881b287f44.moon`。**文件名前缀 `000000` 是 ZeroTier 用作排序的零填充，真正的 Moon ID 是后面的 `881b287f44`**。

把 `.moon` 文件分发到客户端后，执行：

```bash
zerotier-cli orbit 881b287f44 881b287f44
```

`orbit` 命令有两个参数：

- 第 1 个是 **Moon ID**（告诉客户端要连哪个 Moon）
- 第 2 个是 **Seed**（寻找 Moon 节点地址的种子，一般**填同一个 Moon ID 即可**）

管理命令：

```bash
zerotier-cli listmoons              # 查看已加入的 moons
zerotier-cli deorbit 881b287f44     # 脱离某个 moon
```

## 8. 常用命令与输出解读

### 8.1 `zerotier-cli peers` 输出

典型输出（清理过的示例）：

```
200 peers
<ztaddr>   <ver>  <role> <lat> <link>   <lastTX> <lastRX> <path>
23b6d4d552 1.16.1 LEAF       2 DIRECT   185      457      192.168.13.127/9993
4250e4b427 1.16.1 LEAF       9 DIRECT   8        9        49.76.149.157/23936
881b287f44 1.14.1 PLANET    20 DIRECT   459      449      106.15.204.189/9994
```

列含义：

| 列 | 含义 |
|----|------|
| `ztaddr` | 对端节点的 ZeroTier 地址（10 位 hex） |
| `ver` | 对端 ZeroTier 版本 |
| `role` | **LEAF** 普通客户端 / **PLANET** 根节点 / **MOON** 二级根 |
| `lat` | 延迟（毫秒） |
| `link` | **DIRECT** 直连成功 / **RELAY** 通过中继（性能差） |
| `lastTX`/`lastRX` | 最近发送 / 接收字节数 |
| `path` | 当前使用的物理 IP:端口 |

### 8.2 常见故障排查

| 现象 | 可能原因 | 对策 |
|------|---------|------|
| 替换 planet 后 `peers` 里 PLANET 还是官方 IP | ZeroTier 服务没重启 / planet 文件路径不对 / 权限不对 | 确认路径和权限，再 `systemctl restart zerotier-one` |
| PLANET 能看到但 `link: RELAY` 不直连 | 9993/udp 被封或防火墙拦截 | 放行云安全组 + 主机防火墙的 9993/udp |
| 客户端 `join` 后一直拿不到 IP | 管理 UI 里节点未授权 | Members 列表里把该节点 **Authorize** |
| 访问不了局域网 192.168.x.x | `ip_forward` 没开 / iptables 规则没加 / Managed Routes 没配 | 逐项检查第 6 节的三个子节 |
| Android / iOS 无法接入自建 Planet | 移动端 App 不开放 planet 替换 | 接入一个已改造的路由器 / 网关作中转 |

> [!NOTE]
> 作者注：本文流程基于 `xubiaolin/zerotier-planet:latest` 镜像。该项目迭代较快，环境变量命名和默认凭据可能随版本调整——以 [项目 README](https://github.com/xubiaolin/docker-zerotier-planet) 的最新说明为准。

## 编辑建议

> 以下建议基于本条目内容生成，仅供发布前参考。

### 文章内容建议
- 建议补充 Planet 容器端口（3443/3000）的安全加固章节：默认 UI 凭据、暴露公网的危害、TLS 反代或 SSH 隧道方案
- 建议补充"Planet 节点本身的灾备/迁移"小节：容器内 `data/` 与 `dist/` 哪些是关键文件、如何在新服务器恢复
- 第 6.4 节"Managed Routes"只提到 IPv4，建议补充 IPv6 路由的添加方式（`route-via` 字段），与内文 IPv6 提示呼应
- 建议补充 `planet` 文件本身的备份与版本回滚操作（替换后旧 planet 应保留在客户端，便于故障时恢复官方 Planet）

### 修改建议
- 第 4.4 节的延迟对比示例用 `50.7.73.34`，建议在脚注里列出"官方 Planet 常见 IP 段"，让读者能直接 ping 自己真实的官方 Planet
- 第 2.1 节的 `IP_ADDR4` 与 `IP_ADDR6` 直接在 yaml 里写明文字符串，建议改用 `.env` 文件 + `${IP_ADDR4}` 引用，避免硬编码后忘记改
- 全文 14 个 `image: "api"` 占位符与该篇无图，封面图建议补一张 ZeroTier 私有 Planet 架构图（Planet → Moon → Leaf）

### 合并建议
- 候选合并对象：`frp-deploy`（同属内网穿透方案，但 ZeroTier 是 P2P 组网、FRP 是端口转发，定位差异较大）
- 候选合并对象：`istoreos-openclash`（同样在标题中"内网穿透 / 组网"主题，但 OpenClash 是代理方案，差异较大）
- 合并理由：与上述两篇的方案定位（VPN/代理）不同，本篇是自建 SDN 根节点，建议**保留独立条目**，但可在文末"相关阅读"区显式互链
- 实际建议：无需合并

### slug 建议
- 当前：`zerotier-private-planet-setup`
- 建议：保留
- 理由：slug 准确描述了"ZeroTier + 私有 Planet + 搭建"三个关键词，含义清晰、英文小写、kebab-case 规范

### 分类建议
- 建议归类到：网络
- 理由：内容核心是 ZeroTier 控制面（Planet/Moon）组网、内网穿透、P2P VPN，与分类定义中"VPN、代理、内网穿透"完全契合
- 现分类 `HomeLab 私有云` 也可保留作为副线，但主分类建议改为「网络」

### tags 建议
- 建议：`[ZeroTier, Planet, 内网穿透, VPN]`
- 与现状对比：原 tags 含 `["ZeroTier", "内网穿透", "Planet", "Moon", "VPN", "SDN", "组网", "Docker", "Docker Compose", "HomeLab"]`
- 差异说明：现有 10 个 tags 偏多，按 1-3 主技术名 + 1-2 主题词规则压缩；`SDN`/`组网` 与 ZeroTier 重复、`Docker`/`Docker Compose`/`HomeLab` 是部署手段不是主题，`Moon` 仅作进阶小节可降为内文词

### 其他建议
- 建议在第 1 节前置条件里补充一行："国内云厂商（阿里云/腾讯云）默认安全组只放 TCP，需手动添加 UDP 9993 规则"，避免读者首次踩坑
- 配图建议：第 4.4 节的 `zerotier-cli peers` 输出截图、第 6.4 节 Managed Routes 截图，可显著提升可读性
