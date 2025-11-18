#!/bin/bash
# Execute Opinion Map migration in Supabase

SUPABASE_URL="https://rgegkezdegibgbdqzesd.supabase.co"
SUPABASE_SERVICE_KEY="sb_secret_4EUlULaDjOxNHaBSHdtzUw_jZe4VUCK"

echo "🔄 Executing Opinion Map migration..."
echo ""

# Read the migration SQL
SQL_FILE="migrations/20251118_opinion_map_tables.sql"

if [ ! -f "$SQL_FILE" ]; then
  echo "❌ Migration file not found: $SQL_FILE"
  exit 1
fi

# Execute via Supabase REST API
curl -X POST "${SUPABASE_URL}/rest/v1/rpc/exec_sql" \
  -H "apikey: ${SUPABASE_SERVICE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -d @<(cat <<JSON
{
  "query": $(cat "$SQL_FILE" | jq -Rs .)
}
JSON
)

echo ""
echo "✅ Migration executed!"
