import { jwtVerify } from "jose";
import { createPublicKey, JsonWebKey, KeyObject } from "node:crypto";
import {
	Callback,
	generateNonce,
	getJSON,
	Redirect,
	requireQuery,
} from "./shared.js";

type DiscoveryDocument = {
	authorization_endpoint: string;
	token_endpoint: string;
	issuer: string;
	jwks_uri: string;
};

// Base openid app from a discovery document
export const openid = async (
	{
		jwks_uri,
		token_endpoint,
		issuer,
		authorization_endpoint,
	}: DiscoveryDocument,
	{
		id,
		secret,
		name,
		prompt,
		nameKey,
		pictureKey,
	}: {
		id: string;
		secret: string;
		name: "twitch" | "google";
		nameKey: string;
		pictureKey: string;
		/** google's is `"prompt","consent"`, twitch's is `"force_verify","true"` */
		prompt: [string, string];
	}
) => {
	let key: KeyObject;
	const getKey = async () => {
		if (key) return key;
		else {
			const keys = await getJSON<{ keys: JsonWebKey[] }>(jwks_uri);
			key = createPublicKey({
				key: keys.keys[0],
				format: "jwk",
			});
			return key;
		}
	};
	const tokenQuery = new URLSearchParams({
		client_id: id,
		client_secret: secret,
		grant_type: "authorization_code",
	});
	const baseTokenURL = `${token_endpoint}?${tokenQuery}`;
	const callback: Callback = [
		requireQuery(["code", "state"]),
		async (req, res) => {
			if (req.session.login[name].state !== req.query.state)
				return res.error("Invalid State", 400);
			const code = req.query.code;
			const cb = req.purl.origin + req.purl.pathname;
			const tokens = await getJSON<{ id_token: string }>(
				baseTokenURL + `&code=${code}&redirect_uri=${cb}`,
				{ method: "POST" }
			);
			const key = await getKey();
			try {
				const jwt = await jwtVerify(tokens.id_token, key, {
					audience: id,
					issuer,
				});
				const { nonce, sub } = jwt.payload;
				if (nonce !== req.session.login[name].nonce)
					return res.error("Invalid nonce", 400);
				req.user = {
					type: name,
					id: sub,
					extra: {
						name: jwt.payload[nameKey] as string,
						avatar: jwt.payload[pictureKey] as string,
					},
				};
			} catch {
				return res.error("Invalid token", 400);
			}
		},
	];

	const claims = {
		id_token: {
			[nameKey]: null,
			[pictureKey]: null,
		},
	};
	const redirQuery = new URLSearchParams({
		client_id: id,
		response_type: "code",
		scope: "openid",
		claims: JSON.stringify(claims),
		[prompt[0]]: prompt[1],
	});
	const baseRedirURL = `${authorization_endpoint}?${redirQuery}`;
	const cbName = `/auth/${name}/callback`;
	const redirect: Redirect = (req, res) => {
		const cb = req.purl.origin + cbName;
		const openid = {
			nonce: generateNonce(32),
			state: generateNonce(32),
		};
		req.session.login = { [name]: openid };
		res.saveSession();
		res.redirect(
			baseRedirURL +
				`&redirect_uri=${cb}&nonce=${openid.nonce}&state=${openid.state}`
		);
	};
	redirect.savesSession = true;
	return {
		callback,
		redirect,
	};
};
