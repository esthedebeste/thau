import { Blueprint, serveStatic } from "coggers";
import * as openid from "../openid.js";
import { extraScopes, Handler, Req, Res } from "../utils.js";
import * as discord from "./accounts/discord.js";
import * as github from "./accounts/github.js";
import * as google from "./accounts/google.js";
import * as twitch from "./accounts/twitch.js";
import * as twitter from "./accounts/twitter.js";

// @ts-expect-error
const listFormat = new Intl.ListFormat("en-GB", {
	style: "long",
	type: "conjunction",
});
// Full bluepart for /auth/
export const auth = (
	preredirect: (saveSession: boolean) => Handler[],
	prelogin: Handler,
	postlogin: Handler
): Blueprint => {
	const accounts: [string, string][] = [];
	const bluepart: Blueprint = {
		...serveStatic(new URL("../../static/auth", import.meta.url)),
		$get(req: Req, res: Res) {
			const callback = req.query.callback || req.query.redirect_uri;
			if (!callback) return res.status(400).send("No callback specified");
			const scopes =
				req.query.scope?.split(" ").filter(scope => extraScopes.has(scope)) ||
				extraScopes;
			res.render("auth", {
				query: req.purl.search,
				callback: new URL(callback, req.purl.origin),
				scopes: listFormat.format(scopes),
				accounts,
			});
		},
	};

	for (const account of [discord, github, twitch, twitter, google]) {
		const save = !account.redirect.savesSession;
		bluepart[account.name.toLowerCase()] = <Blueprint>{
			async $get(req: Req, res: Res, params) {
				const oidc = req.query.redirect_uri;
				const pre = oidc ? openid.preredirect : preredirect;
				for (const handler of pre(save)) {
					await handler(req, res, params);
					if (res.writableEnded) return;
				}
				await account.redirect(req, res, params);
			},
			callback: {
				async $get(req: Req, res: Res, params) {
					const oidc = req.session.openid;
					const pre = oidc ? openid.prelogin : prelogin;
					await pre(req, res, params);
					if (res.writableEnded) return;
					for (const handler of account.callback) {
						await handler(req, res, params);
						if (res.writableEnded) return;
					}
					const post = oidc ? openid.postlogin : postlogin;
					await post(req, res, params);
				},
			},
		};
		accounts.push([account.name, account.name.toLowerCase()]);
	}
	return bluepart;
};
