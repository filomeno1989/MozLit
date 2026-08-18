const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://jeyjzfpnersgfbavamsa.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpleWp6ZnBuZXJzZ2ZiYXZhbXNhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDA0MTE2NCwiZXhwIjoyMDk5NjE3MTY0fQ.xyu2WqB8la4r-6ALyvyOqDwMqB4QrxRrPCJpCbFeheY'
);

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
