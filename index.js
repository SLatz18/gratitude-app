require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser'); // Optional, as Express 4.16+ includes JSON parsing
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(cors());

// Initialize PostgreSQL connection using Render's environment variable
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Function to initialize the database (create table if it doesn't exist)
// Note: The "tags" column has been removed.
async function initDb() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS entries (
        id SERIAL PRIMARY KEY,
        content TEXT NOT NULL,
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

// POST to create a new entry (only content)
app.post('/api/entries', async (req, res) => {
  try {
    const { content } = req.body;
    const result = await pool.query(
      'INSERT INTO entries (content, created_at, updated_at) VALUES ($1, NOW(), NOW()) RETURNING *',
      [content]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
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
      <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600&display=swap" rel="stylesheet">
      <style>
        body {
          font-family: 'Montserrat', sans-serif;
          background-color: #f0f4f8;
          color: #333;
          margin: 0;
          padding: 20px;
        }
        h1, h2 {
          color: #486581;
        }
        form {
          background: #fff;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          margin-bottom: 20px;
        }
        textarea {
          width: 100%;
          padding: 10px;
          margin: 10px 0;
          border: 1px solid #ccc;
          border-radius: 4px;
          font-size: 16px;
        }
        button {
          background-color: #486581;
          color: #fff;
          border: none;
          padding: 10px 20px;
          font-size: 16px;
          border-radius: 4px;
          cursor: pointer;
        }
        button:hover {
          background-color: #3a536b;
        }
        .entry {
          background: #fff;
          padding: 15px;
          margin-bottom: 15px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        .entry-date {
          font-size: 0.85em;
          color: #888;
          margin-bottom: 5px;
        }
      </style>
    </head>
    <body>
      <h1>Gratitude Journal</h1>

      <form id="entryForm">
        <textarea id="content" rows="4" cols="50" placeholder="What are you grateful for?"></textarea>
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
            const entriesDiv = document.getElementById('entries');
            entriesDiv.innerHTML = '';
            entries.forEach(entry => {
              const entryDiv = document.createElement('div');
              entryDiv.className = 'entry';
              entryDiv.innerHTML = \`
                <p class="entry-date">\${new Date(entry.created_at).toLocaleString()}</p>
                <p>\${entry.content}</p>
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

          try {
            const response = await fetch(apiUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ content })
            });
            if (response.ok) {
              document.getElementById('content').value = '';
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
