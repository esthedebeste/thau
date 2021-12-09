import { createHmac } from "node:crypto";
import OAuth from "oauth-1.0a";
import { request } from "undici";
import { secrets } from "../../utils.js";
import { Callback, Redirect, requireQuery } from "../shared.js";
const { key, secret } = secrets("twitter");
const oauth = new OAuth({
	consumer: {
		key,
		secret,
	},
	signature_method: "HMAC-SHA1",
	hash_function: (base_string, key) =>
		createHmac("sha1", key).update(base_string).digest("base64"),
});
export const redirect: Redirect = async (req, res) => {
	const cb = new URL("/auth/twitter/callback", req.purl).href;
	const tokenRequestURL =
		"https://api.twitter.com/oauth/request_token?oauth_callback=" +
		encodeURIComponent(cb);
	const authorize = oauth.authorize({
		method: "POST",
		url: tokenRequestURL,
	});
	const result = await request(tokenRequestURL, {
		method: "POST",
		headers: {
			Authorization: oauth.toHeader(authorize).Authorization,
		},
	});
	let body = "";
	for await (const chunk of result.body) body += chunk;
	const token = Object.fromEntries(new URLSearchParams(body)) as {
		oauth_token: string;
		oauth_token_secret: string;
		oauth_callback_confirmed: "true";
	};
	if (token.oauth_callback_confirmed !== "true")
		return res.error("Twitter Error", 500);
	req.session.login = { twitter: { oauthToken: token.oauth_token } };
	res.saveSession();
	res.redirect(
		"https://api.twitter.com/oauth/authorize?oauth_token=" + token.oauth_token
	);
};
export const callback: Callback = [
	requireQuery(["oauth_token", "oauth_verifier"]),
	async (req, res) => {
		const { oauth_token, oauth_verifier } = req.query;
		const { oauthToken } = req.session.login.twitter;
		if (oauthToken !== oauth_token) return res.error("Twitter Error", 400);

		const result = await request(
			`https://api.twitter.com/oauth/access_token?oauth_verifier=${oauth_verifier}&oauth_token=${oauthToken}`,
			{ method: "POST" }
		);
		let body = "";
		for await (const chunk of result.body) body += chunk;
		const token = Object.fromEntries(new URLSearchParams(body)) as {
			oauth_token: string;
			oauth_token_secret: string;
			user_id: string;
			screen_name: string;
		};
		req.user = {
			id: token.user_id,
			type: "twitter",
			extra: {
				name: token.screen_name,
			},
		};
	},
];

redirect.savesSession = true;
export const name = "Twitter";
