---
title: Linux 下 OpenVPN 快速部署与配置全攻略
slug: linux-openvpn-installation-guide
published: 2025-01-18 00:00:00
updated: 2025-01-18 00:00:00
description: 从零在 Linux 上搭 OpenVPN 服务端（一键脚本与手动 easy-rsa 两种方式）并让客户端接入。覆盖 Debian / Ubuntu / RHEL 系 / Alpine / Arch 五大发行版的安装与服务管理、.ovpn 和 client.conf 配置、systemd 与 OpenRC 启动、IP 转发与 NAT 规则、连接故障排查。
image: api
category: 中间件
tags: ["OpenVPN", "Linux", "VPN", "网络", "PKI", "easy-rsa", "systemd", "OpenRC", "iptables", "NAT", "运维"]
draft: false
# pinned: false
---

## 为什么自建 OpenVPN

自建 OpenVPN 常见场景：

- 出差 / 异地时接回家庭或公司内网
- 多个 HomeLab 机房跨地域组网
- 访问云上 VPC 的私有子网
- 需要一个能穿越绝大多数防火墙的稳定 VPN 协议

相比 WireGuard、ZeroTier、Tailscale 这些更现代的方案，OpenVPN 的优势是**历史悠久、客户端全平台覆盖、路由器 / OpenWRT / PVE 固件几乎都原生支持**；缺点是性能不如 WireGuard、握手速度一般、配置相对复杂。

如果没有既定技术选型，刚起步做 VPN 推荐先看 WireGuard；本文针对**已经决定用 OpenVPN** 的读者。

## 本文结构

```
服务端（你有一台公网 VPS / 家里有公网 IP）
    ├── 一键脚本（推荐，90% 场景够用）
    └── 手动 easy-rsa（想理解 PKI 原理）
               ↓
     生成 .ovpn 客户端配置文件
               ↓
客户端（手机 / 电脑 / 其他 Linux 服务器）
    ├── 安装 OpenVPN（按发行版）
    ├── 放 .ovpn 或 client.conf
    └── 用 systemd（主流）或 OpenRC（Alpine）跑
```

## 1. 前置条件

### 服务端

- **一台有公网 IP 的服务器**（国外 VPS / 国内有公网 IP 的 VPS / 家里有公网的路由器后台机器都行）
- 系统为 Debian / Ubuntu / RHEL 系（CentOS / Rocky / AlmaLinux） / Alpine / Arch 任一
- root 或 sudo 权限
- 云厂商**安全组**和主机**防火墙**放行 OpenVPN 端口（默认 UDP 1194）

### 客户端

- 任意 Linux / Windows / macOS / Android / iOS 设备
- 能从服务端获取 `.ovpn` 配置文件（U 盘 / SCP / 安全聊天工具等）

---

## 第一部分：服务端部署

两种方式都能用，**推荐一键脚本**——维护者持续更新、覆盖所有主流发行版、自动处理 PKI / iptables / systemd。**手动 easy-rsa** 适合想理解底层原理或要做深度定制的场景。

## 2. 方式 A：一键脚本（推荐）

