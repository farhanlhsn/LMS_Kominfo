#!/bin/sh
set -eu

SCHEMA_PATH="/app/prisma/schema.prisma"

if [ ! -f "$SCHEMA_PATH" ]; then
  echo "Prisma schema not found at $SCHEMA_PATH" >&2
  exit 1
fi

if [ -x "/app/node_modules/.bin/prisma" ]; then
  PRISMA_CMD="/app/node_modules/.bin/prisma"
else
  PRISMA_FALLBACK="$(find /app/node_modules/.pnpm -path '*/node_modules/prisma/build/index.js' | head -n 1 || true)"
  if [ -z "$PRISMA_FALLBACK" ]; then
    echo "Prisma CLI not found in runtime image" >&2
    exit 1
  fi
  PRISMA_CMD="node $PRISMA_FALLBACK"
fi

echo "Running Prisma migrate deploy..."
sh -c "$PRISMA_CMD migrate deploy --schema=$SCHEMA_PATH"

echo "Starting API..."
exec node /app/dist/main.js
