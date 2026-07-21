import { friendsConfig } from "@/config/friendsConfig";

export async function GET() {
	const friends = friendsConfig
		.filter((friend) => friend.enabled)
		.map(({ title, imgurl, desc, siteurl, tags }) => ({
			title,
			imgurl,
			desc,
			siteurl,
			tags: tags ?? [],
		}));

	return new Response(JSON.stringify(friends, null, 2), {
		headers: { "Content-Type": "application/json; charset=utf-8" },
	});
}
