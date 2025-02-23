// Update the word cloud using all entries (excluding "Uncategorized" unless needed to fill to 10 words)
async function updateWordCloud() {
  const entries = await fetchAllEntries();
  // Count frequency of each category
  const freq = {};
  entries.forEach(entry => {
    const category = entry.category;
    if (category && category.toLowerCase() !== 'uncategorized') {
      freq[category] = (freq[category] || 0) + 1;
    }
  });

  // First, take only categories that appear at least twice
  let categories = Object.keys(freq).filter(word => freq[word] > 1);
  
  // If fewer than 10 categories meet that criterion and there are more categories available,
  // include those with a frequency of 1 to fill out the word cloud.
  if (categories.length < 10) {
    // Use all available categories (which may include some that appear once)
    categories = Object.keys(freq);
  }
  
  // Map each category to a word object with a size based on its frequency.
  const words = categories.map(word => ({
    text: word,
    size: 10 + freq[word] * 10
  }));

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
