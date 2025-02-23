// POST to create a new entry (with content)
// Modified to call OpenAI for categorization before inserting into the database.
app.post('/api/entries', async (req, res) => {
  try {
    const { content } = req.body;
    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }
    
    // Build a prompt for categorization. Adjust categories as needed.
    const prompt = `Categorize the following gratitude entry into one of these categories: Family, Friends, Work, Health, Personal Growth, or Other.
    
Entry: "${content}"`;

    // Call OpenAI API to get the category.
    const aiResponse = await openai.completions.create({
      model: 'text-davinci-003',
      prompt,
      max_tokens: 10,
      temperature: 0, // low temperature for deterministic output
    });
    const category = aiResponse.data.choices[0].text.trim();
    console.log(`Categorized entry as: ${category}`);

    // Insert the new entry along with its category into the database.
    const result = await pool.query(
      'INSERT INTO entries (content, category, created_at, updated_at) VALUES ($1, $2, NOW(), NOW()) RETURNING *',
      [content, category]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating entry:', err);
    res.status(500).json({ error: 'Failed to categorize and create entry' });
  }
});
