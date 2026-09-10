const { createClient } = require('@supabase/supabase-js');

// SEGURANÇA: credenciais lidas das variáveis de ambiente (.env.local, nunca no git)
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function createBucket() {
  // Try to create the bucket
  const { data, error } = await supabase.storage.createBucket('covers', {
    public: true,
    fileSizeLimit: 5242880,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  });

  if (error) {
    if (error.message.includes('already exists')) {
      console.log('Bucket "covers" already exists.');
    } else {
      console.error('Error creating bucket:', error.message);
    }
  } else {
    console.log('Bucket "covers" created successfully!');
  }

  // List buckets to confirm
  const { data: buckets } = await supabase.storage.listBuckets();
  console.log('Buckets:', buckets?.map(b => b.name + ' (public: ' + b.public + ')'));
}

createBucket();
