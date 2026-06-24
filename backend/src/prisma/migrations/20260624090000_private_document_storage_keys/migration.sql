-- Convert legacy Cloudinary delivery URLs into the private storage key format
-- used by the application: public_id|resource_type. The app signs these keys
-- on demand with a short expiry instead of returning public delivery URLs.
CREATE OR REPLACE FUNCTION private_document_storage_key(value TEXT)
RETURNS TEXT AS $$
DECLARE
  clean_url TEXT;
  path TEXT;
  parts TEXT[];
  resource_type TEXT;
  public_start INT := 4;
  public_id TEXT;
  idx INT;
BEGIN
  IF value IS NULL OR value !~ '^https?://res\.cloudinary\.com/' THEN
    RETURN value;
  END IF;

  clean_url := split_part(value, '?', 1);
  path := regexp_replace(clean_url, '^https?://res\.cloudinary\.com/', '');
  parts := string_to_array(path, '/');
  resource_type := parts[2];

  IF array_length(parts, 1) < 4 THEN
    RETURN value;
  END IF;

  IF resource_type NOT IN ('image', 'raw', 'video') THEN
    RETURN value;
  END IF;

  FOR idx IN 4..array_length(parts, 1) LOOP
    IF parts[idx] ~ '^v[0-9]+$' THEN
      public_start := idx + 1;
      EXIT;
    END IF;
  END LOOP;

  IF public_start > array_length(parts, 1) THEN
    RETURN value;
  END IF;

  public_id := array_to_string(parts[public_start:array_length(parts, 1)], '/');

  IF public_id IS NULL OR public_id = '' THEN
    RETURN value;
  END IF;

  IF resource_type <> 'raw' THEN
    public_id := regexp_replace(public_id, '\.[^/.]+$', '');
  END IF;

  RETURN public_id || '|' || resource_type;
END;
$$ LANGUAGE plpgsql;

UPDATE "onboarding_document_submissions"
SET "fileUrl" = private_document_storage_key("fileUrl")
WHERE "fileUrl" ~ '^https?://res\.cloudinary\.com/';

UPDATE "offboarding_records"
SET "attachmentUrl" = private_document_storage_key("attachmentUrl")
WHERE "attachmentUrl" ~ '^https?://res\.cloudinary\.com/';

DROP FUNCTION private_document_storage_key(TEXT);
