// Vercel serverless entry for home-only SSR (`/` + `/home`).
// Imports the Angular SSR bundle built by `ng build` and delegates handling.
// Backend API calls (`/api/*` XHR) are NOT routed here — vercel.json sends
// those to the backend origin. Only page navigations to `/` and `/home`
// rewrite to this function, so the original URL is preserved for the router.
module.exports = async (req, res) => {
  const { reqHandler } = await import('../dist/dsa-drill-front/server/server.mjs');
  return reqHandler(req, res);
};
