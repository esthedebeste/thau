import { Coggers, renderEngine } from "coggers";
import { coggersSession } from "coggers-session";
import { webcrypto } from "node:crypto";
import { STATUS_CODES } from "node:http";
import { renderFile } from "poggies";
import { auth } from "./auth/blueprint.js";
import { requireQuery } from "./auth/shared.js";
import { getsert } from "./database.js";
import { openid } from "./openid.js";
import { sample } from "./sample.js";
import {
	algorithm,
	extraScopes,
	Handler,
	keys,
	prod,
	pubkeys,
	Req,
	Res,
	secrets,
	SHATYPE,
} from "./utils.js";
const { subtle } = webcrypto as unknown as typeof window.crypto;
type ThauToken = {
	uid: string;
	iat: number;
	aud: string;
	extra: {
		name?: string;
		avatar?: string;
	};
};
const sessionSecret: string[] = secrets("session");

const sessionPass = sessionSecret.map(str => Buffer.from(str, "base64"));

const prelogin: Handler = (req, res) => {
	if (!req.session.callback) res.error("No Callback", 400);
};
const postlogin: Handler = async (req, res) => {
	const user = req.user;
	const { callback, scopes } = req.session;
	if (!callback) return res.status(400).send("No callback");

	const uid = await getsert(user.type, user.id);
	const extra = {};
	for (const scope of scopes)
		if (scope in user.extra) extra[scope] = user.extra[scope];
	const token: ThauToken = {
		uid,
		iat: Date.now() / 1000,
		aud: callback,
		extra,
	};
	const bufToken = Buffer.from(JSON.stringify(token));
	// old endpoint only has a single key
	const key = keys[0];
	const sign = await subtle.sign(algorithm, key.private, bufToken);
	const signature = Buffer.from(sign).toString("base64url");
	const b64token = bufToken.toString("base64url");
	const redirect = `${callback}?token=${b64token}&signature=${signature}&keyid=${key.kid}`;
	res.deleteSession();
	res.redirect(redirect);
};
const preredirect = (saveSession = true): Handler[] =>
	[
		requireQuery(["callback"]),
		(req: Req) =>
			(req.session = {
				callback: req.query.callback,
				scopes: req.query.scopes
					?.split(" ")
					.filter(scope => extraScopes.has(scope)) || [...extraScopes],
			}),
		saveSession ? (_req: Req, res: Res) => res.saveSession() : [],
	].flat();
const coggers = new Coggers(
	{
		$: [
			coggersSession({
				password: sessionPass,
				name: "thau-session",
				cookie: {
					maxAge: 604800,
					sameSite: "Lax",
					httpOnly: true,
					path: "/auth/",
					secure: prod,
				},
			}),
			(req, res) => {
				if (req.headers["x-forwarded-proto"])
					if (req.headers["x-forwarded-proto"] === "http")
						// Redirect http to https
						return res.redirect(`https://${req.host}${req.url}`, 301);
					else req.purl.protocol = req.headers["x-forwarded-proto"] + ":";
				res.set({
					"Strict-Transport-Security": "max-age=63072000",
					"Access-Control-Allow-Origin": "*",
					"X-Content-Type-Options": "nosniff",
					"X-Frame-Options": "DENY",
					"Content-Security-Policy":
						"default-src 'none'; style-src 'self'; script-src 'self'; img-src 'self' https://images.unsplash.com; connect-src 'self';",
					"X-XSS-Protection": "1; mode=block",
				});
				res.error = (msg: string, code = 400) => res.status(code).send(msg);
			},
			prod
				? []
				: // dev logger
				  (req, res) => {
						const colors = {
							2: "\x1b[36m",
							3: "\x1b[32m",
							4: "\x1b[31m",
							5: "\x1b[35m",
						};
						res.on("finish", () => {
							const code = res.statusCode;
							const type = Math.floor(code / 100);
							const color: string = colors[type];
							console.log(
								req.method +
									` \x1b[1m${color + code} \x1b[0m${color}` +
									(res.statusMessage || STATUS_CODES[code]) +
									` \x1b[0m${req.url}` +
									(res.headers.Location ? " => " + res.headers.Location : "")
							);
						});
				  },
			renderEngine(renderFile, new URL("../views", import.meta.url), "pog"),
		],
		info: {
			$get(_, res) {
				// Cache keys for 1 day
				res.set("Cache-Control", "max-age=86400, immutable, public");
				res.json({
					key: pubkeys[0],
					shatype: SHATYPE,
					algorithm,
				});
			},
		},
		keys: { $get: (_, res) => res.redirect("/info", 301) },
		/** Future endpoint, can have multiple keys */
		key: {
			$get(_, res) {
				res.json({
					keys: pubkeys,
					algorithm,
				});
			},
		},
		auth: auth(preredirect, prelogin, postlogin),
		openid,
		sample,
		$get(_req, res) {
			res.redirect("/sample");
		},
	},
	{
		xPoweredBy: [
			"a bunch of little cogwheels spinning around",
			"just a little guy",
			"three cats in a hat",
			"one (1) cogger",
			"gaming",
		][Math.floor(Math.random() * 5)],
	}
);
const PORT = process.env.PORT || 8080;
await coggers.listen(PORT);
console.log(`Thau listening @ http://localhost:${PORT}/`);
export const server = coggers.server;
