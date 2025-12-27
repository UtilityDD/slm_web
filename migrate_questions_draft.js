
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// --- CONFIGURATION ---
// You need to fill these in or set them as environment variables
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL_HERE';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY_HERE';

// If you don't have env vars set in this shell, you might need to hardcode them temporarily 
// or load them from .env file. For this script, we'll try to read from .env if possible,
// otherwise we'll ask the user to provide them.

// Simple .env parser for this script context
function loadEnv() {
    try {
        const envPath = path.resolve(process.cwd(), '.env');
        if (fs.existsSync(envPath)) {
            const envConfig = fs.readFileSync(envPath, 'utf8');
            envConfig.split('\n').forEach(line => {
                const [key, value] = line.split('=');
                if (key && value) {
                    process.env[key.trim()] = value.trim();
                }
            });
        }
    } catch (e) {
        console.log("Could not load .env file, relying on process.env");
    }
}

loadEnv();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Error: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set in your .env file.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function migrate() {
    console.log("🚀 Starting migration...");

    // 1. Load English Questions
    const enPath = path.join(__dirname, 'public', 'quizzes', 'hourly_challenge_en.json');
    const enData = JSON.parse(fs.readFileSync(enPath, 'utf8'));
    console.log(`📖 Loaded ${enData.length} English questions.`);

    // 2. Load Bengali Questions
    const bnPath = path.join(__dirname, 'public', 'quizzes', 'hourly_challenge.json');
    const bnData = JSON.parse(fs.readFileSync(bnPath, 'utf8'));
    console.log(`📖 Loaded ${bnData.length} Bengali questions.`);

    // 3. Prepare Data for Insertion
    const rowsToInsert = [];

    // Process English
    enData.forEach(q => {
        rowsToInsert.push({
            question_text: q.questionText, // Note: JSON has 'questionText'
            options: q.options,
            correct_answer_index: q.correctAnswerIndex,
            category: 'General', // Default for English as it's not in JSON
            tags: [], // Default empty
            language: 'en'
        });
    });

    // Process Bengali
    bnData.forEach(q => {
        rowsToInsert.push({
            question_text: q.question, // Note: JSON has 'question'
            options: q.options || [], // Some might be missing options in raw file? Assuming structure from earlier view
            // Wait, looking at previous file view, Bengali JSON structure is:
            // { id, question, answer, category, tags } 
            // It DOES NOT have 'options' or 'correctAnswerIndex' in the view I saw earlier!
            // Let me re-check the Bengali JSON structure in the code view.
            // ...
            // The view showed: "question", "answer", "category", "tags". 
            // It seems the Bengali quiz is "Flashcard" style (Question + Answer), not Multiple Choice?
            // OR the options are missing in the file I viewed?
            // Let's check the Competitions.jsx to see how it handles Bengali data.

            // If it is flashcard style, we might need to adapt.
            // But Competitions.jsx code (which I can't see right now but recall) usually handles MCQs.
            // Let's assume for a moment I need to check this before proceeding with Bengali.

            // For now, I will comment out Bengali insertion until I verify the structure.
            // logic placeholder
            language: 'bn'
        });
    });

    // ... (Stopping script generation to verify Bengali JSON structure first)
}

// Actually, I need to verify the Bengali JSON structure first because my previous view
// showed "question" and "answer" but NOT "options".
// If it's just Q&A, how is it used as a quiz?
// Ah, maybe the user's "Hourly Quiz" for Bengali is different?
// Let's pause writing this file and verify the Bengali JSON content again.
