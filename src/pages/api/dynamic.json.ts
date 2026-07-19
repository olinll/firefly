import { createMarkdownProcessor } from "@astrojs/markdown-remark";
import { dynamicConfig } from "@/config/dynamicConfig";

let processor: Awaited<ReturnType<typeof createMarkdownProcessor>> | null = null;
async function getProcessor() {
	if (!processor) processor = await createMarkdownProcessor();
	return processor;
}

const markdownImagePattern = /!\[([^\]]*)\]\((\S+?)(?:\s+["']([^"']*)["'])?\)/g;

interface MemoAttachment {
	name: string;
	filename: string;
	type: string;
	externalLink?: string;
}

interface Memo {
	name: string;
	content: string;
	createTime: string;
	displayTime?: string;
	visibility: string;
	tags?: string[];
	attachments?: MemoAttachment[];
}

interface MemosResponse {
	memos: Memo[];
}

async function fetchFromMemos(): Promise<
	{
		id: string;
		published: number;
		html: string;
		images: { alt: string; src: string }[];
		searchText: string;
	}[]
> {
	const { serverUrl, accessToken, pageSize = 100, visibility = "public", tags } =
		dynamicConfig.memos!;
	const baseUrl = serverUrl.replace(/\/+$/, "");
	const url = `${baseUrl}/api/v1/memos?pageSize=${pageSize}`;
	const headers: Record<string, string> = { "Content-Type": "application/json" };
	if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

	const response = await fetch(url, { headers });
	if (!response.ok) throw new Error(`Memos API error: HTTP ${response.status}`);

	const data: MemosResponse = await response.json();
	const mdProcessor = await getProcessor();

	const promises = (data.memos || [])
		.filter((memo) => visibility !== "public" || memo.visibility === "PUBLIC")
		.filter((memo) => !tags?.length || tags.some((tag) => memo.tags?.includes(tag)))
		.map(async (memo) => {
			const images: { alt: string; src: string }[] = [];

			const contentWithoutImages = memo.content.replace(
				markdownImagePattern,
				(_match: string, alt: string, src: string) => {
					images.push({ alt, src });
					return "";
				},
			);

			if (memo.attachments) {
				for (const att of memo.attachments) {
					if (att.type?.startsWith("image/")) {
						if (att.externalLink) {
							images.push({ alt: att.filename, src: att.externalLink });
						} else {
							// 本地附件：从 resource name + filename 构造访问 URL
							images.push({
								alt: att.filename,
								src: `${baseUrl}/file/${att.name}/${encodeURIComponent(att.filename)}`,
							});
						}
					}
				}
			}

			const rendered = await mdProcessor.render(contentWithoutImages);
			const id = memo.name.split("/").pop() || memo.name;

			return {
				id,
				published: new Date(memo.displayTime || memo.createTime).getTime(),
				html: rendered.code,
				images,
				searchText: (memo.content || "").replace(/[#*`\[\]]/g, "").trim(),
			};
		});

	return Promise.all(promises);
}

export async function GET() {
	try {
		if (dynamicConfig.memos?.serverUrl) {
			const data = await fetchFromMemos();
			return new Response(JSON.stringify(data), {
				headers: { "Content-Type": "application/json; charset=utf-8" },
			});
		}
	} catch (error) {
		console.error("Failed to fetch from Memos:", error);
	}
	return new Response(JSON.stringify([]), {
		headers: { "Content-Type": "application/json; charset=utf-8" },
	});
}
