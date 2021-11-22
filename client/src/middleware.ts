import type * as express from "express";
import type { IncomingMessage, ServerResponse } from "node:http";
import { Thau, ThauOptions } from "./index.js";
export type MWOptions<
	H = (req: IncomingMessage, res: ServerResponse) => void | Promise<void>
> = {
	invalidRequest?: H;
	invalidSignature?: H;
	expiredSignature?: H;
};

const defaults: MWOptions = {
	invalidRequest: (_, res) =>
		res.writeHead(400).end("Invalid Request (Missing token and/or signature)"),
	invalidSignature: (_, res) => res.writeHead(400).end("Invalid Signature"),
	expiredSignature: (_, res) => res.writeHead(400).end("Expired Signature"),
};

type ThauExtended = {
	thau?: {
		uid: string;
		iat: number;
		exp: number;
	};
};

/** After this middleware, you can get the thau uid (as a string) from req.thau.uid */
const coggersHandler = (options: ThauOptions & MWOptions) => {
	const { invalidRequest, invalidSignature } = { ...defaults, ...options };
	const thau = new Thau(options);
	return async (
		req: IncomingMessage & { query: Record<string, any> } & ThauExtended,
		res: ServerResponse
	) => {
		const { token, signature } = req.query;
		if (!(typeof token === "string" && typeof signature === "string"))
			return await invalidRequest(req, res);
		const tokenBuf = Buffer.from(token, "base64url");
		const signBuf = Buffer.from(signature, "base64url");

		const ok = await thau.verify(tokenBuf, signBuf);
		if (!ok) return await invalidSignature(req, res);

		const decoded = JSON.parse(tokenBuf.toString());

		const { iat, exp } = decoded;
		if (iat + exp < Date.now() / 1000) return await invalidRequest(req, res);

		req.thau = decoded;
	};
};

const expressHandler = (
	options: ThauOptions & MWOptions
): express.RequestHandler => {
	const coggers = coggersHandler(options);
	return (req, res, next) =>
		coggers(req, res).then(() => res.writableEnded || next(), next);
};
export { coggersHandler as coggers, expressHandler as express };
