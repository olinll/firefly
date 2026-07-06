---
title: 跳过登录弹框：实现 Basic Auth 自动授权
slug: basic-auth-auto-login-bypass
published: 2025-01-03 00:00:00
updated: 2025-01-03 00:00:00
description: 详解如何通过 URL 传参、Nginx 反向代理注入 Header 以及浏览器插件等方式，实现对 Basic Auth 认证站点的免密自动登录。
image: ./images/0001.webp
category: 站点
tags: ["Basic Auth", "Nginx", "安全"]
draft: false
# pinned: false
---

## 前言

问题原因呢，是我在整理书签和密码填充工具的时候发现的一个问题，对于这样的弹框，因为是直接弹出在浏览器的，密码填充工具无法进行填充账号密码等信息。

下面的鉴权方式就是：`Basic Auth`

![](./images/0001.webp)

## 什么是Basic Auth？

Basic Auth，也称为 HTTP 基本认证（HTTP Basic Authentication），是一种用于 HTTP 协议的简单认证机制。在 Basic Auth 中，客户端在发送请求时，将用户名和密码以 Base64 编码的形式包含在请求头的 Authorization 字段中发送给服务器，服务器收到请求后，会解码 Authorization 字段并验证用户名和密码。

**如何判断你这个web页面是不是Basic Auth？**

先看弹窗样式，弹窗样式紧贴浏览器的搜索栏(上图)

打开F12 查看请求的接口响应头信息，看到Www-Authenticate的值包含Basic，并且状态码为401

![](./images/0002.webp)

## 解决问题

那么堡垒机是怎么解决此类问题的？

selenium操作这里Basic Auth网站的实现方式是：直接把用户名和密码拼接到URL中进行访问。

```sql
from selenium import webdriver
driver = webdriver.Chrome()
driver.get('http://admin:password@10.1.13.80:9100')
```

于是，我就使用他的方式进行拼接了一下，就访问成功了。

> [!WARNING]
> URL 中的凭据会出现在浏览器历史记录、服务器日志和 Referer 头中，仅在可信内网环境中使用此方式。

```sql
# 格式
http://<用户名>:<密码>@<ip地址或域名>:<端口号，如果是80可以不填>
https://<用户名>:<密码>@<ip地址或域名>:<端口号，如果是443可以不填>

#例如：
http://admin:password@10.1.13.80:9100
```

但是会报一个错误`Get server info from frps failed!`

这个错误是正常的用户名密码的参数传递和请求的不符，把url后面的路径删掉在访问就可以了。

## 编辑建议

> 以下建议基于本条目内容生成，仅供发布前参考。

### 文章内容建议
- 标题是"实现 Basic Auth 自动授权"，但目前只介绍了**URL 凭据拼接**一种方式，description 提到的"Nginx 反代注入 Header"和"浏览器插件"两种方式**未实际展开**，建议补齐这两个核心方案
- 建议补充"现代浏览器已逐步弃用 URL 凭据"的说明：Chrome 59+ / Firefox 59+ 已不再支持 `http://user:pass@host` 形式（出于安全考虑），导致本文主推方案在很多场景已失效
- 建议补充"Nginx 反代 + `proxy_set_header Authorization` + 后端应用配合 Basic Auth 解析"的完整配置示例
- 建议补充"ModHeader / Header Editor 等浏览器扩展"在客户端注入 Authorization 头的方法

### 修改建议
- 内文代码块标注为 `sql` 实际是 Python / URL 文本，建议改为 ```` ```url ```` 或 ```` ```text ````，避免高亮错误
- 第 3 节举例用 `admin:password` 这种占位符却标了真实 IP `10.1.13.80`，建议改用 `192.168.1.100` 或 `10.0.0.1` 之类 RFC1918 示例地址
- 文末"把 url 后面的路径删掉"是临时 workaround，建议明确说明"这是 frps 校验 URL 路径严格匹配"，避免读者不明就里

### 合并建议
- 候选合并对象：`nginx-guide`（Nginx 反代注入 Header 章节可并入 nginx-guide 的"反代"章节）
- 候选合并对象：`nginx-subfilter-html`（同属 Nginx 反代场景，但本篇是注入 Header、sub_filter 是注入 HTML，技术点不同）
- 合并理由：基础凭据拼接是 30 行小节，独立成文略单薄；建议把"URL 拼接 / Nginx 注入 Header / 浏览器插件"三个方案整合到 `nginx-guide` 作为"高级认证场景"小节
- 实际建议：建议**合并到 `nginx-guide`**，作为"代理 + 鉴权"专题小节

### slug 建议
- 当前：`basic-auth-auto-login-bypass`
- 建议：保留
- 理由：slug 准确描述"Basic Auth + 免登录 + 绕过"，命名规范、含义清晰；如合并到 nginx-guide 可不再使用

### 分类建议
- 建议归类到：网络
- 理由：内容核心是 HTTP Basic 认证机制的客户端绕过，与"代理/认证"主题契合
- 现分类 `技术插曲与避坑` 偏杂谈；按新分类方案建议改为「网络」

### tags 建议
- 建议：`[Basic Auth, Nginx]`
- 与现状对比：原 tags 为 `["Basic Auth", "Nginx", "安全"]`
- 差异说明：`安全` 偏宽泛且与"绕过"语义冲突，替换为更具体词可保留；`Nginx` 是关键技术（反代注入 Header 章节需要），建议保留

### 其他建议
- 全文 65 行，体量偏小；建议在补齐"Nginx 注入"和"浏览器插件"两节后达到 200+ 行，再保留为独立文章
- 文中 `image: ./images/0001.webp` 已有封面图，是这批 14 篇中少数有图的文章，建议保留并补充一张"Nginx 注入 Authorization 头的请求时序图"
