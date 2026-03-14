# Runtime Incident Controls

The action server now supports runtime-level pause controls for the highest-risk user flows.

## Disabled Actions

Supported action flags:

- `session-bootstrap`
- `operator-auth`
- `redemption`

These can be seeded at startup with:

```bash
ACTION_DISABLED_ACTIONS=session-bootstrap,redemption
```

## Admin API

Set an admin token:

```bash
ACTION_ADMIN_TOKEN=replace-me
```

Read current runtime flags:

```bash
curl -H "Authorization: Bearer $ACTION_ADMIN_TOKEN" \
  http://localhost:8080/v1/admin/runtime-flags
```

Update runtime flags:

```bash
curl -X POST \
  -H "Authorization: Bearer $ACTION_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  http://localhost:8080/v1/admin/runtime-flags \
  -d '{"disabledActions":["redemption"]}'
```

## Health Visibility

`GET /v1/health` now includes `disabledActions`, so dashboards and smoke tooling can detect paused runtime flows without privileged access.

## Relayer Pause Controls

The relayer now has a matching runtime admin surface for sponsored-action pauses.

Read current relayer flags:

```bash
curl -H "Authorization: Bearer $RELAYER_ADMIN_TOKEN" \
  http://localhost:3001/v1/admin/runtime-flags
```

Pause a relayed action:

```bash
curl -X POST \
  -H "Authorization: Bearer $RELAYER_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  http://localhost:3001/v1/admin/runtime-flags \
  -d '{"pausedActions":["geo-redeem"]}'
```

These paused relayer actions are persisted, exposed in relayer health metrics, and reloaded on restart.

## Operational Guidance

- Pause `redemption` first if geofence, abuse, or merchant POS behavior looks suspicious.
- Pause `session-bootstrap` if session issuance is behaving unexpectedly or a wallet-auth regression is under investigation.
- Pause `operator-auth` if merchant operator sessions are suspected to be compromised or misconfigured.
- Use relayer-side paused actions in addition to these flags when sponsorship itself must stop.
