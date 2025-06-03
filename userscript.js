// ==UserScript==
// @name         Google Docs Custom Favicon by ID
// @namespace    http://tampermonkey.net/
// @version      0.2
// @description  Changes Google Docs favicon based on the document ID.
// @author       Guilhem Vellut
// @match        https://docs.google.com/document/d/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

const CUSTOM_FAVICON_BASE_URL = "https://fmushosting.vellut.com/docicons";

(function () {
    'use strict';

    const currentUrl = window.location.href;
    // Regex to extract the document ID from URLs like:
    // https://docs.google.com/document/d/1a4ni7I0XKe5iSa3gv-UWEM9XDLF-eozvJVvZHspdaPE/edit?tab=t.0
    // It captures the ID part: 1a4ni7I0XKe5iSa3gv-UWEM9XDLF-eozvJVvZHspdaPE
    const idRegex = /\/document\/d\/([a-zA-Z0-9_-]+)\//;
    const match = currentUrl.match(idRegex);

    if (match && match[1]) {
        const docId = match[1];
        const newFaviconUrl = `${CUSTOM_FAVICON_BASE_URL}/${docId}.png`;

        console.log(`Custom Favicon: Attempting to set favicon for doc ID ${docId} to ${newFaviconUrl}`);

        // Function to find and update or create the favicon link
        function setCustomFavicon(faviconUrl) {
            // Remove any existing favicons to avoid conflicts or multiple icons
            // Google might have multiple link tags for icons (e.g., different sizes, apple-touch-icon)
            const existingFavicons = document.querySelectorAll("link[rel*='icon']");
            existingFavicons.forEach(link => {
                // Be a bit selective: only remove common favicon 'rel' types
                if (link.rel.includes('icon') || link.rel.includes('shortcut icon')) {
                    link.remove();
                }
            });

            // Create and add the new favicon link
            const link = document.createElement('link');
            link.rel = 'icon';
            link.type = 'image/png'; // Specify PNG as you prefer
            link.href = faviconUrl;
            document.getElementsByTagName('head')[0].appendChild(link);

            // Some browsers or older systems might still look for "shortcut icon"
            // It's often good practice to add this as well, pointing to the same resource.
            const shortcutLink = document.createElement('link');
            shortcutLink.rel = 'shortcut icon';
            shortcutLink.type = 'image/png';
            shortcutLink.href = faviconUrl;
            document.getElementsByTagName('head')[0].appendChild(shortcutLink);

            console.log("Custom Favicon: New favicon link(s) added/updated.");
        }

        // Call the function to set the new favicon
        setCustomFavicon(newFaviconUrl);

        // --- Optional: For SPAs like Google Docs that might change title/favicon dynamically ---
        // This is a more robust way if Google's scripts interfere
        // It re-applies the favicon if the <title> changes (often happens with favicon changes too)
        // or if the head's children are modified in a way that might affect the favicon.
        const observer = new MutationObserver((mutationsList, observerInstance) => {
            for (let mutation of mutationsList) {
                if (mutation.type === 'childList' || mutation.target.nodeName === 'TITLE') {
                    // Check if our favicon is still there and correct
                    let currentFaviconLink = document.querySelector('link[rel="icon"]');
                    if (!currentFaviconLink || currentFaviconLink.href !== newFaviconUrl) {
                        console.log("Custom Favicon: Detected potential overwrite. Re-applying favicon.");
                        setCustomFavicon(newFaviconUrl); // Re-apply
                        // No need to break, setCustomFavicon handles cleanup and addition
                    }
                    // No need to check all mutations if we've already re-applied
                    // but also no harm in letting it run if other mutations occurred
                }
            }
        });

        observer.observe(document.head, { childList: true, subtree: true });
        // Also observe title changes
        const titleElement = document.querySelector('title');
        if (titleElement) {
            observer.observe(titleElement, { childList: true });
        }
        // --- End Optional SPA Handling ---

    } else {
        console.log("Custom Favicon: Could not extract document ID from URL:", currentUrl);
    }
})();