-- Add image_url column to teacher_documents for storing document scan/photo
ALTER TABLE teacher_documents
  ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT NULL;
