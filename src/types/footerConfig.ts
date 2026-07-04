export type FooterConfig = {
	enable: boolean; // 是否启用Footer HTML注入功能
	customHtml?: string; // 自定义HTML内容，用于添加备案号等信息
	icp?: { number: string; url: string }; // 工信部 ICP 备案
	policeRecord?: { number: string; url: string }; // 公安部公网安备
	status?: {
		enabled: boolean;
		heartbeatUrl: string;
		pageUrl: string;
		upLabel: string;
		degradedLabel: string;
		downLabel: string;
	};
};
