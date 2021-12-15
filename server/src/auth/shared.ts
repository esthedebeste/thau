import { randomBytes } from "node:crypto";
import { Dispatcher, request } from "undici";
import { Handler } from "../utils.js";

export type Redirect = Handler & {
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

export const generateNonce = (len: number) =>
	randomBytes(len * 0.75).toString("base64url");

export const getJSON = async <T = any>(
	url: string | URL,
	options?: Omit<Dispatcher.RequestOptions, "origin" | "path">
): Promise<T> => {
	const result = await request(url, options);
	let body = "";
	for await (const chunk of result.body) body += chunk;
	return JSON.parse(body);
};
