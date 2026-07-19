export type DynamicConfig = {
	title?: string;
	description?: string;
	showComment?: boolean;
	itemsPerPage?: number;
	// Memos 集成（配置后将从 Memos 拉取动态，忽略本地 content/dynamic/）
	memos?: {
		// Memos 服务地址，例如 "https://memos.example.com"
		serverUrl: string;
		// Memos API Token（访问令牌）
		accessToken: string;
		// 每页获取条数，默认 100
		pageSize?: number;
		// 显示规则："all" 显示全部, "public" 仅公开
		visibility?: "all" | "public";
		// 标签过滤：仅显示包含这些标签的 memos，不配置或空数组则显示全部
		tags?: string[];
	};
};
