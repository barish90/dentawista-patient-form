/*
  # Add X-Ray Image Storage

  1. Storage
    - Create a new storage bucket for x-ray images
    - Enable RLS policies for authenticated users
*/

-- Create a new storage bucket for x-ray images
INSERT INTO storage.buckets (id, name)
VALUES ('xray-images', 'xray-images')
ON CONFLICT (id) DO NOTHING;

-- Enable RLS for the bucket
CREATE POLICY "Allow authenticated users to upload x-ray images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'xray-images');

CREATE POLICY "Allow authenticated users to view their x-ray images"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'xray-images');