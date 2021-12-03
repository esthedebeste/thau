import type { IncomingMessage, ServerResponse } from "node:http";
import type { ThauOptions, ThauToken } from "./index.js";
import { Thau } from "./node.js";
import {
	ExpiredToken,
	InvalidSignature,
	InvalidToken,
	MissingQuery,
	ThauError,
	UnknownError,
	WrongAudience,
} from "./thau.js";

type baseH = (
	req: IncomingMessage,
	res: ServerResponse
) => void | Promise<void>;

export type MWOptions<H extends baseH = baseH> = {
	error?: (reason: ThauError, ...reqres: Parameters<H>) => ReturnType<H>;
};

const messages = {
	missing_query: ([, missing]: MissingQuery) =>
		`[thau] Invalid Request (Missing ${missing.join(", ")})`,
	invalid_token: ([, missing]: InvalidToken) =>
		`[thau] Invalid Token (Missing ${missing.join(", ")})`,
	expired_token: ([, since]: ExpiredToken) =>
		`[thau] Expired Token (since ${since})`,
	invalid_signature: ([, signature]: InvalidSignature) =>
		`[thau] Invalid Signature (got ${signature})`,
	wrong_audience: ([, audience]: WrongAudience) =>
		`[thau] Invalid Token (Wrong Audience: ${audience})`,
	unknown_error: ([, error]: UnknownError) => {
		console.error(error);
		return "[thau] Unknown Error.";
	},
};

const defaults: MWOptions = {
	error: (err, _, res) => res.writeHead(400).end(messages[err[0]](err as any)),
};

export type ThauExtended = {
	thau?: ThauToken;
};

const neededQ = ["token", "signature"];

/** After this middleware, you can get the thau uid (as a string) from req.thau.uid */
const coggersHandler = (options: ThauOptions & MWOptions) => {
	const { error } = { ...defaults, ...options };
	const thau = new Thau(options);

	return async (
		req: IncomingMessage & {
			query: Record<string, any>;
		} & Partial<ThauExtended>,
		res: ServerResponse
	) => {
		const missingQ = neededQ.filter(key => typeof req.query[key] !== "string");
		if (missingQ.length > 0)
			return await error(["missing_query", missingQ as any], req, res);

		const { token, signature } = req.query as Record<string, string>;
		try {
			req.thau = await thau.verify(token, signature);
		} catch (error_) {
			return Array.isArray(error_)
				? error(error_ as ThauError, req, res)
				: error(["unknown_error", error_], req, res);
		}
	};
};

const expressHandler = (options: ThauOptions & MWOptions) => {
	const coggers = coggersHandler(options);
	return (req, res: ServerResponse, next) =>
		coggers(req, res).then(() => res.writableEnded || next(), next);
};
export { coggersHandler as coggers, expressHandler as express };
