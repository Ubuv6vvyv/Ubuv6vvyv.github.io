javascript:(function() {
    const styles = `
        #url-converter-toolbar {
            position: fixed;
            top: 10px;
            right: 10px;
            background: #f0f0f0;
            border: 1px solid #ccc;
            padding: 10px;
            z-index: 10000;
            font-size: 10px;
        }
        #url-converter-toolbar button {
            margin: 2px;
            padding: 5px 10px;
            font-size: 10px;
        }
        #image-gallery {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
            gap: 10px;
            padding: 10px;
            background: #fff;
            border-bottom: 1px solid #ccc;
        }
        #image-gallery .gallery-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
        }
        #image-gallery img {
            width: 100%;
            height: 120px;
            object-fit: cover;
        }
        #image-gallery a {
            margin-top: 5px;
            font-size: 10px;
            word-break: break-all;
            max-width: 100%;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        @media (max-width: 600px) {
            #image-gallery {
                grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
            }
            #image-gallery img {
                height: 80px;
            }
            #image-gallery a {
                font-size: 8px;
            }
        }
    `;

    const styleElement = document.createElement('style');
    styleElement.textContent = styles;
    document.head.appendChild(styleElement);

    const toolbar = document.createElement('div');
    toolbar.id = 'url-converter-toolbar';
    toolbar.innerHTML = `
        <button onclick="convertUrls('all')">Convert All</button>
        <button onclick="convertUrls('images')">Convert Images</button>
        <button onclick="convertUrls('videos')">Convert Videos</button>
        <button onclick="convertUrls('links')">Convert Links</button>
        <button onclick="createGallery()">Gallery Mode Thumbnails and Links</button>
        <button onclick="resetConversion()">Reset</button>
    `;
    document.body.appendChild(toolbar);

    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const imgExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    const videoExtensions = ['mp4', 'webm', 'ogg'];

    function isImageUrl(url) {
        return imgExtensions.includes(url.split('.').pop().toLowerCase());
    }

    function isVideoUrl(url) {
        return videoExtensions.includes(url.split('.').pop().toLowerCase());
    }

    function convertToTag(url, type) {
        if (type === 'images' && isImageUrl(url)) {
            return `<img src="${url}" alt="Image" style="max-width: 200px; max-height: 200px;" data-converted="true">`;
        } else if (type === 'videos' && isVideoUrl(url)) {
            return `<video src="${url}" controls style="max-width: 300px;" data-converted="true"></video>`;
        } else if (type === 'links' || (type === 'all' && !isImageUrl(url) && !isVideoUrl(url))) {
            return `<a href="${url}" target="_blank" data-converted="true">${url}</a>`;
        }
        return url;
    }

    window.convertUrls = function(type) {
        const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );

        const nodesToReplace = [];
        while (walker.nextNode()) {
            const node = walker.currentNode;
            if (node.parentNode.nodeName !== 'SCRIPT' && 
                node.parentNode.nodeName !== 'STYLE' &&
                !node.parentNode.hasAttribute('data-converted')) {
                const matches = node.nodeValue.match(urlRegex);
                if (matches) {
                    nodesToReplace.push(node);
                }
            }
        }

        nodesToReplace.forEach(node => {
            const fragment = document.createDocumentFragment();
            let lastIndex = 0;
            node.nodeValue.replace(urlRegex, (match, url, offset) => {
                fragment.appendChild(document.createTextNode(node.nodeValue.slice(lastIndex, offset)));
                const converted = convertToTag(url, type);
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = converted;
                Array.from(tempDiv.childNodes).forEach(child => fragment.appendChild(child));
                lastIndex = offset + match.length;
            });
            fragment.appendChild(document.createTextNode(node.nodeValue.slice(lastIndex)));
            node.parentNode.replaceChild(fragment, node);
        });
    };

    window.createGallery = function() {
        if (document.getElementById('image-gallery')) {
            console.log('Gallery already exists');
            return;
        }

        const gallery = document.createElement('div');
        gallery.id = 'image-gallery';

        const images = Array.from(document.images).filter(img => !img.closest('#image-gallery'));
        images.forEach(img => {
            const item = document.createElement('div');
            item.className = 'gallery-item';
            
            const thumbnail = document.createElement('img');
            thumbnail.src = img.src;
            thumbnail.alt = img.alt || 'Image';
            
            const link = document.createElement('a');
            link.href = img.src;
            link.textContent = img.src.split('/').pop();
            link.title = img.src;
            link.target = '_blank';
            link.setAttribute('data-converted', 'true');

            item.appendChild(thumbnail);
            item.appendChild(link);
            gallery.appendChild(item);
        });

        if (images.length > 0) {
            document.body.insertBefore(gallery, document.body.firstChild);
        } else {
            console.log('No images found on the page');
        }
    };

    window.resetConversion = function() {
        location.reload();
    };

    console.log('URL Converter Toolbar added. Use the buttons to convert URLs or create an image gallery.');
})();
//text to link urls and anchors gallery
//javascript:(function(){window.s0=document.createElement('script');window.s0.setAttribute('type','text/javascript');window.s0.setAttribute('src','https://bookmarkify.it/bookmarklets/67088/raw');document.getElementsByTagName('body')[0].appendChild(window.s0);})();
