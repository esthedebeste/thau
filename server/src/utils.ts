import type { Middleware, Request, Response } from "coggers";
import type { SessionedResponse } from "coggers-session";
import { readFileSync } from "fs";

export type Req = Request & {
	session: Partial<{
		callback: string;
		uid: string;
		user: {
			type: "discord" /* TODO: | "twitch" | "github" | etc */;
			id: string;
			extra: {
				username: string;
				avatar: URL["href"];
			};
		};
	}>;
};
export type Res = Response &
	SessionedResponse & {
		error: (msg: string, code?: number) => void;
	};

export const requireQuery =
	(required: string[]): Middleware =>
	(req, res) => {
		const missing = required.filter(key => !req.query[key]);
		if (missing.length > 0)
			res
				.status(400)
				.send(`Missing required query parameter(s): ${missing.join(", ")}`);
	};

export const secrets = (filename: string) =>
	JSON.parse(
		process.env[`THAU_${filename.toUpperCase()}_SECRET`] ||
			readFileSync(
				new URL("../secrets/" + filename + ".json", import.meta.url),
				"utf8"
			)
	);
