# Release Notes 0.3

Release date: 2026-04-16

## Highlights

- Implemented consultation code renewal with department-aware code lifetime handling.
- Added backend build information endpoint support for version and git reference reporting.

## User-facing impact

- Renewed consultation access codes now respect department-specific lifetime rules.
- Frontend build information can now display backend version and build reference data.

## Operational changes

- Production build metadata is exposed through the health-check build info endpoint.
