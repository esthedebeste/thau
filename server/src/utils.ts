import type { Request, Response } from "coggers";
import type { SessionedResponse } from "coggers-session";
import { readFileSync } from "node:fs";

export type Req = Request & {
	session: Partial<{
		callback: string;
		login: {
			twitch?: {
				nonce: string;
				state: string;
			};
			twitter?: {
				oauthToken: string;
			};
			google?: {
				state: string;
				nonce: string;
			};
		};
	}>;
	user?: {
		type:
			| "discord"
			| "github"
			| "twitch"
			| "twitter"
			| "google" /* TODO: | "steam" etc */;
		id: string;
		/* TODO: find out where to put the extra data (in the token or just in the query?) */
		extra?: Partial<{
			name: string;
			avatar: string;
		}>;
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

export const secrets = (filename: string) =>
	JSON.parse(
		process.env[`THAU_${filename.toUpperCase()}_SECRET`] ||
			readFileSync(
				new URL("../secrets/" + filename + ".json", import.meta.url),
				"utf8"
			)
	);

export const prod = !process.argv.includes("--dev");
