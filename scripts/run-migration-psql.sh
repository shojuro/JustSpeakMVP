#!/bin/bash

# Script to run migration 002_esl_corrections.sql using psql
# Creates user_progress and corrections tables in Supabase

# Load environment variables
source "$(dirname "$0")/../.env"

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ Error: DATABASE_URL not found in .env file"
    exit 1
fi

# Path to migration file
MIGRATION_FILE="$(dirname "$0")/../supabase/migrations/002_esl_corrections.sql"

# Check if migration file exists
if [ ! -f "$MIGRATION_FILE" ]; then
    echo "❌ Error: Migration file not found at $MIGRATION_FILE"
    exit 1
fi

echo "🔧 Running migration 002_esl_corrections.sql..."
echo "📄 Migration file: $MIGRATION_FILE"
echo "🗄️  Database: Supabase PostgreSQL"
echo ""

# Run the migration using psql
psql "$DATABASE_URL" -f "$MIGRATION_FILE"

# Check if the command was successful
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Migration completed successfully!"
    echo ""
    echo "📊 Created tables:"
    echo "  - corrections (for storing error analysis)"
    echo "  - user_progress (for tracking improvement)"
    echo ""
    echo "🔒 Row Level Security policies applied"
    echo "🏗️  Indexes created for performance"
    echo "⚡ Helper function update_user_progress created"
else
    echo ""
    echo "❌ Migration failed. Please check the error messages above."
    exit 1
fi