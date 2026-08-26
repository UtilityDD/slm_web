-- Fix non-Bangla Cyrillic leak in lesson 7.2 (работодаাতা → নিয়োগকর্তা)
-- Source: sections[0].points[0].importance in training_chapters content (bn)

UPDATE training_chapters
SET
  content = replace(content::text, 'работодаাতা', 'নিয়োগকর্তা')::jsonb,
  version = COALESCE(version, 0) + 1
WHERE id = '7.2'
  AND language = 'bn'
  AND content::text LIKE '%работодаাতা%';
