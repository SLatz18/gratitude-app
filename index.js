require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser'); // Optional, as Express 4.16+ includes JSON parsing
const cors = require('cors');
const session = require('express-session');
const { Pool } = require('pg');
const crypto = require('crypto');

// Initialize OpenAI client (using v4 syntax with chat completions)
const OpenAI = require('openai');
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Ensure your OPENAI_API_KEY is set
});

const app = express();
const port = process.env.PORT || 3000;

// Use a random session secret if one isn't provided
const sessionSecret = process.env.SESSION_SECRET || crypto.randomBytes(16).toString('hex');

// Middleware
app.use(bodyParser.json());
app.use(cors());
app.use(
  session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: true,
  })
);
// Serve static files from the "public" folder
app.use(express.static('public'));

// Initialize PostgreSQL connection using environment variable
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Function to initialize the database (create table if it doesn't exist)
// and add the 'category' and 'session_id' columns if needed.
async function initDb() {
  try {
    // Create table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS entries (
        id SERIAL PRIMARY KEY,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    // Add the "category" column if it doesn't exist.
    await pool.query(`
      ALTER TABLE entries 
      ADD COLUMN IF NOT EXISTS category VARCHAR(50);
    `);
    // Add the "session_id" column if it doesn't exist.
    await pool.query(`
      ALTER TABLE entries 
      ADD COLUMN IF NOT EXISTS session_id TEXT;
    `);
    console.log('Database initialized.');
  } catch (err) {
    console.error('Error initializing database:', err);
  }
}

// ------------------
// API Endpoints
// ------------------

// Basic endpoint to verify the API is working
app.get('/api', (req, res) => {
  res.send('Gratitude API is running.');
});

// Public entries: show only entries created by the current session.
app.get('/api/public-entries', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM entries WHERE session_id = $1 ORDER BY created_at DESC',
      [req.sessionID]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// All entries: returns all entries with a non-null, non-"Uncategorized" category.
// This is used for building the word cloud.
app.get('/api/all-entries', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM entries 
      WHERE category IS NOT NULL AND LOWER(category) <> 'uncategorized'
      ORDER BY created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Secret entries: returns all entries; requires a password query parameter matching process.env.LIST_PASSWORD.
app.get('/api/secret-entries', async (req, res) => {
  const { password } = req.query;
  if (password !== process.env.LIST_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const result = await pool.query('SELECT * FROM entries ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// GET a single entry by id
app.get('/api/entries/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM entries WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Entry not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// POST to create a new entry (with content)
// Calls OpenAI for categorization before inserting into the database and saves the session ID.
app.post('/api/entries', async (req, res) => {
  try {
    const { content } = req.body;
    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }
    
    // Build messages for chat completions with guidance examples.
    const messages = [
      {
        role: 'system',
        content: "You are a helpful categorization assistant. When given a gratitude entry, determine the most appropriate category for it. For example, common categories might include Family, Friends, Work, Health, Personal Growth, and Entertainment. However, if none of these fit well, feel free to choose a different category that best describes the entry. Respond with only the category name.",
      },
      {
        role: 'user',
        content: `Categorize the following gratitude entry: "${content}"`,
      }
    ];
    
    const modelName = 'gpt-3.5-turbo';
    const aiResponse = await openai.chat.completions.create({
      model: modelName,
      messages,
      max_tokens: 10,
      temperature: 0,
    });
    
    if (!aiResponse.choices || aiResponse.choices.length === 0) {
      throw new Error("OpenAI API returned no choices");
    }
    
    const firstChoice = aiResponse.choices[0];
    let category;
    if (firstChoice.message && firstChoice.message.content) {
      category = firstChoice.message.content;
    } else if (firstChoice.text) {
      category = firstChoice.text;
    } else {
      throw new Error("OpenAI API returned no content in the message");
    }
    category = category.trim();
    
    const result = await pool.query(
      'INSERT INTO entries (content, category, session_id, created_at, updated_at) VALUES ($1, $2, $3, NOW(), NOW()) RETURNING *',
      [content, category, req.sessionID]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating entry:', err);
    res.status(500).json({ error: 'Failed to categorize and create entry' });
  }
});

// PUT to update an existing entry by id (only content)
app.put('/api/entries/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const result = await pool.query(
      'UPDATE entries SET content = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [content, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Entry not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// DELETE an entry by id
app.delete('/api/entries/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM entries WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Entry not found' });
    }
    res.json({ message: 'Entry deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Start the server after DB Initialization
initDb().then(() => {
  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
});
