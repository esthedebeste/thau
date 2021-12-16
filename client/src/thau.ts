export type InvalidToken = ["invalid_token", (keyof ThauToken)[]];
export type ExpiredToken = ["expired_token", number];
export type WrongAudience = ["wrong_audience", string];
export type InvalidSignature = ["invalid_signature", string];
export type ThauOptions = {
	/** Defaults to https://thau.herokuapp.com/keys */
	url?: string;
	/** Defaults to 120 */
	expirySecs?: number;
	/**
	 * url(s) that the handler is mapped to.
	 * protocol-sensitive, required to prevent host-spoofing.
	 * (Do not include localhost in this array in production!!!)
	 */
	urls: string[];
};

const tokenKeys = ["uid", "iat", "aud"];
const localhostRe = /^https?:\/\/(?:localhost|127\.0\.0\.1|192\.168\.)/;
export type ThauToken = {
	/** Thau User ID */
	uid: string;
	iat: number;
	aud: string;
	/**
	 * Extra may be extended in the future.
	 * There could also be cases in which only a part of extra is filled.
	 */
	extra: {
		/** The user's username */
		name?: string;
		/** URL to the user's profile picture */
		avatar?: string;
		[other: string]: any;
	};
};

export type Thau = new (options: ThauOptions) => {
	refreshData(): Promise<void>;
	verify(tokenb64url: string, signatureb64url: string): Promise<ThauToken>;
};

export const createThau = <S extends BufferSource>(
	subtle: SubtleCrypto,
	{
		base64url,
		stringify,
		getJSON,
	}: {
		base64url(data: string): S;
		stringify(data: S): string;
		getJSON(url: string): Promise<any>;
	}
): Thau =>
	class Thau {
		url: string;
		key: CryptoKey;
		urls: string[];
		expirySecs: number;
		algorithm: EcKeyImportParams & EcdsaParams;
		constructor({
			url = "https://thau.herokuapp.com/keys",
			expirySecs = 120,
			urls,
		}: ThauOptions) {
			this.url = url;
			this.expirySecs = expirySecs;
			this.urls = urls;
			if (urls.some(url => localhostRe.test(url)))
				console.warn(
					"\x1b[33m[thau] WARNING: You are using localhost in your urls array. Make sure to remove this in production!\x1b[0m"
				);
		}

		/** Refreshes signature keys. */
		async refreshData(): Promise<void> {
			const {
				key,
				shatype,
				algorithm = {
					name: "ECDSA",
					hash: { name: shatype },
					namedCurve: key.crv,
				},
			}: {
				key: JsonWebKey;
				shatype?: string;
				algorithm?: EcKeyImportParams & EcdsaParams;
			} = await getJSON(this.url);
			this.key = await subtle.importKey("jwk", key, algorithm, false, [
				"verify",
			]);
			this.algorithm = algorithm;
		}

		async verify(
			tokenb64url: string,
			signatureb64url: string
		): Promise<ThauToken> {
			if (!(this.key && this.algorithm)) await this.refreshData();

			const token = base64url(tokenb64url);
			const ok = await subtle.verify(
				this.algorithm,
				this.key,
				base64url(signatureb64url),
				token
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
