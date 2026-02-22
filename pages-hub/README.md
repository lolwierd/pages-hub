# My Pages Hub

A Cloudflare Worker that acts as a central dashboard for all your Cloudflare Pages projects.

## Features

- **Live Data**: Fetches directly from Cloudflare API.
- **Search**: Quickly find projects by name.
- **Starring**: Pin favorite projects to the top (stored locally in browser).
- **Sorting**: Automatic sorting by latest deployment.
- **Custom Domains**: Detects and links to custom domains if configured.
- **Responsive Design**: Built with Tailwind CSS.

## Setup & Deployment

### Prerequisites

You need a Cloudflare account with API access.

1.  **Get API Credentials**:
    -   Go to [Cloudflare Dashboard > My Profile > API Tokens](https://dash.cloudflare.com/profile/api-tokens).
    -   Create a token with `Account.Cloudflare Pages:Read` permission.
    -   Note your `Account ID` (found in the sidebar of the dashboard home).

2.  **Local Development**:
    -   Copy `.dev.vars.example` to `.dev.vars` (create this file if it doesn't exist, ignore from git).
    -   Add your credentials:
        ```ini
        CLOUDFLARE_ACCOUNT_ID="your_account_id"
        CLOUDFLARE_API_TOKEN="your_api_token"
        ```
    -   Run `npm run dev`.

3.  **Deployment (GitHub Actions)**:
    -   This repository includes a GitHub Workflow in `.github/workflows/deploy.yml`.
    -   Go to your GitHub repository settings > **Secrets and variables** > **Actions**.
    -   Add two repository secrets:
        -   `CLOUDFLARE_ACCOUNT_ID`
        -   `CLOUDFLARE_API_TOKEN`
    -   Push to `main` branch to trigger deployment.

4.  **Manual Deployment**:
    -   Run `npx wrangler deploy --minify`.
    -   You will be prompted to login if not already.
    -   Set secrets on the deployed worker:
        ```bash
        npx wrangler secret put CLOUDFLARE_ACCOUNT_ID
        npx wrangler secret put CLOUDFLARE_API_TOKEN
        ```

## configuration

The worker is configured in `wrangler.toml` to deploy to `pages.lolwierd.com`.
Ensure `pages.lolwierd.com` is pointing to your worker in Cloudflare DNS (or use `custom_domain = true` which handles it if the zone is in your account).

```toml
# wrangler.toml
name = "pages-hub"
# ...
routes = [
  { pattern = "pages.lolwierd.com", custom_domain = true }
]
```
