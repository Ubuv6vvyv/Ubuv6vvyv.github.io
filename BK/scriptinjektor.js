javascript:(function(){
    // Remove existing modal if present
    let existingModal = document.getElementById("injector-modal");
    if (existingModal) existingModal.remove();

    // Create modal
    let modal = document.createElement("div");
    modal.id = "injector-modal";
    modal.innerHTML = `
        <div style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);
        width:400px;padding:15px;background:white;box-shadow:0 0 10px rgba(0,0,0,0.3);
        z-index:10000;border-radius:5px;font-family:sans-serif;">
            <h3 style="margin:0;font-size:16px;">Inject HTML & JavaScript</h3>
            <textarea id="injector-input" placeholder="Enter HTML & JS here..." 
            style="width:100%;height:100px;margin-top:10px;"></textarea>
            <div style="margin-top:10px;text-align:right;">
                <button id="injector-run" style="display:block;margin-top:10px;padding:5px 10px;background:#4CAF50;color:white;border:none;cursor:pointer;">Inject</button>
                <button id="injector-close" style="display:block;margin-top:10px;margin-left:5px;padding:5px 10px;background:#f44336;color:white;border:none;cursor:pointer;">Close</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Ensure event listeners are set after elements are rendered
    setTimeout(() => {
        document.getElementById("injector-run").onclick = function(){
            let code = document.getElementById("injector-input").value;
            
            // Extract JavaScript (inside <script> tags)
            let jsMatch = code.match(/<script[^>]*>([\s\S]*?)<\/script>/im);
            let jsCode = jsMatch ? jsMatch[1] : "";

            // Extract HTML (everything except <script> tags)
            let htmlContent = code.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");

            // Inject HTML
            let div = document.createElement("div");
            div.innerHTML = htmlContent;
            document.body.appendChild(div);

            // Inject JavaScript
            if (jsCode) {
                let script = document.createElement("script");
                script.textContent = jsCode;
                document.body.appendChild(script);
            }

            modal.remove();
        };

        document.getElementById("injector-close").onclick = function(){
            modal.remove();
        };
    }, 100);
})();
