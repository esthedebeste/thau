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
		getJSON(url: URL): Promise<{ key: JsonWebKey; shatype: string }>;
	}
): Thau =>
	class Thau {
		url: URL;
		key: CryptoKey;
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
			if (urls.some(url => localhostRe.test(url)))
				console.warn(
					"\x1b[33m[thau] WARNING: You are using localhost in your urls array. Make sure to remove this in production!\x1b[0m"
				);
		}

		/** Refreshes signature keys. */
		async refreshData(): Promise<void> {
			const { key, shatype } = await getJSON(this.url);
			this.key = await subtle.importKey(
				"jwk",
				key,
				{
					name: "ECDSA",
					hash: { name: shatype },
					namedCurve: key.crv,
				},
				false,
				["verify"]
			);
			this.shatype = shatype;
		}

		async verify(
			tokenb64url: string,
			signatureb64url: string
		): Promise<ThauToken> {
			if (this.key == null) await this.refreshData();

			const token = base64url(tokenb64url);

			const ok = await subtle.verify(
				{ name: "ECDSA", hash: this.shatype },
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
