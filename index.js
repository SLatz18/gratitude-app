require('dotenv').config(); // Load environment variables

// Import and configure OpenAI
const { Configuration, OpenAIApi } = require('openai');
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

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

// Function to categorize journal entries
async function categorizeEntry(text) {
  // Use backticks so that ${text} is interpolated properly
  const prompt = `Analyze the following journal entry and suggest two categories it fits into. The categories should be general themes such as "Family," "Work," "Health," "Personal Growth," "Hobbies," or "Community Service".\n\nEntry: "${text}"\n\nCategories:`;

  try {
    // Use the chat completions endpoint for GPT-4-turbo
    const response = await openai.createChatCompletion({
      model: "gpt-4-turbo",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 20,
      temperature: 0.5,
    });

    // Access the content from the response and split it into categories
    const categories = response.data.choices[0].message.content
      .trim()
      .split(',')
      .map(c => c.trim());
    return categories.slice(0, 2); // Ensure only two categories are returned

  } catch (error) {
    console.error("OpenAI API Error:", error);
    return ["Uncategorized", "Uncategorized"]; // Fallback categories
  }
}

// Function to apply database migrations
async function runMigrations() {
  try {
    // Use a template literal to properly format the migration query
    const migrationQuery = `
      ALTER TABLE entries ADD COLUMN IF NOT EXISTS category1 TEXT;
      ALTER TABLE entries ADD COLUMN IF NOT EXISTS category2 TEXT;
    `;
    await pool.query(migrationQuery);
    console.log("Database migrations applied successfully.");
  } catch (error) {
    console.error("Error applying migrations:", error);
  }
}

// Endpoint to create an entry with auto-categorization
app.post('/api/entries', async (req, res) => {
  try {
    const { content, tags } = req.body;

    // Get categories from OpenAI based on the entry content
    const [category1, category2] = await categorizeEntry(content);

    // Insert the new entry along with its categories into the database
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
    console.log(`Server is running on port ${port}`);
  });
});
