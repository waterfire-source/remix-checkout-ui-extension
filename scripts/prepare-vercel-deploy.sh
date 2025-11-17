#!/bin/bash

# Script to prepare your project for Vercel deployment
# This script helps migrate from SQLite to PostgreSQL

echo "🚀 Preparing project for Vercel deployment..."

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "❌ Error: DATABASE_URL environment variable is not set"
  echo "Please set your PostgreSQL connection string:"
  echo "export DATABASE_URL='postgresql://user:password@host:port/database'"
  exit 1
fi

# Backup current schema
echo "📦 Backing up current schema..."
cp prisma/schema.prisma prisma/schema.sqlite.backup

# Copy PostgreSQL schema
echo "📝 Updating schema for PostgreSQL..."
cp prisma/schema.postgresql.prisma prisma/schema.prisma

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

# Create migration
echo "🗄️  Creating migration..."
npx prisma migrate dev --name migrate_to_postgresql

echo "✅ Project is ready for Vercel deployment!"
echo ""
echo "Next steps:"
echo "1. Set all environment variables in Vercel"
echo "2. Ensure STORAGE_METHOD is set to 's3', 'cloudinary', or 'shopify' (NOT 'local')"
echo "3. Deploy to Vercel: vercel --prod"
echo "4. Run migrations on production: npx prisma migrate deploy"

