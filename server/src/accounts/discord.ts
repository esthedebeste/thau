import { Handler } from "coggers";
import { request } from "undici";
import { Req, requireQuery, Res, secrets } from "../utils.js";

const { id, secret } = secrets("discord");
async function loginToDiscord(
	code: string,
	redirect: string
): Promise<{ access_token: string }> {
	const result = await request("https://discord.com/api/v8/oauth2/token", {
		method: "POST",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded",
			"User-Agent": "Thau",
		},
		body: `client_id=${id}&client_secret=${secret}&grant_type=authorization_code&code=${code}&redirect_uri=${redirect}&scope=identify`,
	});
	let body = "";
	for await (const chunk of result.body) body += chunk;
	return JSON.parse(body);
}

type User = {
	id: `${number}`;
	username: string;
	discriminator: `${number}`;
	avatar: string;
	flags: number;
	banner: string;
	accent_color: number;
	premium_type: number;
	public_flags: number;
};

async function getUserData(token: string): Promise<User> {
	const result = await request("https://discord.com/api/v8/users/@me", {
		method: "GET",
		headers: {
			Authorization: `Bearer ${token}`,
			"User-Agent": "Thau",
		},
	});
	let body = "";
	for await (const chunk of result.body) body += chunk;
	return JSON.parse(body);
}

export const callback: Handler[] = [
	requireQuery(["code"]),
	async (req: Req, res: Res) => {
		const code = req.query.code;
		try {
			const session = await loginToDiscord(
				code,
				encodeURIComponent(req.purl.origin + req.purl.pathname)
			);
			const user = await getUserData(session.access_token);
			req.session.user = {
				type: "discord",
				id: user.id,
				extra: {
					username: user.username,
					avatar: `https://cdn.discordapp.com/${user.id}/${user.avatar}`,
				},
			};
		} catch (err) {
			res.error("Discord Error.", 500);
		}
	},
];

export const redirect = (req: Req, res: Res) => {
	const cb = encodeURIComponent(
		new URL("/auth/discord/callback", req.purl).href
	);
	res.redirect(
		`https://discord.com/api/oauth2/authorize?client_id=${id}&redirect_uri=${cb}&response_type=code&scope=identify`
	);
};
