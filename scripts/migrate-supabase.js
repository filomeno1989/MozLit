const { Client } = require('pg');

const c = new Client({
  host: 'aws-0-eu-west-1.pooler.supabase.com',
  port: 5432,
  database: 'postgres',
  user: 'postgres.jeyjzfpnersgfbavamsa',
  password: 'Filom3no1989',
  ssl: { rejectUnauthorized: false }
});

async function migrate() {
  await c.connect();
  console.log('Connected to Supabase!');

  // 1. Drop FK from profiles to auth.users
  console.log('\n1. Dropping profiles -> auth.users FK...');
  try {
    await c.query('ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey');
    console.log('   Done.');
  } catch(e) { console.log('   FK not found or error:', e.message); }

  // 2. Add missing columns to books
  console.log('\n2. Adding missing columns to books...');
  const bookCols = [
    { col: 'categorias', type: 'TEXT', def: "DEFAULT '[]'" },
    { col: 'ficha_tecnica', type: 'TEXT', def: "DEFAULT ''" },
    { col: 'dedicatoria', type: 'TEXT', def: "DEFAULT ''" },
    { col: 'epigrafe', type: 'TEXT', def: "DEFAULT ''" },
    { col: 'epilogo', type: 'TEXT', def: "DEFAULT ''" },
  ];
  for (const { col, type, def } of bookCols) {
    try {
      await c.query('ALTER TABLE books ADD COLUMN IF NOT EXISTS ' + col + ' ' + type + ' ' + def);
      console.log('   Added: ' + col);
    } catch(e) { console.log('   ' + col + ':', e.message); }
  }

  // 3. Add senha_hash to profiles
  console.log('\n3. Adding senha_hash to profiles...');
  try {
    await c.query("ALTER TABLE profiles ADD COLUMN IF NOT EXISTS senha_hash TEXT DEFAULT ''");
    console.log('   Done.');
  } catch(e) { console.log('   Error:', e.message); }

  // 4. Add updated_at to transactions
  console.log('\n4. Adding updated_at to transactions...');
  try {
    await c.query("ALTER TABLE transactions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now()");
    console.log('   Done.');
  } catch(e) { console.log('   Error:', e.message); }

  // 5. Verify
  console.log('\n5. Verifying columns...');
  const res = await c.query(
    "SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name IN ('profiles','books') ORDER BY table_name, ordinal_position"
  );
  res.rows.forEach(r => console.log('   ' + r.table_name + '.' + r.column_name + ' (' + r.data_type + ')'));

  console.log('\nMigration complete!');
  await c.end();
}

migrate().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
