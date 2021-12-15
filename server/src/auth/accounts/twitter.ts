import { createHash } from "node:crypto";
import { request } from "undici";
import { secrets } from "../../utils.js";
import {
	Callback,
	generateNonce,
	getJSON,
	Redirect,
	requireQuery,
} from "../shared.js";
const {
	oauth2: { id, secret },
} = secrets("twitter");
const baseRedirURL = `https://twitter.com/i/oauth2/authorize?response_type=code&client_id=${id}&scope=users.read%20tweet.read&code_challenge_method=S256`;
export const redirect: Redirect = async (req, res) => {
	const codeVerifier = generateNonce(64);
	const codeChallenge = createHash("SHA256")
		.update(codeVerifier)
		.digest("base64url");
	const twitter = {
		codeVerifier,
		state: generateNonce(64),
	};
	req.session.login = { twitter };
	res.saveSession();
	const cb = new URL("/auth/twitter/callback", req.purl).href;
	res.redirect(
		baseRedirURL +
			`&redirect_uri=${cb}&code_challenge=${codeChallenge}&state=${twitter.state}`
	);
};
redirect.savesSession = true;

const authorization =
	"Basic " + Buffer.from(`${id}:${secret}`).toString("base64");
export const callback: Callback = [
	requireQuery(["state", "code"]),
	async (req, res) => {
		const { state: qState, code } = req.query;
		const { state, codeVerifier } = req.session.login.twitter;
		if (qState !== state) res.error("Invalid state.", 400);
		const cb = req.purl.origin + req.purl.pathname;
		const accessToken = await request(
			"https://api.twitter.com/2/oauth2/token",
			{
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
					"User-Agent": "Thau",
					authorization,
				},
				body: new URLSearchParams({
					code,
					grant_type: "authorization_code",
					client_id: id,
					redirect_uri: cb,
					code_verifier: codeVerifier,
				}).toString(),
			}
		);
		if (accessToken.statusCode !== 200) return res.error("Twitter Error.", 500);
		let body = "";
		for await (const chunk of accessToken.body) body += chunk;
		const { access_token } = JSON.parse(body);
		const { data: user } = await getJSON<{
			data: {
				name: string;
				username: string;
				id: string;
				profile_image_url: string;
			};
		}>("https://api.twitter.com/2/users/me?user.fields=profile_image_url", {
			method: "GET",
			headers: {
				authorization: `Bearer ${access_token}`,
			},
		});
		// Higher resolution profile image
		const avatar = user.profile_image_url.replace(/_\w+\.(\w+)$/, ".$1");
		req.user = {
			type: "twitter",
			id: user.id,
			extra: {
				name: user.name,
				avatar,
			},
		};
	},
];

export const name = "Twitter";
