import { secrets } from "../../utils.js";
import { openid } from "../openid-base.js";

const {
	oauth: { client_id: id, client_secret: secret },
} = secrets("google");
export const { callback, redirect } = await openid(
	// from https://accounts.google.com/.well-known/openid-configuration
	{
		issuer: "https://accounts.google.com",
		authorization_endpoint: "https://accounts.google.com/o/oauth2/v2/auth",
		token_endpoint: "https://oauth2.googleapis.com/token",
		jwks_uri: "https://www.googleapis.com/oauth2/v3/certs",
	},
	{
		id,
		secret,
		name: "google",
		prompt: ["prompt", "consent"],
		nameKey: "given_name",
		pictureKey: "picture",
	}
);
export const name = "Google";
