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

// Update the word cloud using all entries (excluding "Uncategorized")
// Ensures that at least 10 words are shown if available.
async function updateWordCloud() {
  const entries = await fetchAllEntries();
  
  // Count frequency of each category, skipping "Uncategorized"
  const freq = {};
  entries.forEach(entry => {
    const category = entry.category;
    if (category && category.toLowerCase() !== 'uncategorized') {
      freq[category] = (freq[category] || 0) + 1;
    }
  });

  // Convert frequency object into array of [category, count] pairs
  let categories = Object.entries(freq).filter(([cat, count]) => count >= 2);
  
  // If fewer than 10 categories with frequency >= 2 and additional exist, include those with frequency 1.
  if (categories.length < 10) {
    const additional = Object.entries(freq).filter(([cat, count]) => count < 2);
    categories = categories.concat(additional);
  }
  
  // Sort descending by frequency
  categories.sort((a, b) => b[1] - a[1]);
  
  // Limit to top 10 categories if more than 10 are available
  if (categories.length > 10) {
    categories = categories.slice(0, 10);
  }
  
  // Map to words array with font size scaled by frequency
  const words = categories.map(([cat, count]) => ({
    text: cat,
    size: 10 + count * 10
  }));

  // Clear the word cloud container
  d3.select('#wordCloud').html('');

  // Create the layout for the word cloud
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
