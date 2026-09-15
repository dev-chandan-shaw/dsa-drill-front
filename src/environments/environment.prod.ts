export const environment = {
  production: true,
  // DIRECT (no-proxy) experiment: absolute backend URLs, cross-origin.
  // Cookies are third-party here (vercel.app page, duckdns.org cookie) and
  // require SameSite=None + Secure + exact CORS origin on the backend.
  apiUrl: 'https://dsa-drill.duckdns.org/api',
  googleOAuthRedirectUrl: 'https://dsa-drill.duckdns.org/oauth2/authorization/google',
};
