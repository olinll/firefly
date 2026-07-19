import type { DynamicConfig } from "@/types/dynamicConfig";

export const dynamicConfig: DynamicConfig = {
	// 页面标题，如果留空则使用 i18n 中的翻译
	title: "",

	// 页面描述文本，如果留空则使用 i18n 中的翻译
	description: "",

	// 是否为每条动态启用评论，需要先在 commentConfig.ts 启用评论系统
	showComment: true,

	// 每页显示的动态数量
	itemsPerPage: 20,

	// Memos 集成（配置后将从 Memos 拉取动态，忽略本地 content/dynamic/）
	memos: {
		// Memos 服务地址
		serverUrl: "https://note.olinl.com",
		// Memos API Token（个人设置 → 访问令牌）
		accessToken: "memos_pat_MHvkGkJg9fpzEhQCyPsNb9O05SoT6bsA",
		// 每页获取条数
		pageSize: 100,
		// 显示规则："all" 显示全部, "public" 仅公开
		visibility: "public",
		// 标签过滤：仅显示包含这些标签的 memos，空数组或删除此字段则显示全部
		// 例如 ["日常", "技术"], 则只显示标签包含 "日常" 或 "技术" 的 memo
		tags: ["blog"],
	},
};
