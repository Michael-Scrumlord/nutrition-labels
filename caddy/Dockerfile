# Caddyfile-compatible Caddy build with the community rate-limit plugin.
#
# The stock caddy:2-alpine image doesn't ship `rate_limit`, so we use the
# upstream `caddy:builder` stage to compile a slim binary that includes
# github.com/mholt/caddy-ratelimit, then copy that binary into a clean
# alpine runtime.
#
# Pin to a specific Caddy major version so a future caddy:2.x bump can't
# silently change the rate-limit plugin's behaviour mid-deploy.

FROM caddy:2.8-builder AS builder

RUN xcaddy build \
    --with github.com/mholt/caddy-ratelimit

FROM caddy:2.8-alpine

COPY --from=builder /usr/bin/caddy /usr/bin/caddy
