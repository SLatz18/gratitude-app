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

  const words = Object.keys(freq)
    .filter(word => freq[word] > 1)
    .map(word => ({ text: word, size: 10 + freq[word] * 10 }));

  d3.select('#wordCloud').html('');

  const layout = d3.layout.cloud()
    .size([500, 300])
    .words(words)
    .padding(5)
    .rotate(() => ~~(Math.random() * 2) * 90)
    .font('Montserrat')
    .fontSize(d => d.size)
    .on('end', draw);

  layout.start();

  function draw(words) {
    d3.select('#wordCloud')
      .append('svg')
      .attr('width', layout.size()[0])
      .attr('height', layout.size()[1])
      .append('g')
      .attr('transform', 'translate(' + layout.size()[0] / 2 + ',' + layout.size()[1] / 2 + ')')
      .selectAll('text')
      .data(words)
      .enter().append('text')
      .style('font-family', 'Montserrat')
      .style('font-size', d => d.size + 'px')
      .style('fill', '#333')
      .attr('text-anchor', 'middle')
      .attr('transform', d => 'translate(' + [d.x, d.y] + ')rotate(' + d.rotate + ')')
      .text(d => d.text);
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
