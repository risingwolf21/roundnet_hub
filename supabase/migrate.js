// npm install @supabase/supabase-js@1
const { createClient } = require('@supabase/supabase-js');

const NEW_PROJECT_URL = 'https://gfvaurdkieqkehsuwotr.supabase.co';
const NEW_PROJECT_SERVICE_KEY =
  'REMOVED_KEY';

const OLD_PROJECT_URL = 'https://PROJECT_REF.supabase.co';
const OLD_PROJECT_SERVICE_KEY =
  'REMOVED_KEY';

(async () => {

  const oldSupabaseClient = createClient(OLD_PROJECT_URL, OLD_PROJECT_SERVICE_KEY);
  const newSupabaseClient = createClient(NEW_PROJECT_URL, NEW_PROJECT_SERVICE_KEY);

  // make sure you update max_rows in postgrest settings if you have a lot of objects
  // or paginate here
  const { data: oldObjects, error } = await oldSupabaseClient.schema("storage").from('objects').select();
  if (error) {
    console.log('error getting objects from old bucket', error);
    throw error;
  }

  for (const objectData of oldObjects) {
    console.log(`moving ${objectData.id}`);
    try {
      const { data, error: downloadObjectError } = await oldSupabaseClient.storage
        .from(objectData.bucket_id)
        .download(objectData.name);
      if (downloadObjectError) {
        throw downloadObjectError;
      }

      const { _, error: uploadObjectError } = await newSupabaseClient.storage
        .from(objectData.bucket_id)
        .upload(objectData.name, data, {
          upsert: true,
          contentType: objectData.metadata.mimetype,
          cacheControl: objectData.metadata.cacheControl,
        });
      if (uploadObjectError) {
        throw uploadObjectError;
      }
    } catch (err) {
      console.log('error moving ', objectData);
      console.log(err);
    }
  }
})();
