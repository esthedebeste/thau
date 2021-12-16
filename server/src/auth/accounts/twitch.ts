import { secrets } from "../../utils.js";
import { openid } from "../openid-base.js";

const { id, secret } = secrets("twitch");
export const { callback, redirect } = await openid(
	// from https://id.twitch.tv/oauth2/.well-known/openid-configuration, filtered down to what we need
	{
		authorization_endpoint: "https://id.twitch.tv/oauth2/authorize",
		issuer: "https://id.twitch.tv/oauth2",
		jwks_uri: "https://id.twitch.tv/oauth2/keys",
		token_endpoint: "https://id.twitch.tv/oauth2/token",
	},
	{
		id,
		secret,
		name: "twitch",
		prompt: ["force_verify", "true"],
		nameKey: "preferred_username",
		pictureKey: "picture",
		scope: "openid",
	}
);
export const name = "Twitch";
