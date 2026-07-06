---
title: 自建Umami统计
slug: umami-config
published: 2025-01-24 00:00:00
updated: 2025-01-24 00:00:00
description: 因为官方的API请求时间太久，所以自建了一个umami
image: api
category: 站点
tags: ["Umami", "配置"]
draft: false
# pinned: false
---

## 写在前面

Umami 是一个开源的分析工具，它可以帮助你了解你的网站的流量来源、用户行为、页面访问等信息。

Umami官方地址 [umami](https://umami.is)

Umami官方文档: [Umami - Doc](https://umami.is/docs)

Umami官方API: [Umami - API](https://umami.is/docs/api)

## 正文

这里需要注意一点，使用官方的api 只需要申请一个`API KEY` 就可以调用api了，如果使用自建服务器，需要先获取token，再进行调用。

## 认证

**POST /api/auth/login**

首先你需要获得一个令牌，才能发起 API 请求。你需要向端点发送以下请求：POST/api/auth/login

```json
{
  "username": "admin",
  "password": "umami"
}
```

如果成功，你应该会收到如下回复：

```json
{
  "token": "eyTMjU2IiwiY...4Q0JDLUhWxnIjoiUE_A",
  "user": {
    "id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    "username": "admin",
    "role": "admin",
    "createdAt": "2000-00-00T00:00:00.000Z",
    "isAdmin": true
  }
}
```

保存获取到的token值，在发送所有API请求时，需要在请求头中包含授权信息。你的请求头应该是这样的：Authorization: Bearer <token>

```bash
Authorization: Bearer eyTMjU2IiwiY...4Q0JDLUhWxnIjoiUE_A
```

每次需要权限的 API 调用都必须有授权令牌。

## 实现认证方式

```js

/**
 * 获取登录 Token (通过用户名/密码)
 * @param {string} baseUrl
 * @param {string} apiKey - 此处实际为 password
 */
async function fetchTokenData(baseUrl, apiKey) {
	const cached = localStorage.getItem(cacheTokenKey);
	if (cached) {
		try {
			const parsed = JSON.parse(cached);
			if (Date.now() - parsed.timestamp < cacheTTL) {
				return parsed.value;
			}
		} catch {
			localStorage.removeItem(cacheTokenKey);
		}
	}
	const res = await fetch(`${baseUrl}/api/auth/login`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			username: "admin",
			password: apiKey,
		}),
	});
	if (!res.ok) {
		throw new Error("获取 Umami 登录信息失败");
	}
	const data = await res.json();
	localStorage.setItem(
		cacheTokenKey,
		JSON.stringify({ timestamp: Date.now(), value: data.token }),
	);
	return data.token;
}

```

> [!IMPORTANT]
> 使用这种方式会在浏览器中暴露请求的用户名和密码，建议创建一个单独的用户，只用于获取统计数据。

## 邪修玩法

我们可以采用share key 认证方式，这样就不会暴露用户名和密码了。

原理：在umami网站中，我们可以将统计数据分享出去，使用户可以免登录查看统计数据。

分享页面请求了一下 `/api/share/{shareId}` 接口，返回了一个token，并且后面所有对api的请求都会带一个header `x-umami-share-token`，并且值和之前返回的token一致。

我们可以直接将上面的认证方法替换为`x-umami-share-token`，不需要使用用户名密码了。

```js
/**
 * 获取分享 Token 数据
 * @param {string} baseUrl - Umami 实例地址
 * @param {string} shareId - 分享 ID
 */
async function fetchShareData(baseUrl, shareId) {
	const cached = localStorage.getItem(cacheShareKey);
	if (cached) {
		try {
			const parsed = JSON.parse(cached);
			if (Date.now() - parsed.timestamp < cacheTTL) {
				return parsed.value;
			}
		} catch {
			localStorage.removeItem(cacheShareKey);
		}
	}
	// 请求分享 API
	const res = await fetch(`${baseUrl}/api/share/${shareId}`);
	if (!res.ok) {
		throw new Error("获取 Umami 分享信息失败");
	}
	const data = await res.json();

	// 写入 LocalStorage 缓存
	localStorage.setItem(
		cacheShareKey,
		JSON.stringify({ timestamp: Date.now(), value: data }),
	);
	return data;
}

```

## 编辑建议

> 以下建议基于本条目内容生成，仅供发布前参考。

### 文章内容建议
- 文章标题是「自建 Umami 统计」，但内容几乎全是「API 调用 + 认证方式」，没有「自建 Umami 服务」的部署步骤（Docker/docker-compose 部署 PostgreSQL + Umami），建议补充或改标题为「Umami 自建服务的 API 认证与使用」
- 建议补充 cacheTokenKey / cacheShareKey / cacheTTL 等常量的定义（文中 `fetchTokenData` 引用了 `cacheTokenKey`/`cacheTTL` 但未给出）
- 建议补充完整的 TypeScript 类型定义（响应体 `token`/`user` 字段、share 接口的返回结构）
- 建议补充 share 接口的「过期时间」与「token 刷新策略」（share token 也是会过期的）

### 修改建议
- 文章前两段描述的是「Umami 是什么 + 官方地址」，但与「自建 Umami 统计」标题期望的部署内容不符，建议重写引言或补上部署章节
- 「`因为官方的 API 请求时间太久`」开头描述较随意，建议改为更正式的开篇（如「Umami 官方 SaaS 平台有调用频率与时延限制，自建实例可避免这些限制并完全掌控数据」）
- 代码示例中 `password: apiKey` 的变量名容易让人误以为是 API Key，注释虽有「此处实际为 password」但建议改用 `username`/`password` 两个独立参数

### 合并建议
- 建议与「Umami 部署」文章（目前站内仅有此 API 文档文）合并，形成完整的「Umami 自建全流程」系列
- 候选合并对象：暂无可合并，建议先创建「Umami 部署」补齐前半部分

### slug 建议
- 当前：`umami-config`
- 建议：改为 `umami-api-auth`
- 理由：当前 slug 「config」语义模糊（是服务端配置？客户端配置？API 配置？），改为 `umami-api-auth` 精准体现文章主题

### 分类建议
- 建议归类到：服务
- 理由：Umami 是「自建应用」类的网站分析服务
- 与现状对比：当前 `HomeLab 私有云`，新分类「服务」更准确

### tags 建议
- 建议：`[Umami, 监控]`
- 与现状对比：当前 `["Umami", "配置"]`，差异：`配置` → `监控`（更准确反映 Umami 的「网站统计/监控」核心定位）

### 其他建议
- 建议补充 Umami v2 与 v3 在 API 路径上的差异（`/api/auth/login` vs `/api/auth/me`），目前站点用户可能使用不同版本
- 文中 `邪修玩法` 一节表述较口语化，作为博客没问题，但建议在「编辑建议」中提示作为保留文化，可在标题层级上做更清晰的导航（如「进阶方案：Share Token」）
