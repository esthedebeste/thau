import { jwtVerify } from "jose";
import { assert } from "node:console";
import {
	createPublicKey,
	JsonWebKey,
	KeyObject,
	randomBytes,
} from "node:crypto";
import { request } from "undici";
import { Callback, Redirect, requireQuery, secrets } from "../utils.js";

const generateNonce = (len: number) =>
	randomBytes(len * 0.75).toString("base64url");
const { id, secret } = secrets("twitch");
const baseTokenURL = `https://id.twitch.tv/oauth2/token?client_id=${id}&client_secret=${secret}&grant_type=authorization_code`;
let key: KeyObject;
const getKey = async () => {
	if (key != null) return key;
	else {
		const res = await request("https://id.twitch.tv/oauth2/keys");
		let body = "";
		for await (const chunk of res.body) body += chunk;
		const keys = JSON.parse(body);
		assert(keys.keys[0].alg === "RS256");
		key = createPublicKey({ key: keys.keys[0] as JsonWebKey, format: "jwk" });
		return key;
	}
};

export const callback: Callback = [
	requireQuery(["code", "state"]),
	async (req, res) => {
		if (req.session.login.twitch.state !== req.query.state)
			return res.error("Invalid State", 400);
		const code = req.query.code;
		const cb = req.purl.origin + req.purl.pathname;
		const tokenRequest = await request(
			baseTokenURL + `&code=${code}&redirect_uri=${cb}`,
			{ method: "POST" }
		);
		let body = "";
		for await (const chunk of tokenRequest.body) body += chunk;
		// We only _really_ care about id_token, but we have to get an access token too because we're using OIDC authorization code flow
		const tokens = JSON.parse(body) as {
			id_token: string;
			access_token: string;
			refresh_token: string;
			token_type: "bearer";
			expires_in: number;
			scope: string[];
		};
		const key = await getKey();
		try {
			const jwt = await jwtVerify(tokens.id_token, key, {
				audience: id,
				issuer: "https://id.twitch.tv/oauth2",
			});
			const { nonce, picture, preferred_username, sub } = jwt.payload;
			if (nonce !== req.session.login.twitch.nonce)
				return res.error("Invalid nonce", 400);
			req.user = {
				type: "twitch",
				id: sub,
				extra: {
					name: preferred_username as string,
					avatar: picture as string,
				},
			};
		} catch {
			return res.error("Invalid token", 400);
		}
	},
];

const claims = JSON.stringify({
	id_token: { picture: true, preferred_username: true },
});
const baseRedirURL = `https://id.twitch.tv/oauth2/authorize?client_id=${id}&response_type=code&scope=openid&claims=${claims}&force_verify=true`;
export const redirect: Redirect = (req, res) => {
	const cb = new URL("/auth/twitch/callback", req.purl).href;
	const twitch = {
		nonce: generateNonce(32),
		state: generateNonce(32),
	};
	req.session.login = { twitch };
	res.saveSession();
	res.redirect(
		baseRedirURL +
			`&redirect_uri=${cb}&nonce=${twitch.nonce}&state=${twitch.state}`
	);
};

redirect.savesSession = true;
