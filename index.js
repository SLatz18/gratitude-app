require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();
app.use(express.json());
app.use(cors());

// Connect to PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Ensure table exists
pool.query(
  `CREATE TABLE IF NOT EXISTS journal_entries (
    id SERIAL PRIMARY KEY,
    entry TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );`
);

// Route to add an entry
app.post("/add_entry", async (req, res) => {
  const { entry } = req.body;
  try {
    await pool.query("INSERT INTO journal_entries (entry) VALUES ($1)", [entry]);
    res.json({ message: "Entry added successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Route to get all entries
app.get("/get_entries", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM journal_entries ORDER BY created_at DESC");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
