
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Credentials found in src/supabaseClient.js
const supabaseUrl = 'https://wkunyvomogeazjwtenck.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndrdW55dm9tb2dlYXpqd3RlbmNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1MDIwMDgsImV4cCI6MjA4MTA3ODAwOH0.iY8BjqhUn8rvOwul9a0625LQ_TGmauth5Ltml5mTcR0';

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function migrate() {
    console.log("🚀 Starting migration...");

    const rowsToInsert = [];

    // --- 1. Process English Questions ---
    try {
        const enPath = path.join(__dirname, 'public', 'quizzes', 'hourly_challenge_en.json');
        if (fs.existsSync(enPath)) {
            const enData = JSON.parse(fs.readFileSync(enPath, 'utf8'));
            console.log(`📖 Found ${enData.length} items in English file.`);

            enData.forEach(q => {
                // Validate it's a quiz question
                if (q.questionText && Array.isArray(q.options) && q.correctAnswerIndex !== undefined) {
                    rowsToInsert.push({
                        question_text: q.questionText,
                        options: q.options,
                        correct_answer_index: q.correctAnswerIndex,
                        category: q.category || 'General',
                        tags: q.tags || [],
                        language: 'en'
                    });
                }
            });
        } else {
            console.warn("⚠️ English file not found.");
        }
    } catch (e) {
        console.error("❌ Error processing English file:", e.message);
    }

    // --- 2. Process Bengali Questions ---
    try {
        const bnPath = path.join(__dirname, 'public', 'quizzes', 'hourly_challenge.json');
        if (fs.existsSync(bnPath)) {
            const bnData = JSON.parse(fs.readFileSync(bnPath, 'utf8'));
            console.log(`📖 Found ${bnData.length} items in Bengali file.`);

            bnData.forEach(q => {
                // Handle different field names if necessary
                const qText = q.questionText || q.question;

                // IMPORTANT: Only migrate if it has options (MCQ format)
                if (qText && Array.isArray(q.options) && q.correctAnswerIndex !== undefined) {
                    rowsToInsert.push({
                        question_text: qText,
                        options: q.options,
                        correct_answer_index: q.correctAnswerIndex,
                        category: q.category || 'General',
                        tags: q.tags || [],
                        language: 'bn'
                    });
                }
            });
        } else {
            console.warn("⚠️ Bengali file not found.");
        }
    } catch (e) {
        console.error("❌ Error processing Bengali file:", e.message);
    }

    console.log(`✅ Prepared ${rowsToInsert.length} valid questions for upload.`);

    if (rowsToInsert.length === 0) {
        console.log("No questions to upload.");
        return;
    }

    // --- 3. Generate SQL File instead of Uploading ---
    console.log("📝 Generating SQL insert script...");

    let sqlContent = `-- Insert questions into hourly_questions table\n`;
    sqlContent += `INSERT INTO public.hourly_questions (question_text, options, correct_answer_index, category, tags, language)\nVALUES\n`;

    const values = rowsToInsert.map(row => {
        const qText = row.question_text.replace(/'/g, "''"); // Escape single quotes
        const optionsJson = JSON.stringify(row.options).replace(/'/g, "''");
        const category = row.category.replace(/'/g, "''");
        const tagsArray = `{${row.tags.map(t => `"${t.replace(/"/g, '\\"')}"`).join(',')}}`; // Postgres array format

        return `('${qText}', '${optionsJson}'::jsonb, ${row.correct_answer_index}, '${category}', '${tagsArray}', '${row.language}')`;
    });

    sqlContent += values.join(',\n') + ';';

    const outputPath = path.join(__dirname, 'insert_questions.sql');
    fs.writeFileSync(outputPath, sqlContent, 'utf8');

    console.log(`✅ Generated SQL file at: ${outputPath}`);
    console.log("👉 Please copy the content of 'insert_questions.sql' and run it in your Supabase SQL Editor.");
}

migrate();
