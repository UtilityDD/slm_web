# Guide: Adding Hints to hourly_questions Table

This guide will walk you through the process of adding a `hint` column to your existing `hourly_questions` table and populating it with hint values.

## 📋 Prerequisites
- Access to your Supabase dashboard
- SQL Editor access in Supabase

---

## Step 1: Add the `hint` Column to Your Table

### ✅ Action:
1. Open your **Supabase Dashboard**
2. Navigate to: **SQL Editor** (left sidebar)
3. Click **"+ New Query"**
4. Copy and paste the following SQL:

```sql
-- Add hint column to hourly_questions table
ALTER TABLE hourly_questions ADD COLUMN IF NOT EXISTS hint TEXT;

COMMENT ON COLUMN hourly_questions.hint IS 'Educational hint for the question, shown after user selects an answer.';
```

5. Click **"Run"** or press `Ctrl+Enter`
6. You should see: ✅ **Success. No rows returned**

### ✨ What This Does:
- Adds a new `hint` column to your table
- Sets it as `TEXT` type (can store long hint descriptions)
- The column is **nullable** (it's OK if some questions don't have hints yet)

---

## Step 2: Export Your Current Data (Optional but Recommended)

### ✅ Action:
1. Go to **Table Editor** → Select `hourly_questions`
2. Click the **"..."** menu (top right)
3. Select **"Download as CSV"**
4. Save it as `hourly_questions_backup.csv`

### ✨ Why This Matters:
- Creates a backup before making changes
- Allows you to work offline on adding hints
- Easy to re-import if needed

---

## Step 3: View Your Current Questions

### ✅ Action:
Run this query to see all your questions:

```sql
SELECT id, question_text, hint 
FROM hourly_questions 
ORDER BY id;
```

### 📝 Note Down:
- The `id` of each question
- The `question_text` 
- Current `hint` value (will be `NULL` for all initially)

---

## Step 4: Add Hints to Your Questions

You have **3 options** to populate hints:

### **Option A: Update Individual Questions via SQL** (Best for few questions)

```sql
-- Update hints for specific questions
UPDATE hourly_questions SET hint = 'Remember: Safety equipment must meet OSHA standards' WHERE id = 1;
UPDATE hourly_questions SET hint = 'Think about the minimum distance required from power lines' WHERE id = 2;
UPDATE hourly_questions SET hint = 'Consider the proper grounding procedure' WHERE id = 3;
-- Add more as needed...
```

### **Option B: Bulk Update via CSV Upload** (Best for many questions)

1. **Edit your CSV backup:**
   - Open `hourly_questions_backup.csv` in Excel or Google Sheets
   - Add a new column called `hint`
   - Fill in hint text for each row
   - Save the file

2. **Re-import to Supabase:**
   - Go to **Table Editor** → `hourly_questions`
   - Click **"Insert"** → **"Import data from CSV"**
   - Upload your edited CSV
   - Map columns correctly
   - Check **"Update existing rows"** option
   - Click **"Import"**

### **Option C: Use a SQL Script** (Best for structured approach)

Create a file `update_hints.sql`:

```sql
-- Sample hints for safety questions
UPDATE hourly_questions 
SET hint = CASE id
    WHEN 1 THEN 'Safety first! Think about required certifications and standards.'
    WHEN 2 THEN 'Consider the voltage level and minimum safe distances.'
    WHEN 3 THEN 'Proper grounding is essential for electrical safety.'
    WHEN 4 THEN 'PPE should always be inspected before use.'
    WHEN 5 THEN 'Emergency protocols must be followed in sequence.'
    -- Add more WHEN clauses for each question ID
    ELSE hint -- Keep existing hints unchanged
END
WHERE id IN (1, 2, 3, 4, 5); -- List all question IDs you're updating
```

Run this in the SQL Editor.

---

## Step 5: Verify Your Updates

### ✅ Action:
Run this query to check your hints:

```sql
SELECT id, question_text, 
       CASE 
           WHEN hint IS NULL THEN '❌ No hint'
           ELSE '✅ ' || LEFT(hint, 50) || '...'
       END as hint_status
FROM hourly_questions
ORDER BY id;
```

This shows which questions have hints and previews their content.

---

## Step 6: Test in Your App

1. **Refresh your app** (the quiz component will now fetch the `hint` field)
2. **Start a quiz** in the Competitions section
3. **Select an answer** → The hint button (💡) should activate
4. **Click the hint button** → Your hint should display!

---

## 📊 Quick Reference: SQL Commands

### Check how many questions have hints:
```sql
SELECT 
    COUNT(*) as total_questions,
    COUNT(hint) as questions_with_hints,
    COUNT(*) - COUNT(hint) as questions_without_hints
FROM hourly_questions;
```

### List questions without hints:
```sql
SELECT id, question_text 
FROM hourly_questions 
WHERE hint IS NULL 
ORDER BY id;
```

### Clear all hints (if you want to start over):
```sql
UPDATE hourly_questions SET hint = NULL;
```

---

## 💡 Tips for Writing Good Hints

1. **Be Educational**: Help users learn, not just get the answer
2. **Stay Concise**: 1-2 sentences is ideal
3. **Use Context**: Reference concepts from your training materials
4. **Avoid Giving Away**: Hint should guide thinking, not reveal the answer directly

### Example Hints:
- ✅ Good: "Think about the minimum safe distance regulations for high-voltage lines"
- ❌ Too Direct: "The answer is 10 feet"
- ❌ Too Vague: "Think carefully"

---

## 🆘 Troubleshooting

### Issue: Column already exists error
**Solution**: The column was already added. Skip Step 1.

### Issue: Hints not showing in app
**Checklist**:
- Did you sync to Android? (`npx cap sync android`)
- Did you rebuild the app after syncing?
- Check browser console for errors

### Issue: CSV import fails
**Solution**: 
- Ensure CSV is UTF-8 encoded
- Match column names exactly
- Use "Update existing rows" option

---

## ✅ Checklist

- [ ] Added `hint` column to table (Step 1)
- [ ] Exported backup of current data (Step 2)
- [ ] Added hints to at least 5-10 questions (Step 4)
- [ ] Verified hints in Supabase (Step 5)
- [ ] Tested in web app
- [ ] Synced to Android (`npx cap sync android`)
- [ ] Tested in Android app

---

**Need help?** Check the SQL files in your project or ask for assistance!
