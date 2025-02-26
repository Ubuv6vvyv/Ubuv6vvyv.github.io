javascript:(function(){
    // Remove any existing modal to avoid duplicates
    const existingModal = document.getElementById("imageGrabModal");
    if(existingModal){ existingModal.remove(); }

    // Create modal container
    const modal = document.createElement("div");
    modal.id = "imageGrabModal";
    modal.style.position = "fixed";
    modal.style.top = "20px";
    modal.style.right = "20px";
    modal.style.width = "320px";
    modal.style.maxHeight = "80vh";
    modal.style.backgroundColor = "rgba(255,255,255,0.95)";
    modal.style.border = "1px solid #ccc";
    modal.style.padding = "10px";
    modal.style.overflowY = "auto";
    modal.style.boxShadow = "0 0 10px rgba(0,0,0,0.5)";
    modal.style.zIndex = "9999";

    // Create header container with control buttons
    const header = document.createElement("div");
    header.style.display = "flex";
    header.style.justifyContent = "space-between";
    header.style.marginBottom = "10px";

    // Download All button: opens each non‑data image in a new tab
    const downloadAllBtn = document.createElement("button");
    downloadAllBtn.textContent = "Download All";
    downloadAllBtn.style.fontSize = "12px";
    downloadAllBtn.addEventListener("click", function(){
        const anchors = grid.querySelectorAll("a.thumbnail-link");
        anchors.forEach(a => {
            window.open(a.href, "_blank");
        });
    });

    // Rescan button: clears grid and rescans for images (excluding modal content)
    const rescanBtn = document.createElement("button");
    rescanBtn.textContent = "Rescan";
    rescanBtn.style.fontSize = "12px";
    rescanBtn.addEventListener("click", function(){
        grid.innerHTML = "";
        scanImages();
    });

    // Close button: removes the modal
    const closeBtn = document.createElement("button");
    closeBtn.textContent = "Close";
    closeBtn.style.fontSize = "12px";
    closeBtn.addEventListener("click", function(){
        modal.remove();
    });

    header.appendChild(downloadAllBtn);
    header.appendChild(rescanBtn);
    header.appendChild(closeBtn);
    modal.appendChild(header);

    // Create grid container for thumbnails
    const grid = document.createElement("div");
    grid.style.display = "grid";
    grid.style.gridTemplateColumns = "repeat(auto-fill, minmax(100px, 1fr))";
    grid.style.gap = "10px";
    modal.appendChild(grid);

    // Append modal to body
    document.body.appendChild(modal);

    // Utility: Check if URL is a data image
    const isDataImage = src => src.startsWith("data:");

    // IntersectionObserver for lazy loading thumbnails within grid
    const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if(entry.isIntersecting){
                const imgEl = entry.target;
                imgEl.src = imgEl.dataset.src;
                obs.unobserve(imgEl);
            }
        });
    }, { root: grid, rootMargin: "0px 0px 50px 0px" });

    // Function to scan for images (excluding those within the modal)
    function scanImages(){
        const imgs = Array.from(document.querySelectorAll("img")).filter(img => !modal.contains(img));
        imgs.forEach(img => {
            const container = document.createElement("div");
            container.style.textAlign = "center";
            container.style.fontSize = "10px";
            container.style.wordBreak = "break-all";
            
            if(isDataImage(img.src)){
                // For data images, display a label
                const label = document.createElement("div");
                label.textContent = "Data Image";
                label.style.fontStyle = "italic";
                label.style.backgroundColor = "#f0f0f0";
                label.style.padding = "5px";
                label.style.border = "1px solid #ccc";
                container.appendChild(label);
            } else {
                // Create anchor wrapping the thumbnail to open image in new tab
                const link = document.createElement("a");
                link.href = img.src;
                link.target = "_blank";
                link.rel = "noopener noreferrer";
                link.className = "thumbnail-link";
                
                // Create thumbnail image with lazy loading
                const thumb = document.createElement("img");
                thumb.dataset.src = img.src;
                thumb.alt = "Thumbnail";
                thumb.style.width = "100%";
                thumb.style.height = "auto";
                thumb.style.cursor = "pointer";
                thumb.style.transition = "transform 0.2s ease-in-out";
                // Optional: add a scale toggle on click (commented out to let anchor work normally)
                // thumb.addEventListener("click", function(e){
                //     thumb.style.transform = (thumb.style.transform === "scale(1.5)") ? "scale(1)" : "scale(1.5)";
                // });
                observer.observe(thumb);
                
                link.appendChild(thumb);
                container.appendChild(link);
            }
            // Caption for image URL (shortened if too long)
            const caption = document.createElement("div");
            caption.textContent = isDataImage(img.src) ? "Data Image (not displayed)" : (img.src.length > 60 ? img.src.slice(0,57) + "..." : img.src);
            container.appendChild(caption);
            
            grid.appendChild(container);
        });
    }
    
    // Initial image scan
    scanImages();
})();
