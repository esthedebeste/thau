import { secrets } from "../../utils.js";
import { Callback, getJSON, Redirect, requireQuery } from "../shared.js";

const { id, secret } = secrets("github");

const loginToGithub = (code: string) =>
	getJSON<{
		access_token: string;
		scope: string;
		token_type: string;
	}>(
		`https://github.com/login/oauth/access_token?code=${code}&client_id=${id}&client_secret=${secret}`,
		{
			method: "POST",
			headers: {
				Accept: "application/json",
				"User-Agent": "Thau",
			},
		}
	);

/**
 * https://docs.github.com/en/rest/reference/users#get-the-authenticated-user
 * @param {string} token - GitHub access token
 * @returns {Promise<object>} GitHub user profile
 */
const getGithubUser = (token: string) =>
	getJSON<{
		login: string;
		id: number;
		name: string;
		avatar_url: string;
		type: "User";
	}>("https://api.github.com/user", {
		method: "GET",
		headers: {
			Authorization: `Bearer ${token}`,
			Accept: "application/vnd.github.v3+json",
			"User-Agent": "Thau",
		},
	});

export const callback: Callback = [
	requireQuery(["code"]),
	async (req, res) => {
		const code = req.query.code;
		try {
			const { access_token } = await loginToGithub(code);
			const user = await getGithubUser(access_token);
			req.user = {
				type: "github",
				id: String(user.id),
				extra: {
					name: user.name,
					avatar: user.avatar_url,
				},
			};
		} catch (error) {
			console.error(error);
			res.error("GitHub Error.", 500);
		}
	},
];

export const redirect: Redirect = (req, res) => {
	const cb = new URL("/auth/github/callback", req.purl).href;
	res.redirect(
		`https://github.com/login/oauth/authorize?scope=user:email&client_id=${id}&redirect_uri=${cb}&login` /* login query parameter to make github not automatically authenticate */
	);
};

redirect.savesSession = false;
export const name = "GitHub";
