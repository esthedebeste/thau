import type { Request, Response } from "coggers";
import type { SessionedResponse } from "coggers-session";
import { webcrypto } from "node:crypto";
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
				codeVerifier: string;
				state: string;
			};
			google?: {
				state: string;
				nonce: string;
			};
		};
		scopes?: string[];
		// for openid only
		openid?: {
			state?: string;
			nonce?: string;
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
		extra: {
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

export type Handlers = Handler | Array<Handlers>;

export const secrets = (filename: string) =>
	JSON.parse(
		process.env[`THAU_${filename.toUpperCase()}_SECRET`] ||
			readFileSync(
				new URL("../secrets/" + filename + ".json", import.meta.url),
				"utf8"
			)
	);

const { subtle } = webcrypto as unknown as typeof window.crypto;
export const keys: {
	publicJWK: JsonWebKey;
	private: CryptoKey;
	kid: string;
}[] = await Promise.all(
	secrets("signing").map(
		async ({ public: publicJWK, private: privateJWK }) => ({
			publicJWK,
			private: await subtle.importKey(
				"jwk",
				privateJWK,
				{
					name: privateJWK.kty === "EC" ? "ECDSA" : privateJWK.kty,
					hash: "SHA-" + privateJWK.alg.slice(2),
					namedCurve: privateJWK.crv,
				},
				false,
				["sign"]
			),
			kid: publicJWK.kid,
		})
	)
);
export const pubkeys = keys.map(key => key.publicJWK);
export const SHORTALG = pubkeys[0].alg;
export const SHATYPE = "SHA-" + pubkeys[0].alg.slice(2);
/** Publicly exposed object that can be used for subtle.importKey, subtle.verify and subtle.sign. */
export const algorithm: EcKeyImportParams & EcdsaParams = {
	name: "ECDSA",
	hash: SHATYPE,
	namedCurve: pubkeys[0].crv,
};

export const prod = !process.argv.includes("--dev");
export const extraScopes = new Set(["name", "avatar"]);
