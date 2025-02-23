const apiUrl = '/api/public-entries';

async function fetchEntries() {
  try {
    const response = await fetch(apiUrl);
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
    } else {
      console.error('Error adding entry');
    }
  } catch (err) {
    console.error('Error:', err);
  }
});

fetchEntries();
