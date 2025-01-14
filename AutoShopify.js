(function() {
    const domain = window.location.hostname;
    const apiVersion = '2022-04';
    const productFields = ['id', 'title', 'body_html', 'variants', 'images'];
    
    // Function to fetch collections
    async function fetchCollections() {
        try {
            const response = await fetch(`https://${domain}/collections.json`);
            if (!response.ok) throw new Error('Failed to fetch collections');
            const data = await response.json();
            return data.collections;
        } catch (error) {
            console.error('Error fetching collections:', error);
        }
    }

    // Function to fetch products for a specific collection, handling pagination
    async function fetchProducts(collectionHandle) {
        let products = [];
        let page = 1;
        let hasNextPage = true;

        while (hasNextPage) {
            const productsEndpoint = `https://${domain}/collections/${collectionHandle}/products.json?limit=250&page=${page}&api_version=${apiVersion}`;
            try {
                const response = await fetch(productsEndpoint);
                if (!response.ok) throw new Error('Failed to fetch products');
                const data = await response.json();
                
                // Add the products from the current page
                products = products.concat(data.products);
                
                // Check if there is another page
                hasNextPage = data.products.length === 250; // Shopify API returns 250 items per page by default
                page++; // Increment the page number
            } catch (error) {
                console.error('Error fetching products:', error);
                hasNextPage = false;
            }
        }

        return products;
    }

    // Function to handle product data extraction and formatting into CSV
    function formatCSV(products) {
        const csvRows = [];
        const headers = ['ID', 'Title', 'Description', 'Price', 'Image URL', 'Variant'];
        csvRows.push(headers.join(','));

        products.forEach(product => {
            product.variants.forEach(variant => {
                const row = [
                    product.id,
                    product.title,
                    product.body_html.replace(/[\n\r]+/g, ' ').replace(/,/g, ' '), // Clean up description
                    variant.price,
                    product.images.length > 0 ? product.images[0].src : '',
                    variant.title
                ];
                csvRows.push(row.join(','));
            });
        });

        return csvRows.join('\n');
    }

    // Function to trigger file download
    function downloadCSV(csvContent) {
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'shopify_products.csv';
        link.click();
        URL.revokeObjectURL(url);
    }

    // Main function to coordinate the script
    async function main() {
        const collections = await fetchCollections();
        if (!collections || collections.length === 0) return alert('No collections found.');

        console.log('Collections:', collections);
        const collectionList = collections.map((collection, index) => `${index + 1}. ${collection.title}`).join('\n');
        const selectedCollectionIndex = prompt(`Select a collection by index:\n${collectionList}`);

        const collection = collections[parseInt(selectedCollectionIndex) - 1];
        if (!collection) return alert('Invalid selection.');

        const products = await fetchProducts(collection.handle);
        if (!products || products.length === 0) return alert('No products found in the selected collection.');

        console.log('Products:', products);

        const csvContent = formatCSV(products);
        downloadCSV(csvContent);
    }

    main();
})();
