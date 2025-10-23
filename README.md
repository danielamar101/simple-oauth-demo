# MCP Gatekeeper - OAuth 2.1 Proxy Demo

A complete example of using nginx as a reverse proxy to gatekeep OAuth 2.1 authentication for an application that has no built-in SSO capabilities.

https://github.com/ref-tools/ref-tools-mcp

## Architecture

```
┌─────────┐      ┌───────┐      ┌──────────────┐      ┌──────────┐
│ Browser │ ───> │ Nginx │ ───> │ OAuth2 Proxy │ ───> │ Demo App │
└─────────┘      └───────┘      └──────────────┘      └──────────┘
                     │                  │
                     │                  │
                     └──────┬───────────┘
                            │
                       Auth Check
                     (subrequest)
```

### Components

1. **Demo App** - A simple Node.js/Express application with NO built-in authentication
2. **OAuth2 Proxy** - Handles the OAuth 2.1/OIDC flow with your identity provider
3. **Nginx** - Acts as the gatekeeper, validating authentication via subrequests
4. **OAuth IDP** - External OAuth provider (Google, GitHub, Azure, etc.)

## How It Works

1. User tries to access the application via nginx
2. Nginx makes an auth subrequest to OAuth2 Proxy
3. If not authenticated, OAuth2 Proxy redirects to OAuth provider
4. User authenticates with OAuth provider
5. OAuth provider redirects back with authorization code
6. OAuth2 Proxy exchanges code for access token
7. OAuth2 Proxy sets a cookie for the user
8. Nginx allows the request through and injects user info headers
9. Demo app receives the request with user information

## Prerequisites

- Docker and Docker Compose
- OAuth provider credentials (Google, GitHub, Azure, etc.)

## Quick Start

### 1. Clone and Setup

```bash
cd mcp-gatekeeper
```

### 2. Configure OAuth Provider

#### Option A: Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create a new OAuth 2.0 Client ID
3. Add authorized redirect URI: `http://localhost/oauth2/callback`
4. Note your Client ID and Client Secret

#### Option B: GitHub OAuth

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Create a new OAuth App
3. Set Authorization callback URL: `http://localhost/oauth2/callback`
4. Note your Client ID and Client Secret

#### Option C: Azure AD

1. Go to Azure Portal → Azure Active Directory → App registrations
2. Register a new application
3. Add redirect URI: `http://localhost/oauth2/callback`
4. Create a client secret
5. Note your Application (client) ID and secret

### 3. Create Environment File

Create a `.env` file in the project root:

```bash
# Generate cookie secret (run this command):
python3 -c 'import os,base64; print(base64.urlsafe_b64encode(os.urandom(32)).decode())'

# Create .env file
cat > .env << 'EOF'
OAUTH2_PROXY_COOKIE_SECRET=<paste-generated-secret-here>
OAUTH2_PROXY_CLIENT_ID=<your-client-id>
OAUTH2_PROXY_CLIENT_SECRET=<your-client-secret>
EOF
```

### 4. Update OAuth Provider (if not using Google)

If using a different provider, edit `docker-compose.yml` and change the provider:

```yaml
# For GitHub:
- --provider=github

# For Azure:
- --provider=azure
- --azure-tenant=<your-tenant-id>

# For generic OIDC:
- --provider=oidc
- --oidc-issuer-url=<your-oidc-issuer-url>
```

### 5. Start the Stack

```bash
# Build and start all services
docker-compose up --build

# Or run in background
docker-compose up --build -d
```

### 6. Access the Application

Open your browser and navigate to:

```
http://localhost
```

You should be redirected to your OAuth provider to authenticate. After successful authentication, you'll see the demo application with your user information displayed.

## Testing

### Health Check (Bypasses Auth)

```bash
curl http://localhost/health
```

### API Endpoint (Requires Auth)

```bash
# This will fail without a valid session cookie
curl http://localhost/api/user

# With a browser session, it returns user info
```

### View Logs

```bash
# View all logs
docker-compose logs -f

# View specific service
docker-compose logs -f nginx
docker-compose logs -f oauth2-proxy
docker-compose logs -f demo-app
```

