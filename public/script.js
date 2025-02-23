// Fetch current session entries
async function fetchEntries() {
  try {
    const response = await fetch('/api/public-entries');
    const entries = await response.json();
    const entriesDiv = document.getElementById('entries');
    entriesDiv.innerHTML = '';
    entries.forEach(entry => {
      const entryDiv = document.createElement('div');
      entryDiv.className = 'entry';
      entryDiv.innerHTML = `
        <p class="entry-date">${new Date(entry.created_at).toLocaleString()}</p>
        <p class="entry-category">${entry.category || 'Uncategorized'}</p>
        <p>${entry.content}</p>
      `;
      entriesDiv.appendChild(entryDiv);
    });
  } catch (err) {
    console.error('Error fetching entries:', err);
  }
}

// Fetch all entries (for word cloud)
async function fetchAllEntries() {
  try {
    const response = await fetch('/api/all-entries');
    const entries = await response.json();
    return entries;
  } catch (err) {
    console.error('Error fetching all entries:', err);
    return [];
  }
}

// Update the word cloud using all entries (excluding uncategorized)
async function updateWordCloud() {
  const entries = await fetchAllEntries();
  // Count frequency of each category, skipping entries with no category or "Uncategorized"
  const freq = {};
  entries.forEach(entry => {
    const category = entry.category;
    if (category && category.toLowerCase() !== 'uncategorized') {
      freq[category] = (freq[category] || 0) + 1;
    }
  });
  
  const counts = Object.values(freq);
  const minCount = Math.min(...counts);
  const maxCount = Math.max(...counts);
  const minSize = 14; // in pixels
  const maxSize = 32; // in pixels
  
  const wordCloudDiv = document.getElementById('wordCloud');
  wordCloudDiv.innerHTML = '';
  
  for (const [cat, count] of Object.entries(freq)) {
    const size = maxCount === minCount
      ? (minSize + maxSize) / 2
      : minSize + ((count - minCount) / (maxCount - minCount)) * (maxSize - minSize);
    const span = document.createElement('span');
    span.textContent = cat + " ";
    span.style.fontSize = size + "px";
    span.style.marginRight = "10px";
    wordCloudDiv.appendChild(span);
  }
}

document.getElementById('entryForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const content = document.getElementById('content').value;
  try {
    const response = await fetch('/api/entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content })
    });
    if (response.ok) {
      document.getElementById('content').value = '';
      fetchEntries();
      updateWordCloud();
    } else {
      console.error('Error adding entry');
    }
  } catch (err) {
    console.error('Error:', err);
  }
});

fetchEntries();
updateWordCloud();
