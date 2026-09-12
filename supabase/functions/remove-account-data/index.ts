import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

Deno.serve(async (req) => {
  const expected = Deno.env.get("SUPABASE_ANON_KEY") || "";
  if (!expected || !req.headers.get("authorization")?.includes(expected)) {
    return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { "Content-Type": "application/json" } });
  }
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return new Response(JSON.stringify({ error: "Missing service configuration" }), { status: 500 });
  const cloud = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  let identitiesDeleted = 0;
  let page = 1;
  while (true) {
    const { data, error } = await cloud.auth.admin.listUsers({ page, perPage: 100 });
    if (error) throw error;
    const users = data.users || [];
    for (const user of users) {
      const { error: deleteError } = await cloud.auth.admin.deleteUser(user.id);
      if (deleteError) throw deleteError;
      identitiesDeleted += 1;
    }
    if (users.length < 100) break;
    page += 1;
  }

  const emptyResult = await cloud.storage.emptyBucket("avatars");
  if (emptyResult.error && !emptyResult.error.message.toLowerCase().includes("not found")) throw emptyResult.error;
  const removeResult = await cloud.storage.deleteBucket("avatars");
  if (removeResult.error && !removeResult.error.message.toLowerCase().includes("not found")) throw removeResult.error;

  return new Response(JSON.stringify({ success: true, identitiesDeleted, avatarBucketRemoved: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
