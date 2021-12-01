import { Coggers, serveStatic } from "coggers";
import { coggersSession } from "coggers-session";
import { webcrypto } from "node:crypto";
import { STATUS_CODES } from "node:http";
import * as discord from "./accounts/discord.js";
import * as github from "./accounts/github.js";
import { getsert } from "./database.js";
import { sample } from "./sample.js";
import { Handler, Req, Res, secrets } from "./utils.js";

const { subtle } = webcrypto as unknown as typeof globalThis.Crypto.prototype;
type ThauToken = {
	uid: string;
	iat: number;
	aud: string;
};
const { publicKey: publicJWK, privateKey: privateJWK } = secrets("signing");
const sessionSecret: string[] = secrets("session");

const SHATYPE = "SHA-384";
const privateKey = await subtle.importKey(
	"jwk",
	privateJWK,
	{ name: "ECDSA", hash: SHATYPE, namedCurve: privateJWK.crv },
	false,
	["sign"]
);
const decodeB64url = (str: string) => Buffer.from(str, "base64url");
const sessionPass = sessionSecret.map(decodeB64url);

const postlogin: Handler = async (req, res) => {
	const { callback, user } = req.session;
	if (!callback) return res.status(400).send("No callback");

	const uid = await getsert(user.type, user.id);
	const token: ThauToken = {
		uid,
		iat: Date.now() / 1000,
		aud: callback,
	};
	const bufToken = Buffer.from(JSON.stringify(token));
	const sign = await subtle.sign(
		{
			name: "ECDSA",
			hash: { name: SHATYPE },
		},
		privateKey,
		bufToken
	);
	const signature = Buffer.from(sign).toString("base64url");
	const b64token = bufToken.toString("base64url");
	const redirect = `${callback}?token=${b64token}&signature=${signature}`;
	res.deleteSession();
	res.redirect(redirect);
};
const preredirect =
	(saveSession = true): Handler =>
	(req, res) => {
		if (req.query.callback) {
			req.session.callback = req.query.callback;
			if (saveSession) res.saveSession();
		} else if (!req.session.callback) res.error("No Callback", 400);
	};
const coggers = new Coggers(
	{
		...serveStatic(new URL("../static", import.meta.url)),
		$: [
			coggersSession({
				password: sessionPass,
				name: "thau-session",
				cookie: {
					maxAge: 604800,
					sameSite: "Lax",
					httpOnly: true,
					path: "/",
				},
			}),
			(req, res) => {
				if (req.headers["x-forwarded-proto"])
					if (req.headers["x-forwarded-proto"] === "http")
						// Redirect http to https
						return res.redirect(`https://${req.host}${req.url}`);
					else req.purl.protocol = req.headers["x-forwarded-proto"] + ":";
				res.set("Access-Control-Allow-Origin", "*");
				res.error = (msg: string, code = 400) => res.status(code).send(msg);
			},
			process.env.NODE_ENV === "production"
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
							const type = ~~(code / 100);
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
		],
		keys: {
			$get(_, res) {
				res.json({ key: publicJWK, shatype: SHATYPE });
			},
		},
		auth: {
			$get(req: Req, res: Res) {
				const callback = req.query.callback;
				if (!callback) return res.status(400).send("No callback specified");
				req.session = { callback };
				res.saveSession();
				res.sendFile(new URL("../static/auth.html", import.meta.url));
			},
			// future: construct this bluepart automatically
			discord: {
				$get: [preredirect(!discord.redirect.savesSession), discord.redirect],
				callback: { $get: [discord.callback, postlogin] },
			},
			github: {
				$get: [preredirect(!github.redirect.savesSession), github.redirect],
				callback: { $get: [github.callback, postlogin] },
			},
		},
		sample,
	},
	{
		xPoweredBy: "a bunch of little cogwheels spinning around",
	}
);

const PORT = process.env.PORT || 8080;
await coggers.listen(PORT);
console.log(`Thau listening @ http://localhost:${PORT}/`);
export const server = coggers.server;
