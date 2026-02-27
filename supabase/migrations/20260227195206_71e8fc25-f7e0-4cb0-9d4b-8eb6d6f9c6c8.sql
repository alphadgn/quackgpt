
-- Remove existing permissive storage policies on avatars bucket
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload an avatar" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update their avatar" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete their avatar" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own avatars" ON storage.objects;

-- Allow public READ access (profile pictures need to be viewable)
CREATE POLICY "Public read access for avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Deny all direct client INSERT (edge function uses service role)
CREATE POLICY "Deny direct avatar uploads"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'avatars' AND false);

-- Deny all direct client UPDATE
CREATE POLICY "Deny direct avatar updates"
ON storage.objects FOR UPDATE
USING (bucket_id = 'avatars' AND false);

-- Deny all direct client DELETE
CREATE POLICY "Deny direct avatar deletes"
ON storage.objects FOR DELETE
USING (bucket_id = 'avatars' AND false);
