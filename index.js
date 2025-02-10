require('dotenv').config(); // Load environment variables
const OpenAI = require('openai');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(cors());

// PostgreSQL connection
const pool = new Pool({
connectionString: process.env.DATABASE_URL,
});

// OpenAI API initialization
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Function to categorize journal entries
async function categorizeEntry(text) {
const prompt = 'Analyze the following journal entry and suggest two categories it fits into. The categories should be general themes such as "Family," "Work," "Health," "Personal Growth," "Hobbies," or "Community Service".\n\nEntry: "${text}"\n\nCategories:';

try {
const response = await openai.completions.create({
model: "gpt-4-turbo",
messages: [{ role: "user", content: prompt }],
max_tokens: 20,
temperature: 0.5,
});

const categories = response.choices[0].message.content.trim().split(',').map(c => c.trim());
return categories.slice(0, 2); // Ensure we only take two categories

} catch (error) {
console.error("OpenAI API Error:", error);
return ["Uncategorized", "Uncategorized"]; // Fallback
}
}

// Function to apply database migrations
async function runMigrations() {
try {
const migrationQuery =       ALTER TABLE entries ADD COLUMN IF NOT EXISTS category1 TEXT;
      ALTER TABLE entries ADD COLUMN IF NOT EXISTS category2 TEXT;
   ;
await pool.query(migrationQuery);
console.log("Database migrations applied successfully.");
} catch (error) {
console.error("Error applying migrations:", error);
}
}

// Modify the API to auto-categorize entries
app.post('/api/entries', async (req, res) => {
try {
const { content, tags } = req.body;

// Get categories from OpenAI
const [category1, category2] = await categorizeEntry(content);

// Insert entry into database with categories
const result = await pool.query(
  'INSERT INTO entries (content, tags, category1, category2, created_at, updated_at) VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING *',
  [content, tags, category1, category2]
);

res.status(201).json(result.rows[0]);

} catch (err) {
console.error(err);
res.status(500).json({ error: 'Database or AI processing error' });
}
});

// Run migrations before starting the server
runMigrations().then(() => {
app.listen(port, () => {
console.log(Server is running on port ${port});
});
});

