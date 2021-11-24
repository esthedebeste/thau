import type { IncomingMessage, ServerResponse } from "node:http";
import { Thau, ThauOptions, ThauToken } from "./index.js";
type baseH = (
	req: IncomingMessage,
	res: ServerResponse
) => void | Promise<void>;

type MissingQuery = [
	"missing_query",
	["token"] | ["signature"] | ["token", "signature"]
];
type InvalidToken = ["invalid_token", (keyof ThauToken)[]];
type ExpiredToken = ["expired_token", number];
type WrongAudience = ["wrong_audience", string];
type InvalidSignature = ["invalid_signature", string];
type ThauError =
	| MissingQuery
	| InvalidToken
	| ExpiredToken
	| WrongAudience
	| InvalidSignature;

export type MWOptions<H extends baseH = baseH> = {
	error?: (reason: ThauError, ...reqres: Parameters<H>) => ReturnType<H>;
	/** Defaults to 120 */
	expirySecs?: number;
	/**
	 * url(s) that the handler is mapped to.
	 * protocol-sensitive, Required to prevent host-spoofing.
	 * (Do not include localhost in this array in production!!!)
	 */
	urls: string[];
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
};

const defaults: Partial<MWOptions> = {
	error: (err, _, res) => res.writeHead(400).end(messages[err[0]](err as any)),
	expirySecs: 120,
};

export type ThauExtended = {
	thau?: ThauToken;
};

const localhostRe = /^https?:\/\/(?:localhost|127\.0\.0\.1|192\.168\.)/;
const neededQ = ["token", "signature"];
const neededT = ["uid", "iat", "aud"];

/** After this middleware, you can get the thau uid (as a string) from req.thau.uid */
const coggersHandler = (options: ThauOptions & MWOptions) => {
	const { error, urls, expirySecs } = { ...defaults, ...options };
	if (urls.find(url => localhostRe.test(url)))
		console.warn(
			"\x1b[33m[thau] WARNING: You are using localhost in your urls array. Make sure to remove this in production!\x1b[0m"
		);

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
		const tokenBuf = Buffer.from(token, "base64url");
		const signBuf = Buffer.from(signature, "base64url");

		const ok = await thau.verify(tokenBuf, signBuf);
		if (!ok) return await error(["invalid_signature", signature], req, res);

		const decoded: ThauToken = JSON.parse(tokenBuf.toString());

		const missingT = neededT.filter(key => !decoded[key]);
		if (missingT.length > 0)
			return await error(["invalid_token", missingT as any], req, res);

		const { iat, aud } = decoded;
		if (iat + expirySecs < Date.now() / 1000)
			return await error(["expired_token", iat + expirySecs], req, res);
		if (!urls.includes(aud))
			return await error(["wrong_audience", aud], req, res);
		req.thau = decoded;
	};
};

const expressHandler = (options: ThauOptions & MWOptions) => {
	const coggers = coggersHandler(options);
	return (req, res: ServerResponse, next) =>
		coggers(req, res).then(() => res.writableEnded || next(), next);
};
export { coggersHandler as coggers, expressHandler as express };
