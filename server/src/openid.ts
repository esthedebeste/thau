import { Blueprint } from "coggers";
import { SignJWT } from "jose";
import { requireQuery } from "./auth/shared.js";
import { getsert } from "./database.js";
import { extraScopes, Handler, keys, pubkeys, Req, Res } from "./utils.js";

type OIDCToken = {
	iss: string;
	sub: string;
	iat: number;
	exp: number;
	aud: string;
	nonce: string;
	extra: {
		name?: string;
		avatar?: string;
	};
};
export const prelogin: Handler = (req, res) => {
	if (!req.session.callback) res.error("No callback", 400);
	if (!req.session.openid) res.error("Not in openid mode", 400);
};
const issuer = "https://thau.herokuapp.com";
export const postlogin: Handler = async (req, res) => {
	const user = req.user;
	const { callback, openid, scopes } = req.session;
	if (!callback) return res.status(400).send("No callback");

	const uid = await getsert(user.type, user.id);
	const iat = Date.now() / 1000;
	const extra = {};
	for (const scope of scopes)
		if (scope in user.extra) extra[scope] = user.extra[scope];
	const token: OIDCToken = {
		iss: issuer,
		sub: uid,
		iat,
		exp: iat + 120 /* 2 mins */,
		aud: callback,
		nonce: openid.nonce,
		extra,
	};
	const signing = new SignJWT(token);
	const key = keys[Math.floor(Math.random() * keys.length)];
	signing.setProtectedHeader({
		alg: key.publicJWK.alg,
		typ: "JWT",
		kid: key.kid,
	});
	const jwt = await signing.sign(key.private);
	res.deleteSession();
	res.redirect(`${callback}?id_token=${jwt}&state=${openid.state}`);
};
const validScopes = new Set(["openid", ...extraScopes]);
export const preredirect = (saveSession = true): Handler[] =>
	[
		requireQuery(["scope", "response_type", "redirect_uri", "state", "nonce"]),
		(req: Req, res: Res) => {
			const { scope, response_type, client_id, redirect_uri, state, nonce } =
				req.query;
			if (!scope.includes("openid")) return res.error("No openid scope", 400);
			const scopes = scope.split(" ").filter(s => validScopes.has(s));
			if (response_type !== "id_token")
				return res.error("Invalid response_type, expected `id_token`", 400);
			if (client_id != null && client_id !== redirect_uri)
				return res.error(
					`When providing client_id, it should match the redirect_uri ("${client_id}"!="${redirect_uri}")`,
					400
				);
			req.session = {
				callback: redirect_uri,
				scopes,
				openid: {
					state,
					nonce,
				},
			};
		},
		saveSession ? (_req, res) => res.saveSession() : [],
	].flat();
const idTokenSigningAlgs = [...new Set(pubkeys.map(key => key.alg))];
export const openid: Blueprint = {
	"openid-configuration": {
		$get(req, res) {
			const base = `${req.purl.protocol}//${req.host}`;
			res.json({
				issuer,
				authorization_endpoint: base + "/auth/",
				jwks_uri: base + "/key",
				response_types_supported: ["id_token"],
				id_token_signing_alg_values_supported: idTokenSigningAlgs,
				scopes_supported: [...validScopes],
				claims_supported: [],
			});
		},
	},
};
