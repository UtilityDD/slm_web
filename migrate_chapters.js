import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Your Supabase credentials
const supabaseUrl = 'https://wkunyvomogeazjwtenck.supabase.co';
// ⚠️ ENSURE THIS IS THE SERVICE_ROLE KEY, NOT ANON KEY
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndrdW55dm9tb2dlYXpqd3RlbmNrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTUwMjAwOCwiZXhwIjoyMDgxMDc4MDA4fQ.-9PRVoAfdlOxmekJiyNswh2t_-5vRKjjLpr3cywS0H4';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

// Path to your quizzes folder
const quizzesDir = path.join(__dirname, 'public', 'quizzes');

async function migrateChapters() {
    console.log('🚀 Starting chapter migration...\n');

    // Find all chapter_*.json files
    const files = fs.readdirSync(quizzesDir)
        .filter(file => file.startsWith('chapter_') && file.endsWith('.json'))
        .sort();

    console.log(`📚 Found ${files.length} potential chapter files\n`);

    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    for (const file of files) {
        try {
            // Read the JSON file
            const filePath = path.join(quizzesDir, file);
            const contentRaw = fs.readFileSync(filePath, 'utf8');

            // Handle BOM if present
            const jsonContent = JSON.parse(contentRaw.replace(/^\uFEFF/, ''));

            // SKIP files that don't match the standard chapter schema
            if (!jsonContent.level_id) {
                console.log(`⚠️ Skipped: ${file} (Missing level_id, possibly FAQ or other type)`);
                skippedCount++;
                continue;
            }

            // Extract module and chapter numbers from level_id (e.g., "1.1" -> module: 1, chapter: 1)
            const levelId = jsonContent.level_id;
            const parts = levelId.split('.');

            if (parts.length < 2) {
                console.log(`⚠️ Skipped: ${file} (Invalid level_id format: ${levelId})`);
                skippedCount++;
                continue;
            }

            const moduleNum = parseInt(parts[0]);
            const chapterNum = parseInt(parts[1]);

            // Prepare the row for insertion
            const row = {
                id: levelId,
                module_number: moduleNum,
                chapter_number: chapterNum,
                title: jsonContent.level_title || jsonContent.title || 'Untitled',
                badge_name: jsonContent.badge_name,
                content: jsonContent,
                language: file.includes('_en') ? 'en' : 'bn', // Detect language from filename
                is_active: true
            };

            // Insert into Supabase
            const { error } = await supabase
                .from('training_chapters')
                .upsert(row, { onConflict: 'id' });

            if (error) {
                console.error(`❌ Supabase Error for ${file}:`, error.message);
                throw error;
            }

            console.log(`✅ Migrated: ${file} (${levelId})`);
            successCount++;

        } catch (error) {
            console.error(`❌ Error migrating ${file}:`, error.message);
            errorCount++;
        }
    }

    console.log('\n📊 Migration Summary:');
    console.log(`   ✅ Success: ${successCount}`);
    console.log(`   ⚠️ Skipped: ${skippedCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log(`   📁 Total: ${files.length}`);
}

migrateChapters().then(() => {
    console.log('\n🎉 Migration complete!');
    process.exit(0);
}).catch(err => {
    console.error('\n💥 Migration failed:', err);
    process.exit(1);
});
