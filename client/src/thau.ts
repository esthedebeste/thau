import { ThauOptions, ThauToken } from "./index.js";

export type MissingQuery = [
	"missing_query",
	["token"] | ["signature"] | ["token", "signature"]
];
export type InvalidToken = ["invalid_token", (keyof ThauToken)[]];
export type ExpiredToken = ["expired_token", number];
export type WrongAudience = ["wrong_audience", string];
export type InvalidSignature = ["invalid_signature", string];
export type UnknownError = ["unknown_error", Error];
export type ThauError =
	| MissingQuery
	| InvalidToken
	| ExpiredToken
	| WrongAudience
	| InvalidSignature
	| UnknownError;

const tokenKeys = ["uid", "iat", "aud"];
const localhostRe = /^https?:\/\/(?:localhost|127\.0\.0\.1|192\.168\.)/;
export const createThau = <T, S>({
	verify,
	base64url,
	stringify,
	getData,
}: {
	base64url(data: string): S;
	stringify(data: S): string;
	verify(
		key: T,
		token: S,
		signature: S,
		shatype: string
	): boolean | Promise<boolean>;
	getData(url: string): Promise<{ key: T; shatype: string }>;
}) =>
	class Thau {
		url: URL;
		key: T;
		urls: string[];
		expirySecs: number;
		shatype: string;
		constructor({
			url = "https://thau.herokuapp.com/keys",
			expirySecs = 120,
			urls,
		}: ThauOptions) {
			this.url = new URL(url);
			this.expirySecs = expirySecs;
			this.urls = urls;
			if (urls.find(url => localhostRe.test(url)))
				console.warn(
					"\x1b[33m[thau] WARNING: You are using localhost in your urls array. Make sure to remove this in production!\x1b[0m"
				);
		}

		/** Refreshes signature keys. */
		async refreshData(): Promise<void> {
			const { key, shatype } = await getData(this.url.href);
			this.key = key;
			this.shatype = shatype;
		}

		async verify(
			tokenb64url: string,
			signatureb64url: string
		): Promise<ThauToken> {
			if (this.key == null) await this.refreshData();

			const token = base64url(tokenb64url);

			const ok = await verify(
				this.key,
				token,
				base64url(signatureb64url),
				this.shatype
			);
			if (!ok) throw <InvalidSignature>["invalid_signature", signatureb64url];

			const decoded: ThauToken = JSON.parse(stringify(token));

			const missingT = tokenKeys.filter(key => !decoded[key]);
			if (missingT.length > 0)
				throw <InvalidToken>["invalid_token", missingT as any];

			const { iat, aud } = decoded;
			const exp = iat + this.expirySecs;
			if (exp < Date.now() / 1000) throw <ExpiredToken>["expired_token", exp];
			if (!this.urls.includes(aud))
				throw <WrongAudience>["wrong_audience", aud];
			return decoded;
		}
	};
