#!/bin/sh
set -e

echo "Starting backend..."

cd /app/apps/backend

# Generate .dev.vars from Docker environment variables
echo "Generating .dev.vars from environment..."
cat > /app/apps/backend/.dev.vars <<EOF
ENVIRONMENT=${ENVIRONMENT:-development}
ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY:-}
EOF

echo "Running D1 migrations..."
for f in ./migrations/*.sql; do
  if [ -f "$f" ]; then
    echo "  Running $f ..."
    pnpm wrangler d1 execute my-database --local --file="$f" || true
  fi
done

echo "Migrations completed!"
echo "Starting Wrangler dev server..."

exec pnpm dev
