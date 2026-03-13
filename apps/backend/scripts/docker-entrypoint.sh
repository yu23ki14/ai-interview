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
CI=true pnpm wrangler d1 migrations apply my-database --local
echo "Migrations completed!"

echo "Starting Wrangler dev server..."
exec pnpm dev
