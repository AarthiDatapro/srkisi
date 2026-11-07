// Step 1. Settings for Google sign-in.
// The client id is public. The secret stays on the server.
// In Google Cloud, create a Web client and set the redirect URI to GOOGLE_REDIRECT_URI.

const DEFAULT_REDIRECT = "http://localhost:5173/auth/google/callback";

export function google_config() {
  const client_id = String(process.env.GOOGLE_CLIENT_ID || "").trim();
  const client_secret = String(process.env.GOOGLE_CLIENT_SECRET || "").trim();
  const redirect_uri = String(process.env.GOOGLE_REDIRECT_URI || DEFAULT_REDIRECT).trim();

  return {
    client_id,
    client_secret,
    redirect_uri,
    ready: Boolean(client_id && client_secret && redirect_uri)
  };
}