社区最成熟的维护者是 [angristan/openvpn-install](https://github.com/angristan/openvpn-install)。支持 Ubuntu / Debian / CentOS / Fedora / Rocky / Alma / Oracle Linux。

> [!WARNING]
> curl | bash 的安全提醒: 一键脚本会以 root 权限执行一大段远程代码。虽然项目口碑好、star 数多，但建议**先下载审查再执行**，养成习惯：

```bash
curl -O https://raw.githubusercontent.com/angristan/openvpn-install/master/openvpn-install.sh
less openvpn-install.sh       # 浏览脚本内容
chmod +x openvpn-install.sh
sudo ./openvpn-install.sh
```

### 2.1 交互式配置

首次运行脚本会交互式问几个问题，关键几项：

| 问题 | 推荐值 | 说明 |
|------|-------|------|
| IP address | 保持默认（脚本自动识别公网 IP） | 如果机器有多个 IP / 在 NAT 后，手动改成出口公网 IP |
| Public IPv4 / hostname | 服务端域名或公网 IP | 客户端通过这个地址连过来 |
| Protocol | **UDP**（推荐） | TCP 只在 UDP 被封的环境下用，性能差 |
| Port | 1194（默认）或自定 | 非标端口可规避扫描 |
| DNS resolvers | 1.1.1.1 / 8.8.8.8 任一 | VPN 连上后客户端用的 DNS |
| Use compression | **No** | 有安全隐患（VORACLE 攻击），关闭 |
| Customize encryption | **No** | 脚本默认值就很好 |
| First client name | 一个客户端标识（如 `alice-laptop`） | 不能重名 |
| Password protect | 看需求 | 加密私钥增加一层保护，但每次连接要输密码 |

### 2.2 结果

脚本执行完后：

- OpenVPN 服务端已启动并设置开机自启（`systemctl status openvpn@server`）
- IP forwarding 已开启并持久化
- iptables / nftables NAT 规则已配置
- **客户端 `.ovpn` 文件**生成在脚本执行目录（用户家目录），名为 `<客户端名>.ovpn`

把这个 `.ovpn` 发到客户端机器，跳到本文第二部分的客户端接入。

### 2.3 增删客户端

再次运行同一个脚本，会进入管理菜单：

```
1) Add a new user
2) Revoke existing user
3) Remove OpenVPN
4) Exit
```

选 1 添加新客户端、选 2 吊销已发放的客户端（比如员工离职、手机丢了）。

### 2.4 一键脚本不支持 Alpine / Arch 的情况

这两个发行版需要走下面的**方式 B 手动部署**，或用系统自带包直接配置（能跑，但 iptables/NAT 需自己加）。

## 3. 方式 B：手动部署（easy-rsa + 自写配置）

### 3.1 安装 OpenVPN + easy-rsa

| 发行版 | 命令 |
|--------|------|
| Debian / Ubuntu | `sudo apt update && sudo apt install -y openvpn easy-rsa` |
| RHEL / CentOS / Rocky / Alma | `sudo dnf install -y epel-release && sudo dnf install -y openvpn easy-rsa` |
| Alpine | `sudo apk add openvpn easy-rsa` |
| Arch | `sudo pacman -S --noconfirm openvpn easy-rsa` |

### 3.2 初始化 PKI 并签发证书

OpenVPN 用 PKI（公钥基础设施）做身份认证——服务端和每个客户端都有自己的证书，由同一个 CA 签发。

```bash
# 1. 把 easy-rsa 样板目录复制一份到工作目录
make-cadir ~/openvpn-ca        # 如果命令不存在，用 cp -r /usr/share/easy-rsa ~/openvpn-ca
cd ~/openvpn-ca

# 2. 初始化 PKI
./easyrsa init-pki

# 3. 创建 CA（会让你输入 CA 密码短语 + CN 名称）
./easyrsa build-ca

# 4. 生成服务端证书（nopass 表示服务端私钥不加密，方便服务自启）
./easyrsa build-server-full server nopass

# 5. 生成 Diffie-Hellman 参数（耗时几分钟）
./easyrsa gen-dh

# 6. 生成 HMAC 签名密钥（防 DoS + 端口扫描的额外一层）
openvpn --genkey secret pki/ta.key

# 7. 生成第 1 个客户端证书
./easyrsa build-client-full alice-laptop nopass
```

### 3.3 放置文件到 OpenVPN 目录

```bash
sudo mkdir -p /etc/openvpn/server
sudo cp pki/ca.crt \
        pki/issued/server.crt \
        pki/private/server.key \
        pki/dh.pem \
        pki/ta.key \
        /etc/openvpn/server/
```

### 3.4 编写 `/etc/openvpn/server/server.conf`

```
port 1194
proto udp
dev tun

ca /etc/openvpn/server/ca.crt
cert /etc/openvpn/server/server.crt
key /etc/openvpn/server/server.key
dh /etc/openvpn/server/dh.pem
tls-auth /etc/openvpn/server/ta.key 0

# VPN 内网段（客户端会分到 10.8.0.x 的 IP）
server 10.8.0.0 255.255.255.0
ifconfig-pool-persist /var/log/openvpn/ipp.txt

# 让客户端所有流量都走 VPN（出国/翻墙场景必选；仅访问内网可注释）
push "redirect-gateway def1 bypass-dhcp"

# 推送 DNS 给客户端
push "dhcp-option DNS 1.1.1.1"
push "dhcp-option DNS 8.8.8.8"

keepalive 10 120
cipher AES-256-GCM
auth SHA256
user nobody
group nogroup         # Alpine / Arch 可能需要改成 nobody
persist-key
persist-tun

status /var/log/openvpn/status.log
log-append /var/log/openvpn/openvpn.log
verb 3

# 兼容新客户端的 TLS 最小版本
tls-version-min 1.2
```

### 3.5 开启 IP 转发与 NAT

让 VPN 客户端能通过服务端访问外网：

```bash
# 开启 IPv4 转发（持久化）
echo "net.ipv4.ip_forward=1" | sudo tee /etc/sysctl.d/99-openvpn.conf
sudo sysctl --system

# 配置 NAT（把 VPN 内网段伪装成服务端公网 IP 出去）
# 先查你的公网出口网卡名
ip -o -4 route show to default | awk '{print $5}'
# 假设输出是 eth0

sudo iptables -t nat -A POSTROUTING -s 10.8.0.0/24 -o eth0 -j MASQUERADE
sudo iptables -A FORWARD -i tun0 -j ACCEPT
sudo iptables -A FORWARD -o tun0 -j ACCEPT
```

**持久化 iptables 规则**：

| 发行版 | 命令 |
|--------|------|
| Debian / Ubuntu | `sudo apt install -y iptables-persistent && sudo netfilter-persistent save` |
| RHEL / CentOS / Rocky | `sudo iptables-save | sudo tee /etc/sysconfig/iptables` |
| Alpine | `sudo /etc/init.d/iptables save && sudo rc-update add iptables default` |
| Arch | `sudo iptables-save | sudo tee /etc/iptables/iptables.rules && sudo systemctl enable iptables` |

### 3.6 启动服务

**systemd 系（Debian / Ubuntu / RHEL / Arch）**：

```bash
sudo systemctl enable --now openvpn-server@server
sudo systemctl status openvpn-server@server
```

`@server` 对应 `/etc/openvpn/server/server.conf`。

**Alpine（OpenRC）**：

```bash
# Alpine 的 init script 默认用 /etc/openvpn/openvpn.conf
sudo mv /etc/openvpn/server/server.conf /etc/openvpn/openvpn.conf
sudo rc-service openvpn start
sudo rc-update add openvpn default
```

### 3.7 给客户端生成 `.ovpn` 文件

手动部署下需要自己把证书、密钥、配置拼成一个独立的 `.ovpn` 文件发给客户端。

```bash
cat > ~/alice-laptop.ovpn <<EOF
client
dev tun
proto udp
remote your-server.example.com 1194
resolv-retry infinite
nobind
persist-key
persist-tun
remote-cert-tls server
cipher AES-256-GCM
auth SHA256
key-direction 1
verb 3

<ca>
$(cat ~/openvpn-ca/pki/ca.crt)
</ca>
<cert>
$(cat ~/openvpn-ca/pki/issued/alice-laptop.crt)
</cert>
<key>
$(cat ~/openvpn-ca/pki/private/alice-laptop.key)
</key>
<tls-auth>
$(cat ~/openvpn-ca/pki/ta.key)
</tls-auth>
EOF
```

把 `your-server.example.com` 换成你的公网 IP 或域名；`alice-laptop.ovpn` 就是要发给客户端的文件。

---

## 第二部分：客户端接入

## 4. 安装 OpenVPN 客户端

> [!TIP]
> 客户端和服务端是同一个软件: OpenVPN 的服务端和客户端是同一个 `openvpn` 二进制，靠配置文件里是 `mode server` / `client` 区分。所以**下面的安装命令和前面服务端完全一样**。如果这台机器只做客户端，不装 easy-rsa 也行。

| 发行版 | 命令 |
|--------|------|
| Debian / Ubuntu | `sudo apt install -y openvpn` |
| RHEL / CentOS / Rocky / Alma | `sudo dnf install -y epel-release && sudo dnf install -y openvpn` |
| Alpine | `sudo apk add openvpn` |
| Arch | `sudo pacman -S --noconfirm openvpn` |

## 5. 客户端配置文件

### 5.1 方式 A：直接用服务端给的 `.ovpn` 文件（推荐）

`.ovpn` 已经把 CA、证书、密钥都内嵌进去了，就一个文件。把它放到：

```bash
sudo mkdir -p /etc/openvpn/client
sudo cp alice-laptop.ovpn /etc/openvpn/client/myvpn.conf
# 注意：systemd 模板单元读 /etc/openvpn/client/ 下的 .conf 文件（不是 .ovpn）
# 所以这里重命名为 .conf
```

### 5.2 方式 B：手写最小 `client.conf` 模板

如果服务端没直接给 `.ovpn`、只给了零散的证书文件，手写一个：

```
client
dev tun
proto udp
remote your-vpn-server.example.com 1194
resolv-retry infinite
nobind
persist-key
persist-tun
remote-cert-tls server

# 证书 & 密钥（路径用绝对路径或相对 /etc/openvpn/client/）
ca ca.crt
cert client.crt
key client.key
tls-auth ta.key 1

# 如果服务端启用了"用户名+密码"额外认证，取消下一行的注释
# auth-user-pass auth.txt

cipher AES-256-GCM
auth SHA256
verb 3
```

保存为 `/etc/openvpn/client/myvpn.conf`，对应的证书文件放同一目录。

### 5.3 如果服务端启用了用户名密码认证

某些服务端会在证书之外再要求用户名密码（双重认证）。先在配置里启用 `auth-user-pass auth.txt`，然后创建凭据文件：

```bash
sudo tee /etc/openvpn/client/auth.txt > /dev/null <<EOF
your_username
your_password
EOF
sudo chmod 600 /etc/openvpn/client/auth.txt
```

> [!WARNING]
> auth.txt 的权限 + 内容: - 文件**必须** `chmod 600`，否则 OpenVPN 会拒绝读取
- 严禁把真实密码写进博客 / 教程 / 提交到 Git
- 密码文件尽量放在 root 可读的目录（`/etc/openvpn/client/`），不要放 `/tmp` 之类

## 6. 先手动前台运行验证一次

正式做服务之前，先前台跑一次，确认配置有效、能连上：

```bash
sudo openvpn --config /etc/openvpn/client/myvpn.conf
```

期望日志里**最后一行**出现：

```
Initialization Sequence Completed
```

看到这条就说明连接成功。另开一个终端验证：

```bash
# 1. 是否出现 tun0 接口
ip a show tun0

# 2. 是否有 VPN 内网 IP（如 10.8.0.x）
# 3. 路由表是否把默认网关指到 tun0（如果服务端 push redirect-gateway）
ip route

# 4. 出口 IP 是不是 VPN 服务端的 IP
curl -s https://ipinfo.io/ip
```

确认无误后在第一个终端 `Ctrl+C` 退出，进下一步做服务化。

## 7. 客户端服务化

### 7.1 systemd 系（Debian / Ubuntu / RHEL / Arch）

**强烈推荐用官方模板单元 `openvpn-client@.service`**，不要自己造轮子。它已经自带了各种路径约定、权限处理、重连逻辑。

```bash
# 配置文件放 /etc/openvpn/client/<名字>.conf
ls /etc/openvpn/client/myvpn.conf

# 启用并立即启动（开机自启 + 现在就跑）
sudo systemctl enable --now openvpn-client@myvpn

# 查看状态
sudo systemctl status openvpn-client@myvpn

# 实时日志
sudo journalctl -u openvpn-client@myvpn -f

# 停止 / 禁用
sudo systemctl disable --now openvpn-client@myvpn
```

单元名后面的 `@myvpn` 和 `/etc/openvpn/client/myvpn.conf` 的文件名对应——想跑多个 VPN 配置各自独立，再放一份 `/etc/openvpn/client/office.conf` 然后 `enable --now openvpn-client@office` 即可。

> [!TIP]
> 为什么不自己写 .service 文件: OpenVPN 官方包自带 `openvpn-client@.service` 模板已经处理了：

- 自动找 `/etc/openvpn/client/%i.conf` 作为配置
- 正确的 working directory、权限降级
- 网络就绪后再启动
- 进程异常退出自动重启

自己 `cat > /etc/systemd/system/openvpn-client.service` 写个简版，很容易漏掉其中一项导致"前台能跑、服务跑不起来"。

### 7.2 OpenRC（Alpine）

Alpine 用 OpenRC，没有 systemctl。

```bash
# Alpine 默认 init 脚本读 /etc/openvpn/openvpn.conf
# 如果你只跑一个 VPN，把配置文件改名放到那里
sudo mv /etc/openvpn/client/myvpn.conf /etc/openvpn/openvpn.conf

# 启动 + 开机自启
sudo rc-service openvpn start
sudo rc-update add openvpn default

# 状态
sudo rc-service openvpn status

# 日志（OpenRC 下日志通常在 /var/log/messages 或 /var/log/openvpn/）
tail -f /var/log/messages
```

**多配置场景**：Alpine 的 init script 支持给每个配置文件起一个独立的 service。参考 `/etc/init.d/openvpn` 的注释，常见做法是 `ln -s /etc/init.d/openvpn /etc/init.d/openvpn.myvpn` 再 `rc-service openvpn.myvpn start`——但兼容性视 Alpine 版本而异，建议 Alpine 场景保持单配置即可。

> [!NOTE]
> `/dev/net/tun` 缺失时才需要 mknod: 现代 Linux 内核 + udev 下 `/dev/net/tun` 会自动创建。

**只有在容器（Docker / LXC）或精简的嵌入式系统里**才需要手动创建：

```bash
sudo mkdir -p /dev/net
sudo mknod /dev/net/tun c 10 200
sudo chmod 600 /dev/net/tun
```

同时容器要加 `--cap-add=NET_ADMIN --device /dev/net/tun` 才能跑 OpenVPN。

## 8. 连接验证

不管用服务化跑还是前台跑，连上后都要验证：

```bash
# 1. VPN 接口和 IP
ip a show tun0
# 应该能看到 inet 10.8.0.x（或你服务端配的网段）

# 2. 路由
ip route
# 若服务端 push 了 redirect-gateway，看到类似：
# 0.0.0.0/1 via 10.8.0.1 dev tun0

# 3. 出口 IP 对比
curl -s https://ipinfo.io/ip
# 应该显示 VPN 服务端的公网 IP，不是本机原本的出口

# 4. 能否访问 VPN 内网资源
ping 10.8.0.1              # ping 服务端的 VPN 内网 IP
```

四项都正常就说明 VPN 在稳定工作。

## 9. 常见故障排查

| 报错 / 现象 | 可能原因 | 对策 |
|------------|---------|------|
| `Connection refused` | 服务端没起 / 端口不对 / 协议 UDP vs TCP 不匹配 | 服务端 `systemctl status openvpn-server@server`；确认防火墙 / 安全组放行 1194 UDP |
| `TLS handshake failed` | 客户端时间差太大 / 防火墙拦截 / MTU 问题 | 客户端 `timedatectl` 校时；换 TCP 测试；配置里加 `tun-mtu 1400` |
| `AUTH_FAILED` | 用户名密码不对 / `auth.txt` 格式错 | 确认 `auth.txt` 第 1 行用户名、第 2 行密码，无多余空行；`chmod 600` |
| 连上后无法上网 | 服务端 IP forward 没开 / NAT 规则缺失 | `sudo sysctl net.ipv4.ip_forward` 应为 1；检查 POSTROUTING MASQUERADE 规则 |
| 连上后仅内网通、公网不通 | 服务端没 push `redirect-gateway` | server.conf 加 `push "redirect-gateway def1 bypass-dhcp"` |
| DNS 不生效（能 ping IP 不能 ping 域名） | 客户端没应用 push 的 DNS | systemd-resolved 系统需 `update-resolv-conf` 脚本；或客户端配 `script-security 2` + `up /etc/openvpn/update-resolv-conf` |
| 前台能跑、服务跑不起来 | 自己写的 .service 文件有问题 | 改用官方模板单元 `openvpn-client@myvpn` |
| 容器里起不来 `ERROR: Cannot open TUN/TAP dev /dev/net/tun` | `/dev/net/tun` 不存在或没权限 | 容器加 `--cap-add=NET_ADMIN --device /dev/net/tun`；必要时 `mknod` 手建 |
| Alpine 上执行 `systemctl` 报 command not found | Alpine 用 OpenRC 不用 systemd | 用 `rc-service openvpn` 系列命令 |

实在排查不出来的时候，加大日志 verbosity：配置文件 `verb 3` 改成 `verb 5` 甚至 `verb 9`，重启服务后看详细日志通常能定位到问题。

> [!NOTE]
> 作者注: 本教程在 Ubuntu 22.04 / 24.04 和 Debian 12 上以 OpenVPN 2.6.x 验证过主干流程。RHEL 系 / Alpine / Arch 的命令以各自官方包文档为准，主流程和 PKI 部分完全通用。
