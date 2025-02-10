require('dotenv').config(); // Load environment variables

const OpenAI = require('openai').default; // Using OpenAI v4
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
  connectionString: process.env.DATABASE_URL
});

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Function to auto-categorize journal entries using OpenAI
async function categorizeEntry(text) {
  const prompt = `Analyze the following journal entry and output exactly two categories (from the list: Family, Work, Health, Personal Growth, Hobbies, Community Service) that best fit the entry.
Return your answer in the format "Category1, Category2" with no additional text.

Entry: "${text}"

Answer:`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", // or "gpt-3.5-turbo" if necessary
      messages: [{ role: "user", content: prompt }],
      max_tokens: 30,
      temperature: 0.5,
    });
    
    console.log("OpenAI response:", JSON.stringify(response, null, 2));
    const output = response.choices[0].message.content.trim();
    console.log("Parsed output:", output);
    const categories = output.split(',').map(c => c.trim());
    if (categories.length < 2) {
      console.warn("Unexpected format from OpenAI. Received:", output);
      return ["Uncategorized", "Uncategorized"];
    }
    return categories.slice(0, 2);
  } catch (error) {
    console.error("OpenAI API Error:", error.response ? error.response.data : error);
    return ["Uncategorized", "Uncategorized"];
  }
}


// ------------------
// Database Initialization
// ------------------
// Update the table creation to include auto-categorization columns.
async function initDb() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS entries (
        id SERIAL PRIMARY KEY,
        content TEXT NOT NULL,
        tags TEXT,
        category1 TEXT,
        category2 TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Database initialized and "entries" table is ready.');
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

// GET all entries (sorted by creation date descending)
app.get('/api/entries', async (req, res) => {
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

// POST to create a new entry with auto-categorization
app.post('/api/entries', async (req, res) => {
  try {
    const { content, tags } = req.body;
    // Get categories from OpenAI based on the content
    const [category1, category2] = await categorizeEntry(content);
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

// PUT to update an existing entry by id
app.put('/api/entries/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { content, tags } = req.body;
    const result = await pool.query(
      'UPDATE entries SET content = $1, tags = $2, updated_at = NOW() WHERE id = $3 RETURNING *',
      [content, tags, id]
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

// ------------------
// Front End Route - UI
// ------------------
app.get('/', (req, res) => {
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Gratitude Journal</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .entry { border: 1px solid #ddd; padding: 10px; margin-bottom: 10px; }
        .entry h3 { margin: 0 0 5px 0; }
      </style>
    </head>
    <body>
      <h1>Gratitude Journal</h1>

      <form id="entryForm">
        <textarea id="content" rows="4" cols="50" placeholder="What are you grateful for?"></textarea>
        <br>
        <input type="text" id="tags" placeholder="Tags (comma separated)">
        <br>
        <button type="submit">Add Entry</button>
      </form>

      <h2>Your Entries</h2>
      <div id="entries"></div>

      <script>
        const apiUrl = '/api/entries';

        async function fetchEntries() {
          try {
            const response = await fetch(apiUrl);
            const entries = await response.json();
            console.log('Fetched entries:', entries);
            const entriesDiv = document.getElementById('entries');
            entriesDiv.innerHTML = '';
            entries.forEach(entry => {
              const entryDiv = document.createElement('div');
              entryDiv.className = 'entry';
              entryDiv.innerHTML = \`
                <h3>\${new Date(entry.created_at).toLocaleString()}</h3>
                <p>\${entry.content}</p>
                <p><strong>Tags:</strong> \${entry.tags || ''}</p>
                <p><strong>Categories:</strong> \${entry.category1 || ''}\${entry.category2 ? ', ' + entry.category2 : ''}</p>
              \`;
              entriesDiv.appendChild(entryDiv);
            });
          } catch (err) {
            console.error('Error fetching entries:', err);
          }
        }

        document.getElementById('entryForm').addEventListener('submit', async (e) => {
          e.preventDefault();
          const content = document.getElementById('content').value;
          const tags = document.getElementById('tags').value;

          try {
            const response = await fetch(apiUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ content, tags })
            });
            if (response.ok) {
              document.getElementById('content').value = '';
              document.getElementById('tags').value = '';
              fetchEntries();
            } else {
              console.error('Error adding entry');
            }
          } catch (err) {
            console.error('Error:', err);
          }
        });

        fetchEntries();
      </script>
    </body>
    </html>
  `;
  res.send(htmlContent);
});

// ------------------
// Start the Server after DB Initialization
// ------------------
initDb().then(() => {
  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
});
