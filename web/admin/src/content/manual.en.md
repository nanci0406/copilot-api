# Copilot API Admin Manual

## First-time setup

1. Open `/admin` on localhost.
2. If no Admin secret exists yet, finish the one-time setup at `/admin/setup`.
3. Sign in at `/admin/login` with the saved Admin secret.

## Security model

- Admin session protection is independent from the gateway API key.
- Before the secret is configured, only localhost can reach `/admin/setup`.
- After configuration, non-localhost Admin access requires HTTPS.
- Write requests are same-origin protected by the backend middleware.

## Accounts

- Use the **Accounts** page to add GitHub accounts through the device flow.
- Switching the active account updates the runtime context immediately.
- Removing the active account clears or replaces the runtime context on the server.

## Models

- Premium multipliers are local accounting metadata, not upstream billing controls.
- Hidden model policy can prevent certain targets from being selected elsewhere in the UI.
- Reasoning effort is only editable when the backend reports supported values.

## Settings

- Global rate-limit options still respect environment-variable overrides.
- Context management changes are persisted through the existing config pipeline.
- Clearing stored API keys is explicit and handled server-side.

## Usage and mappings

- Usage logs are cursor-paginated and account-scoped.
- Model mappings translate client-facing aliases into real Copilot model ids.
- If hidden models are globally disabled, mapping targets follow that restriction.
