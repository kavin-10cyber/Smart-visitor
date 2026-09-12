const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

let supabaseUrl = (process.env.SUPABASE_URL || '').trim().replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
const supabaseAnonKey = (process.env.SUPABASE_ANON_KEY || '').trim();

if (!supabaseUrl || !supabaseAnonKey || !supabaseUrl.startsWith('http')) {
  console.error('❌ Please configure SUPABASE_URL and SUPABASE_ANON_KEY in server/.env before migrating.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const DATA_FILE = path.join(__dirname, '..', 'data', 'local_db.json');

async function migrate() {
  console.log('🚀 Starting migration from local_db.json to Supabase...\n');

  if (!fs.existsSync(DATA_FILE)) {
    console.error('❌ local_db.json not found at', DATA_FILE);
    process.exit(1);
  }

  const raw = fs.readFileSync(DATA_FILE, 'utf8');
  const localDb = JSON.parse(raw);

  // 1. Migrate Tokens
  const tokens = localDb.visitor_tokens || [];
  console.log(`📦 Found ${tokens.length} tokens to migrate...`);

  const tokenCodeToIdMap = {};

  for (const t of tokens) {
    // Check if token already exists in Supabase
    const { data: existing } = await supabase
      .from('visitor_tokens')
      .select('id, token_code, status')
      .eq('token_code', t.token_code)
      .single();

    if (existing) {
      tokenCodeToIdMap[t.token_code] = existing.id;
      console.log(`   ⏭️ Token ${t.token_code} already exists (ID: ${existing.id})`);
    } else {
      const { data: inserted, error } = await supabase
        .from('visitor_tokens')
        .insert([{
          token_code: t.token_code,
          status: t.status || 'AVAILABLE',
          created_at: t.created_at || new Date().toISOString()
        }])
        .select()
        .single();

      if (error) {
        console.error(`   ❌ Failed to insert token ${t.token_code}:`, error.message);
      } else {
        tokenCodeToIdMap[t.token_code] = inserted.id;
        console.log(`   ✅ Inserted token ${t.token_code}`);
      }
    }
  }

  // 2. Migrate Visits
  const visits = localDb.visits || [];
  console.log(`\n📋 Found ${visits.length} visit records to migrate...`);

  for (const v of visits) {
    const tokenId = tokenCodeToIdMap[v.token_code] || null;

    // Check if visit record already exists by token_code and check_in
    const { data: existing } = await supabase
      .from('visits')
      .select('id')
      .eq('token_code', v.token_code)
      .eq('check_in', v.check_in)
      .single();

    if (existing) {
      console.log(`   ⏭️ Visit for ${v.full_name} (${v.token_code}) already exists`);
    } else {
      const { error } = await supabase
        .from('visits')
        .insert([{
          token_id: tokenId,
          token_code: v.token_code,
          full_name: v.full_name,
          mobile: v.mobile,
          address: v.address || '',
          purpose: v.purpose || 'General',
          expected_duration: v.expected_duration || '1 Hour',
          check_in: v.check_in,
          check_out: v.check_out || null,
          status: v.status || 'COMPLETED',
          created_at: v.created_at || v.check_in
        }]);

      if (error) {
        console.error(`   ❌ Failed to insert visit for ${v.full_name}:`, error.message);
      } else {
        console.log(`   ✅ Migrated visit for ${v.full_name} (${v.token_code})`);
      }
    }
  }

  console.log('\n🎉 Migration complete! Your Supabase database is synced with local data.');
}

migrate().catch(err => {
  console.error('Fatal migration error:', err);
  process.exit(1);
});
