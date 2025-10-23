const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to log incoming requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  
  // Log authentication headers passed by nginx
  if (req.headers['x-user']) {
    console.log(`  Authenticated User: ${req.headers['x-user']}`);
  }
  if (req.headers['x-email']) {
    console.log(`  Email: ${req.headers['x-email']}`);
  }
  
  next();
});

// Health check endpoint (bypasses auth in nginx)
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// Main application endpoint
app.get('/', (req, res) => {
  const user = req.headers['x-user'] || 'Unknown';
  const email = req.headers['x-email'] || 'Unknown';
  
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>OAuth Gatekeeper Demo</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        
        .container {
          background: white;
          border-radius: 20px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
          padding: 40px;
          max-width: 600px;
          width: 100%;
        }
        
        h1 {
          color: #667eea;
          margin-bottom: 10px;
          font-size: 2em;
        }
        
        .subtitle {
          color: #666;
          margin-bottom: 30px;
          font-size: 1.1em;
        }
        
        .info-box {
          background: #f8f9fa;
          border-left: 4px solid #667eea;
          padding: 20px;
          margin: 20px 0;
          border-radius: 5px;
        }
        
        .info-box h2 {
          color: #333;
          margin-bottom: 15px;
          font-size: 1.2em;
        }
        
        .info-item {
          margin: 10px 0;
          padding: 10px;
          background: white;
          border-radius: 5px;
        }
        
        .label {
          font-weight: bold;
          color: #667eea;
          display: inline-block;
          min-width: 80px;
        }
        
        .value {
          color: #333;
        }
        
        .success-badge {
          display: inline-block;
          background: #10b981;
          color: white;
          padding: 5px 15px;
          border-radius: 20px;
          font-size: 0.9em;
          font-weight: bold;
        }
        
        .feature-list {
          list-style: none;
          margin-top: 20px;
        }
        
        .feature-list li {
          padding: 10px;
          margin: 5px 0;
          background: #f8f9fa;
          border-radius: 5px;
        }
        
        .feature-list li:before {
          content: "✓ ";
          color: #10b981;
          font-weight: bold;
          margin-right: 10px;
        }
        
        .logout-btn {
          display: inline-block;
          background: #ef4444;
          color: white;
          padding: 12px 30px;
          border-radius: 8px;
          text-decoration: none;
          margin-top: 20px;
          transition: background 0.3s;
        }
        
        .logout-btn:hover {
          background: #dc2626;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🔐 OAuth Gatekeeper Demo</h1>
        <p class="subtitle">Application without built-in SSO, protected by nginx + OAuth2 Proxy</p>
        
        <div class="info-box">
          <h2><span class="success-badge">✓ AUTHENTICATED</span></h2>
          <div class="info-item">
            <span class="label">User:</span>
            <span class="value">${user}</span>
          </div>
          <div class="info-item">
            <span class="label">Email:</span>
            <span class="value">${email}</span>
          </div>
          <div class="info-item">
            <span class="label">Timestamp:</span>
            <span class="value">${new Date().toISOString()}</span>
          </div>
        </div>
        
        <div class="info-box">
          <h2>How This Works:</h2>
          <ul class="feature-list">
            <li>This app has NO built-in authentication</li>
            <li>Nginx acts as a reverse proxy and gatekeeper</li>
            <li>OAuth2 Proxy handles OAuth 2.1 flow</li>
            <li>Nginx validates auth via subrequest to OAuth2 Proxy</li>
            <li>User info is passed via headers to the app</li>
          </ul>
        </div>
        
        <a href="/oauth2/sign_out" class="logout-btn">Sign Out</a>
      </div>
    </body>
    </html>
  `);
});

// API endpoint example
app.get('/api/user', (req, res) => {
  res.json({
    user: req.headers['x-user'] || 'Unknown',
    email: req.headers['x-email'] || 'Unknown',
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Demo app running on port ${PORT}`);
  console.log('This app has NO built-in authentication!');
  console.log('Authentication is handled by nginx + OAuth2 Proxy');
});

