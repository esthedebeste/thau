import type { Request, Response } from "coggers";
import type { SessionedResponse } from "coggers-session";
import { readFileSync } from "node:fs";

export type Req = Request & {
	session: Partial<{
		callback: string;
		login: {
			twitch: {
				nonce: string;
				state: string;
			};
		};
	}>;
	user?: {
		type:
			| "discord"
			| "github"
			| "twitch" /* TODO: | "twitter" | "youtube" etc */;
		id: string;
		/* TODO: find out where to put the extra data (should it be signed?) */
		extra?: {
			name: string;
			avatar: string;
		};
	};
};

export type Res = Response &
	SessionedResponse & {
		error: (msg: string, code?: number) => void;
	};

export type Handler<Params extends string = never> = (
	req: Req,
	res: Res,
	params: Record<Params, string>
) => Promise<void> | void;

export type Redirect = {
	(req: Req, res: Res): Promise<any> | any;
	savesSession: boolean;
};
export type Callback = Handler[];

export const requireQuery =
	(required: string[]): Handler =>
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

export const prod = !process.env.NODE_ENV?.toLowerCase().includes("prod");
