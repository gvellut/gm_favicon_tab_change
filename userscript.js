// ==UserScript==
// @name         Google Docs Custom Favicon by ID
// @version      0.3
// @description  Changes Google Docs favicon based on the document ID.
// @author       Guilhem Vellut
// @match        https://docs.google.com/document/d/*
// @grant        GM.xmlHttpRequest
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

        console.log(`Custom Favicon: Attempting to check for favicon for doc ID ${docId} at ${newFaviconUrl}`);

        // Function to find and update or create the favicon link
        // This function is called ONLY if newFaviconUrl is confirmed to exist.
        function setCustomFavicon(faviconUrl) {
            // Remove any existing favicons to avoid conflicts or multiple icons
            // Google might have multiple link tags for icons (e.g., different sizes, apple-touch-icon)
            const existingFavicons = document.querySelectorAll("link[rel*='icon']");
            existingFavicons.forEach(link => {
                if (link.rel.includes('icon') || link.rel.includes('shortcut icon')) {
                    console.log(`Custom Favicon: Removing existing favicon: ${link.href}`);
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
            const shortcutLink = document.createElement('link');
            shortcutLink.rel = 'shortcut icon';
            shortcutLink.type = 'image/png';
            shortcutLink.href = faviconUrl;
            document.getElementsByTagName('head')[0].appendChild(shortcutLink);

            console.log("Custom Favicon: New favicon link(s) added/updated to:", faviconUrl);
        }

        // Check if the custom favicon exists before attempting to set it
        GM.xmlHttpRequest({
            method: "HEAD", // Use HEAD to check for existence without downloading the file
            url: newFaviconUrl,
            onload: function (response) {
                if (response.status === 200) {
                    console.log(`Custom Favicon: Found at ${newFaviconUrl}. Applying.`);
                    // The custom favicon exists, so proceed to set it
                    setCustomFavicon(newFaviconUrl);

                    // --- Optional: For SPAs like Google Docs that might change title/favicon dynamically ---
                    // This is a more robust way if Google's scripts interfere
                    // It re-applies the favicon if the <title> changes (often happens with favicon changes too)
                    // or if the head's children are modified in a way that might affect the favicon.
                    const observer = new MutationObserver((mutationsList, observerInstance) => {
                        for (let mutation of mutationsList) {
                            if (mutation.type === 'childList' || (mutation.target && mutation.target.nodeName === 'TITLE')) {
                                // Check if our favicon is still there and correct
                                let currentFaviconLink = document.querySelector('link[rel="icon"]');
                                if (!currentFaviconLink || currentFaviconLink.href !== newFaviconUrl) {
                                    console.log("Custom Favicon: Detected potential overwrite or missing custom favicon. Re-applying.");
                                    setCustomFavicon(newFaviconUrl); // Re-apply
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
                    console.log(`Custom Favicon: Not found at ${newFaviconUrl} (Status: ${response.status}). Original favicon will be kept.`);
                    // Do not remove original favicon or set the custom one if it doesn't exist.
                }
            },
            onerror: function (response) {
                console.error(`Custom Favicon: Error checking URL ${newFaviconUrl}. Original favicon will be kept. Details:`, response);
                // Do not remove original favicon or set the custom one on error.
            }
        });

    } else {
        console.log("Custom Favicon: Could not extract document ID from URL:", currentUrl);
    }
})();