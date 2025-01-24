javascript:(function() {
    // Create and inject CSS styles dynamically
    const style = document.createElement('style');
    style.textContent = `
        /* Smooth breathing background effect */
        @keyframes breatheBackground {
            0%, 100% { background-color: black; }
            20% { background-color: #333; }
            40% { background-color: white; }
            60% { background-color: #ddd; }
            80% { background-color: #333; }
        }

        /* Fade text color between black and white */
        @keyframes fadeText {
            0%, 100% { color: white; opacity: 1; }
            50% { color: black; opacity: 1; }
        }

        body {
            animation: breatheBackground 6s ease-in-out infinite;
        }

        .bookmarklet-dynamic-text {
            font-size: 5vw;
            font-weight: bold;
            mix-blend-mode: difference;
            animation: fadeText 5s ease-in-out infinite;
            text-shadow: 0 0 2px rgba(255, 255, 255, 0.5);
        }
    `;
    document.head.appendChild(style);

    // Apply a unique class to existing text for the effect
    document.querySelectorAll('h1, h2, h3, p, span').forEach(element => {
        element.classList.add('bookmarklet-dynamic-text');
    });
})();
