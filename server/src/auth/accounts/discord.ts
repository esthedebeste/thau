import { secrets } from "../../utils.js";
import { Callback, getJSON, Redirect, requireQuery } from "../shared.js";

const { id, secret } = secrets("discord");
const loginToDiscord = (code: string, redirect: string) =>
	getJSON<{ access_token: string }>("https://discord.com/api/v8/oauth2/token", {
		method: "POST",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded",
			"User-Agent": "Thau",
		},
		body: `client_id=${id}&client_secret=${secret}&grant_type=authorization_code&code=${code}&redirect_uri=${redirect}&scope=identify`,
	});

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

const getUserData = (token: string) =>
	getJSON<User>("https://discord.com/api/v8/users/@me", {
		method: "GET",
		headers: {
			Authorization: `Bearer ${token}`,
			"User-Agent": "Thau",
		},
	});

export const callback: Callback = [
	requireQuery(["code"]),
	async (req, res) => {
		const code = req.query.code;
		try {
			const session = await loginToDiscord(
				code,
				encodeURIComponent(req.purl.origin + req.purl.pathname)
			);
			const user = await getUserData(session.access_token);
			req.user = {
				type: "discord",
				id: user.id,
				extra: {
					name: user.username,
					avatar: `https://cdn.discordapp.com/${user.id}/${user.avatar}`,
				},
			};
		} catch {
			res.error("Discord Error.", 500);
		}
	},
];

export const redirect: Redirect = (req, res) => {
	const cb = encodeURIComponent(
		new URL("/auth/discord/callback", req.purl).href
	);
	res.redirect(
		`https://discord.com/api/oauth2/authorize?client_id=${id}&redirect_uri=${cb}&response_type=code&scope=identify`
	);
};

redirect.savesSession = false;
export const name = "Discord";
