// Single entry point for all /api/* requests
// Extracts path from URL and routes through router logic
const router = require('./router');

module.exports = async (req, res) => {
  // Extract the path after /api/ from the URL pathname
  // Example: /api/config -> config, /api/admin/create-user -> admin/create-user
  const pathname = req.url.split('?')[0]; // Remove query string
  const pathMatch = pathname.match(/^\/api\/(.*)$/);
  const path = pathMatch ? pathMatch[1] : '';
  
  // Set path as query parameter for router to find
  req.query = req.query || {};
  req.query.path = path;
  
  return router(req, res);
};
