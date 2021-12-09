import { Blueprint, Handler, serveStatic } from "coggers";
import { Req, Res } from "../utils.js";
import * as discord from "./accounts/discord.js";
import * as github from "./accounts/github.js";
import * as google from "./accounts/google.js";
import * as twitch from "./accounts/twitch.js";
import * as twitter from "./accounts/twitter.js";
// Full bluepart for /auth/
export const auth = (
	preredirect: (saveSession: boolean) => Handler,
	prelogin: Handler,
	postlogin: Handler
): Blueprint => {
	const accounts: [string, string][] = [];
	const bluepart: Blueprint = {
		...serveStatic(new URL("../../static/auth", import.meta.url)),
		$get(req: Req, res: Res) {
			const callback = req.query.callback;
			if (!callback) return res.status(400).send("No callback specified");
			res.render("auth", {
				callback,
				accounts,
			});
		},
	};
	for (const account of [discord, github, twitch, twitter, google]) {
		bluepart[account.name.toLowerCase()] = {
			$get: [preredirect(!account.redirect.savesSession), account.redirect],
			callback: { $get: [prelogin, account.callback, postlogin] },
		};
		accounts.push([account.name, account.name.toLowerCase()]);
	}
	return bluepart;
};
