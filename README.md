# Stremio - Freedom to Stream

[![Build](https://github.com/Stremio/stremio-web/actions/workflows/build.yml/badge.svg)](https://github.com/Stremio/stremio-web/actions/workflows/build.yml)
[![Github Page](https://img.shields.io/website?label=Page&logo=github&up_message=online&down_message=offline&url=https%3A%2F%2Fstremio.github.io%2Fstremio-web%2F)](https://stremio.github.io/stremio-web/development)

Stremio is a modern media center that's a one-stop solution for your video entertainment. You discover, watch and organize video content from easy to install addons.

## Build

### Prerequisites

* Node.js 12 or higher
* [pnpm](https://pnpm.io/installation) 10 or higher

### Install dependencies

```bash
pnpm install
```

### Start development server

```bash
pnpm start
```

### Production build

```bash
pnpm run build
```

### Run with Docker

```bash
docker build -t stremio-web .
docker run -p 8080:8080 stremio-web
```

### Run with Docker Compose

Docker Compose setup includes Nginx reverse proxy, Stremio Web, and Stremio Streaming Server:

```bash
docker-compose up -d
```

This will start:
- **Nginx** reverse proxy on port `80` (handles routing)
- **Stremio Web** (internal, accessible via nginx)
- **Stremio Streaming Server** (internal, accessible via nginx at `/streaming-server/`)

The streaming server is reverse-proxied under the same domain to avoid HTTPS mixed-content issues. It's accessible at `/streaming-server/` path.

#### Configuration

The streaming server URL must be configured to use the reverse-proxied path:

**For HTTPS deployments (e.g., Coolify):**
1. Via URL parameter: `https://stream.dutch.casa/?streamingServerUrl=https://stream.dutch.casa/streaming-server/`
2. In the Settings UI after deployment: Set streaming server URL to `https://stream.dutch.casa/streaming-server/`

**For local development:**
- Via URL parameter: `http://localhost/?streamingServerUrl=http://localhost/streaming-server/`

#### Persistent Storage

Streaming server data (cache, etc.) is stored in a Docker volume `streaming-server-data` for persistence across container restarts.

#### Coolify Deployment

For Coolify deployment at `https://stream.dutch.casa`:

**How it works:**
- Coolify's proxy (Traefik/Caddy) handles HTTPS termination and routes `https://stream.dutch.casa` to the **nginx** service (port 80)
- Nginx handles internal routing:
  - `/streaming-server/` → stremio-streaming-server (port 11470)
  - All other paths → stremio-web (port 8080)
- This ensures the streaming server is accessible via HTTPS under the same domain (no mixed-content issues)

**Deployment steps:**

1. **In Coolify UI:**
   - Create a new resource from docker-compose
   - Point it to this repository
   - **Important:** Set Coolify's git branch to match your repository's default branch (e.g., `main` or `master`)
   - Set the domain to `stream.dutch.casa`
   - **Important:** Configure Coolify to route traffic to the `nginx` service (port 80)
   - Coolify will automatically handle HTTPS/SSL certificates
   - The nginx service builds from `Dockerfile.nginx` which includes the config (no bind mount issues)

2. **After deployment, configure the streaming server URL:**
   - Option 1 (URL parameter): Visit `https://stream.dutch.casa/?streamingServerUrl=https://stream.dutch.casa/streaming-server/`
   - Option 2 (Settings UI): 
     - Go to `https://stream.dutch.casa`
     - Navigate to Settings → Streaming
     - Set streaming server URL to: `https://stream.dutch.casa/streaming-server/`

3. **Verify the setup:**
   - Main app should load at `https://stream.dutch.casa`
   - Streaming server should be accessible at `https://stream.dutch.casa/streaming-server/`
   - Check browser console for any mixed-content warnings (should be none)

**Troubleshooting:**
- **Git branch mismatch:** Ensure Coolify's branch setting matches your repository's default branch (check in repository settings)
- **Wrong image:** The streaming server uses `stremio/server:latest` (verified correct Docker Hub image)
- **Nginx config:** Uses custom Dockerfile (`Dockerfile.nginx`) to avoid bind mount issues - config is baked into the image
- If Coolify doesn't detect the nginx service, manually configure routing to point to the `nginx` service on port 80
- If experiencing torrent connectivity issues, enable `privileged: true` in the stremio-streaming-server service
- Ensure Coolify's proxy is forwarding `X-Forwarded-Proto` header (nginx config already handles this)

## Screenshots

### Board

![Board](/screenshots/board.png)

### Discover

![Discover](/screenshots/discover.png)

### Meta Details

![Meta Details](/screenshots/metadetails.png)

## License

Stremio is copyright 2017-2023 Smart code and available under GPLv2 license. See the [LICENSE](/LICENSE.md) file in the project for more information.
