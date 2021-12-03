export type ThauOptions = {
	/** Defaults to https://thau.herokuapp.com/keys */
	url?: string;
	/** Defaults to 120 */
	expirySecs?: number;
	/**
	 * url(s) that the handler is mapped to.
	 * protocol-sensitive, Required to prevent host-spoofing.
	 * (Do not include localhost in this array in production!!!)
	 */
	urls: string[];
};

/** A bit similar to JWT's, `uid` is the user id. */
export type ThauToken = {
	uid: string;
	iat: number;
	aud: string;
};

const isWeb = typeof window !== "undefined";

export const Thau = (
	isWeb ? await import("./web.js") : await import("./node.js")
).Thau;

function THROW() {
	throw new Error("Thau middleware is not available in a web environment.");
}
export const { coggers, express } = (
	isWeb ? { coggers: THROW, express: THROW } : await import("./middleware.js")
) as typeof import("./middleware.js");
export type { MWOptions, ThauExtended } from "./middleware.js";
