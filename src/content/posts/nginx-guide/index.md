---
title: Nginx 安装与配置指南
slug: nginx-guide
published: 2025-01-09 00:00:00
updated: 2025-01-09 00:00:00
description: 介绍 Nginx 在 CentOS 和 Ubuntu 上的安装方法，以及常用的配置模板，包括静态站点、Vue SPA、SSL/HTTPS、反向代理、WebSocket、TCP 转发、MinIO 代理等。
image: api
category: 中间件
tags: ["Nginx", "反向代理", "SSL"]
draft: false
# pinned: false
---

## 一、安装

### CentOS（yum）

```bash
# 添加 Nginx 官方 YUM 源
rpm -ivh http://nginx.org/packages/centos/7/noarch/RPMS/nginx-release-centos-7-0.el7.ngx.noarch.rpm

# 安装 Nginx
yum install -y nginx

# 启动并设置开机自启
systemctl start nginx
systemctl enable nginx
```

### Ubuntu / Debian（apt）

```bash
apt install -y nginx
systemctl start nginx
systemctl enable nginx
nginx -t
```

## 二、主配置文件结构

通常不会直接修改主配置文件，而是采用引入外部文件的方式管理多个站点。

```nginx title="nginx.conf"
http {
  # 注释掉默认的 include，防止 80 端口冲突
  # include /etc/nginx/conf.d/*.conf;

  # 引入自定义 HTTP 配置
  include /opt/nginx/http/*.conf;

  # 不限制文件上传大小
  client_max_body_size 0;
}

# TCP/UDP 代理（需要在 http 块外部）
stream {
  include /opt/nginx/server/*.conf;
}
```

## 三、静态站点 / Vue SPA

```nginx title="/opt/nginx/http/spa.conf"
server {
    listen 80;
    server_name example.com;
    root /opt/app/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_set_header Host $http_host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_pass http://127.0.0.1:8080/;
    }
}
```

## 四、SSL / HTTPS

```nginx title="/opt/nginx/http/ssl.conf"
server {
    listen 80;
    server_name example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name example.com;

    ssl_certificate        /opt/cert/example.com.pem;
    ssl_certificate_key    /opt/cert/example.com.key;
    ssl_protocols          TLSv1.1 TLSv1.2 TLSv1.3;
    ssl_ciphers            EECDH+CHACHA20:EECDH+AES128:RSA+AES128:EECDH+AES256:RSA+AES256:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache      shared:SSL:10m;
    ssl_session_timeout    10m;
    add_header Strict-Transport-Security "max-age=31536000" always;

    root /opt/app/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_set_header Host $http_host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_pass http://127.0.0.1:8080/;
    }
}
```

## 五、反向代理

```nginx title="/opt/nginx/http/proxy.conf"
server {
    listen 80;
    server_name app.example.com;

    location / {
        proxy_set_header Host $http_host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 60s;
        proxy_send_timeout    600s;
        proxy_read_timeout    600s;
        proxy_pass http://127.0.0.1:3000;
    }
}
```

## 六、WebSocket 代理

代理 WebSocket 服务时需额外设置 `Upgrade` 和 `Connection` 请求头，否则 WS 握手会失败。

```nginx title="/opt/nginx/http/ws.conf"
map $http_upgrade $connection_upgrade {
    default upgrade;
    ''      close;
}

server {
    listen 80;
    server_name ws.example.com;

    location / {
        proxy_set_header Host $http_host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        proxy_connect_timeout 60s;
        proxy_read_timeout    3600s;
        proxy_send_timeout    3600s;
        proxy_pass http://127.0.0.1:3001;
    }
}
```

> [!TIP]
> `map` 指令需放在 `http` 块内（通常在主配置文件中定义一次即可），用于自动将 HTTP 升级为 WebSocket 连接。`proxy_read_timeout` 建议设置较大值，防止长连接被提前断开。

## 七、TCP 流量转发（stream 模块）

适用于转发 MySQL、Redis 等 TCP 服务。`stream` 块与 `http` 块同级。以 MySQL 为例（安装参见 [CentOS MySQL 5.7 安装](/posts/centos-mysql-57/)）：

```nginx title="/opt/nginx/server/mysql.conf"
upstream mysql3306 {
    hash $remote_addr consistent;
    server 192.168.1.58:3306 weight=5 max_fails=3 fail_timeout=30s;
}

server {
    listen 33306;
    proxy_connect_timeout 100s;
    proxy_timeout 500s;
    proxy_pass mysql3306;
}
```

> [!NOTE]
> 使用 stream 模块前需确认编译时包含了该模块：

```bash
nginx -V 2>&1 | grep with-stream
```

## 八、MinIO 反向代理

> [!NOTE]
> 尚未部署 MinIO？参见：[MinIO 对象存储安装指南](/posts/minio-install/)

MinIO 签名验证依赖 `Host` 头，必须正确透传，否则出现 `The request signature we calculated does not match the signature you provided` 错误。

```nginx title="/opt/nginx/http/minio.conf"
server {
    listen 9000;
    server_name minio.example.com;
    client_max_body_size 0;

    location / {
        proxy_set_header Host $http_host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_pass http://127.0.0.1:9001;
    }
}
```