## Configuration Details

### Nginx Configuration

The nginx configuration (`nginx/conf.d/default.conf`) uses the `auth_request` directive to:

1. Validate authentication on every request via `/oauth2/auth`
2. Extract user information from OAuth2 Proxy response headers
3. Pass user information to the backend application
4. Handle unauthenticated requests by redirecting to sign-in

### OAuth2 Proxy Configuration

Key configurations in `docker-compose.yml`:

- `--http-address`: Listen address for OAuth2 Proxy
- `--upstream`: Protected upstream application
- `--provider`: OAuth provider (google, github, azure, oidc, etc.)
- `--email-domain`: Allowed email domains (* for all)
- `--cookie-secret`: Secret for encrypting cookies
- `--redirect-url`: OAuth callback URL
- `--cookie-secure`: Set to false for HTTP (use true with HTTPS)

### Security Considerations for Production

⚠️ **This demo uses HTTP for simplicity. For production:**

1. **Use HTTPS**: Add SSL certificates to nginx
   ```yaml
   # In nginx config
   listen 443 ssl;
   ssl_certificate /path/to/cert.pem;
   ssl_certificate_key /path/to/key.pem;
   ```

2. **Enable Secure Cookies**:
   ```yaml
   - --cookie-secure=true
   ```

3. **Restrict Email Domains**:
   ```yaml
   - --email-domain=yourcompany.com
   ```

4. **Use Strong Cookie Secrets**: Always generate random secrets
5. **Set Proper CORS Headers**: If needed for your application
6. **Enable Rate Limiting**: Protect against brute force attacks
7. **Use Secret Management**: Don't commit secrets to git

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `OAUTH2_PROXY_COOKIE_SECRET` | 32-byte base64 encoded secret for encrypting cookies | Yes |
| `OAUTH2_PROXY_CLIENT_ID` | OAuth client ID from your provider | Yes |
| `OAUTH2_PROXY_CLIENT_SECRET` | OAuth client secret from your provider | Yes |

## Customization

### Add More Protected Routes

Edit `nginx/conf.d/default.conf` to add more routes:

```nginx
location /admin {
    auth_request /oauth2/auth;
    error_page 401 = /oauth2/sign_in;
    # ... proxy configuration
}
```

### Bypass Auth for Specific Paths

```nginx
location /public {
    auth_request off;
    proxy_pass http://demo-app:3000;
}
```

### Add Custom Headers

```nginx
location / {
    auth_request /oauth2/auth;
    auth_request_set $user_groups $upstream_http_x_auth_request_groups;
    proxy_set_header X-Groups $user_groups;
    # ...
}
```

## Troubleshooting

### OAuth Callback URL Mismatch

**Error**: `redirect_uri_mismatch`

**Solution**: Ensure the redirect URL in your OAuth provider matches exactly:
```
http://localhost/oauth2/callback
```

### Cookie Secret Error

**Error**: `cookie_secret must be 16, 24, or 32 bytes`

**Solution**: Generate a proper secret:
```bash
python3 -c 'import os,base64; print(base64.urlsafe_b64encode(os.urandom(32)).decode())'
```

### Unable to Access Application

1. Check all services are running:
   ```bash
   docker-compose ps
   ```

2. Check logs for errors:
   ```bash
   docker-compose logs
   ```

3. Verify your `.env` file exists and has correct values

### Sign Out Not Working

Clear your browser cookies for `localhost` or use:
```
http://localhost/oauth2/sign_out?rd=/
```

## Stopping the Stack

```bash
# Stop all services
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

## Additional Resources

- [OAuth2 Proxy Documentation](https://oauth2-proxy.github.io/oauth2-proxy/)
- [Nginx auth_request Module](http://nginx.org/en/docs/http/ngx_http_auth_request_module.html)
- [OAuth 2.1 Specification](https://oauth.net/2.1/)

## License

MIT License - Feel free to use this as a template for your own projects.

## Contributing

This is a demonstration project. Feel free to fork and customize for your needs!

