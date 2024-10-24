// Function to extract images and nearby text
function extractImagesAndText() {
  const results = [];

  // Helper to ensure URL is absolute
  function makeAbsoluteUrl(url) {
    const a = document.createElement('a');
    a.href = url;
    return a.href; // This will resolve relative URLs to an absolute URL
  }

  // Function to extract image URL from element
  function extractImageUrl(element) {
    let imageUrl = null;

    if (element.tagName === 'IMG') {
      imageUrl = element.getAttribute('data-src') ||
                 element.getAttribute('lazy-src') ||
                 element.getAttribute('srcset')?.split(',')[0]?.trim()?.split(' ')[0] || 
                 element.src;
    } else {
      const style = element.getAttribute('style');
      if (style && style.includes('background-image')) {
        const match = style.match(/background-image:\s*url\(([^)]+)\)/);
        imageUrl = match ? match[1].replace(/['"]/g, '') : null;
      } else {
        const lazyAttrs = ['data-src', 'lazy-src', 'srcset'];
        for (const attr of lazyAttrs) {
          const url = element.getAttribute(attr);
          if (url) {
            imageUrl = url.split(',')[0].trim().split(' ')[0]; // handle srcset-like values
            break;
          }
        }
      }
    }

    if (imageUrl) {
      // Convert to an absolute URL if it's relative
      return makeAbsoluteUrl(imageUrl);
    }

    return null;
  }

  // Function to extract nearby title and price from specific elements
  function extractTitleAndPrice(element) {
    const parent = element.closest('.product-item');
    if (!parent) return { title: '', price: '' };

    const titleElement = parent.querySelector('.product-item__title');
    const title = titleElement ? titleElement.textContent.trim() : '';

    const priceElement = parent.querySelector('.price');
    const price = priceElement ? priceElement.textContent.trim() : 'N/A';

    return { title, price };
  }

  // Select all elements with images
  const elements = document.querySelectorAll('img, [style*="background-image"]');

  elements.forEach(element => {
    const imageUrl = extractImageUrl(element);
    console.log('Extracted Image URL:', imageUrl); // Debugging: log image URL to ensure correctness

    if (imageUrl) {
      const { title, price } = extractTitleAndPrice(element);

      results.push({
        image: imageUrl,
        description: title,
        price: price,
      });
    }
  });

  console.log('Final Results:', results); // Debugging: check the results

  // Create a new window to display results
  const resultsWindow = window.open('', 'results', 'width=1200,height=800');

  // Create a table grid to display results
  const resultsGrid = `
    <table style="width:100%;border-collapse:collapse;">
      <tr>
        <th style="border:1px solid #ddd;padding:8px;">Image</th>
        <th style="border:1px solid #ddd;padding:8px;">Description</th>
        <th style="border:1px solid #ddd;padding:8px;">Price</th>
      </tr>
      ${results.map(result => `
        <tr>
          <td style="border:1px solid #ddd;padding:8px;">
            <img src="${result.image}" alt="Image" style="max-width:200px;">
          </td>
          <td style="border:1px solid #ddd;padding:8px;">${result.description || 'No description available'}</td>
          <td style="border:1px solid #ddd;padding:8px;">${result.price || 'N/A'}</td>
        </tr>
      `).join('')}
    </table>
  `;

  // Write the results grid to the new window
  resultsWindow.document.body.innerHTML = resultsGrid;
}

// Call the function to start extracting images and text
extractImagesAndText();
