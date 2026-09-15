export const environment = {
  production: true,
  apiUrl: '/api',
  // Same-origin: proxied to the backend via vercel.json so the OAuth2 session
  // (JSESSIONID) and the app session cookie stay first-party — pure cookie
  // auth, nothing in the URL.
  googleOAuthRedirectUrl: '/oauth2/authorization/google',
};
