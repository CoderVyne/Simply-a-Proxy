"use strict";

async function registerSW() {
    if (!navigator.serviceWorker) {
        throw new Error("Your browser doesn't support service workers.");
    }
    await navigator.serviceWorker.register("./sw.js");
}

function search(input, template) {
    try {
        return new URL(input).toString();
    } catch (err) {}

    try {
        const url = new URL(`http://${input}`);
        if (url.hostname.includes(".")) return url.toString();
    } catch (err) {}

    return template.replace("%s", encodeURIComponent(input));
}

const { ScramjetController } = $scramjetLoadController();

const scramjet = new ScramjetController({
    files: {
        wasm: "/scram/scramjet.wasm.wasm",
        all: "/scram/scramjet.all.js",
        sync: "/scram/scramjet.sync.js",
    },
});

console.log("Initializing Scramjet...");
scramjet.init();

console.log("Connecting to BareMux...");
const connection = new BareMux.BareMuxConnection("/baremux/worker.js");
const form = document.getElementById("proxy-form");
const input = document.getElementById("url-input");
const topInput = document.getElementById("top-url-input");
const error = document.getElementById("error-msg");
const homeBtn = document.getElementById("home-btn");
const bookmarkBtn = document.getElementById("bookmark-btn");
const settingsToggle = document.getElementById("settings-toggle");
const historyToggle = document.getElementById("history-toggle");
const bookmarksToggle = document.getElementById("bookmarks-toggle");
const navToggle = document.getElementById("nav-toggle");
const topNav = document.querySelector(".top-nav");
const settingsOverlay = document.getElementById("settings-overlay");
const historyOverlay = document.getElementById("history-overlay");
const bookmarksOverlay = document.getElementById("bookmarks-overlay");
const closeButtons = document.querySelectorAll(".close-btn");
const engineOptions = document.querySelectorAll(".engine-option");

let currentSearchEngine = localStorage.getItem("searchEngine") || "https://duckduckgo.com/?q=%s";

// Persistence logic
let history = JSON.parse(localStorage.getItem("simplyHistory") || "[]");
let bookmarks = JSON.parse(localStorage.getItem("simplyBookmarks") || "[]");
let activeTheme = localStorage.getItem("simplyTheme") || "midnight";
let isCloaked = localStorage.getItem("simplyCloak") === "true";
let adBlockEnabled = localStorage.getItem("simplyAdBlock") !== "false";

function applyTheme(theme) {
    document.body.className = `theme-${theme}`;
    localStorage.setItem("simplyTheme", theme);
    document.querySelectorAll('.theme-option').forEach(opt => {
        opt.classList.toggle('active', opt.dataset.theme === theme);
    });
}
applyTheme(activeTheme);

function updateHistoryList() {
    const list = document.getElementById("history-list");
    list.innerHTML = history.length ? "" : "<p style='opacity:0.5'>No history yet.</p>";
    history.slice().reverse().forEach((item, index) => {
        const div = document.createElement("div");
        div.className = "list-item";
        div.innerHTML = `<span>${item}</span><i class="ti ti-chevron-right"></i>`;
        div.onclick = () => {
            handleProxy(item);
            historyOverlay.classList.add("hidden");
        };
        list.appendChild(div);
    });
}

function updateBookmarksList() {
    const list = document.getElementById("bookmarks-list");
    list.innerHTML = bookmarks.length ? "" : "<p style='opacity:0.5'>No bookmarks yet.</p>";
    bookmarks.forEach((item, index) => {
        const div = document.createElement("div");
        div.className = "list-item";
        div.innerHTML = `<span>${item}</span><i class="ti ti-trash" style="color:#ff5252"></i>`;
        div.onclick = (e) => {
            if (e.target.classList.contains('ti-trash')) {
                bookmarks.splice(index, 1);
                localStorage.setItem("simplyBookmarks", JSON.stringify(bookmarks));
                updateBookmarksList();
                return;
            }
            handleProxy(item);
            bookmarksOverlay.classList.add("hidden");
        };
        list.appendChild(div);
    });
}

function updateStarIcon(url) {
    if (bookmarks.includes(url)) {
        bookmarkBtn.innerHTML = '<i class="ti ti-star-filled"></i>';
        bookmarkBtn.style.color = "#FFD700";
    } else {
        bookmarkBtn.innerHTML = '<i class="ti ti-star"></i>';
        bookmarkBtn.style.color = "#fff";
    }
}

// Toggles
settingsToggle.addEventListener("click", () => settingsOverlay.classList.remove("hidden"));
historyToggle.addEventListener("click", () => {
    updateHistoryList();
    historyOverlay.classList.remove("hidden");
});
bookmarksToggle.addEventListener("click", () => {
    updateBookmarksList();
    bookmarksOverlay.classList.remove("hidden");
});

closeButtons.forEach(btn => {
    btn.addEventListener("click", () => {
        document.getElementById(btn.dataset.overlay).classList.add("hidden");
    });
});

navToggle.addEventListener("click", () => {
    topNav.classList.toggle("collapsed");
    const isCollapsed = topNav.classList.contains("collapsed");
    navToggle.innerHTML = isCollapsed ? '<i class="ti ti-chevron-down"></i>' : '<i class="ti ti-chevron-up"></i>';
});

bookmarkBtn.addEventListener("click", () => {
    const url = topInput.value;
    if (url && url !== "simply://home") {
        const index = bookmarks.indexOf(url);
        if (index === -1) {
            bookmarks.push(url);
            bookmarkBtn.innerHTML = '<i class="ti ti-star-filled"></i>';
            bookmarkBtn.style.color = "#FFD700"; // Gold color
        } else {
            bookmarks.splice(index, 1);
            bookmarkBtn.innerHTML = '<i class="ti ti-star"></i>';
            bookmarkBtn.style.color = "#fff";
        }
        localStorage.setItem("simplyBookmarks", JSON.stringify(bookmarks));
        updateBookmarksList();
    }
});

// Apply saved setting on load
engineOptions.forEach(opt => {
    if (
        (opt.dataset.engine === "google" && currentSearchEngine.includes("google")) ||
        (opt.dataset.engine === "duckduckgo" && currentSearchEngine.includes("duckduckgo"))
    ) {
        engineOptions.forEach(o => o.classList.remove("active"));
        opt.classList.add("active");
    }

    opt.addEventListener("click", () => {
        engineOptions.forEach(o => o.classList.remove("active"));
        opt.classList.add("active");
        const engine = opt.dataset.engine;
        if (engine === "google") currentSearchEngine = "https://www.google.com/search?q=%s";
        else if (engine === "duckduckgo") currentSearchEngine = "https://duckduckgo.com/?q=%s";
        
        localStorage.setItem("searchEngine", currentSearchEngine);
    });
});

// Home Logic
homeBtn.addEventListener("click", () => {
    const frame = document.getElementById("sj-frame");
    if (frame) frame.remove();
    topInput.value = "simply://home";
    updateStarIcon("simply://home");
    const btn = form.querySelector('button');
    btn.innerHTML = '<i class="ti ti-arrow-right"></i>';
    btn.disabled = false;
    
    // Close all overlays
    document.querySelectorAll('.overlay').forEach(ov => ov.classList.add('hidden'));
    document.getElementById('cinema-details-panel').classList.remove('open');
});

// Theme switching
document.querySelectorAll('.theme-option').forEach(opt => {
    opt.addEventListener('click', () => applyTheme(opt.dataset.theme));
});

// Privacy toggles
const cloakToggle = document.getElementById('cloak-toggle');
const adblockToggle = document.getElementById('adblock-toggle');

cloakToggle.checked = isCloaked;
adblockToggle.checked = adBlockEnabled;

cloakToggle.addEventListener('change', () => {
    isCloaked = cloakToggle.checked;
    localStorage.setItem("simplyCloak", isCloaked);
});

adblockToggle.addEventListener('change', () => {
    adBlockEnabled = adblockToggle.checked;
    localStorage.setItem("simplyAdBlock", adBlockEnabled);
});

// Speed Dial
document.querySelectorAll('.dial-item').forEach(item => {
    item.addEventListener('click', () => {
        handleProxy(item.dataset.url);
    });
});

async function handleProxy(urlValue) {
    if (!urlValue || urlValue === "simply://home") return;

    if (isCloaked && window.top === window.self) {
        const win = window.open('about:blank', '_blank');
        if (win) {
            const doc = win.document;
            doc.title = 'Classes';
            const iframe = doc.createElement('iframe');
            iframe.src = window.location.origin + '#' + urlValue;
            iframe.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; border:none; margin:0; padding:0;';
            doc.body.style.margin = '0';
            doc.body.appendChild(iframe);
            return;
        }
    }

    const btn = form.querySelector('button');
    const originalBtnHTML = btn.innerHTML;
    btn.innerHTML = '<i class="ti ti-loader-2 ti-spin"></i>';
    btn.disabled = true;

    console.log("Starting proxy for value:", urlValue);

    try {
        console.log("Registering Service Worker...");
        await registerSW();
        
        const url = search(urlValue, currentSearchEngine);
        console.log("Navigating to:", url);
        topInput.value = url;
        updateStarIcon(url);

        // Save to history
        if (!history.includes(urlValue)) {
            history.push(urlValue);
            if (history.length > 50) history.shift();
            localStorage.setItem("simplyHistory", JSON.stringify(history));
        }

        let wispUrl = (location.protocol === "https:" ? "wss" : "ws") + "://" + location.host + "/wisp/";
        
        console.log("Setting transport to libcurl with wispUrl:", wispUrl);
        if ((await connection.getTransport()) !== "/libcurl/index.mjs") {
            await connection.setTransport("/libcurl/index.mjs", [{ websocket: wispUrl }]);
        }

        console.log("Creating Scramjet frame...");
        const existingFrame = document.getElementById("sj-frame");
        if (existingFrame) existingFrame.remove();

        const frame = scramjet.createFrame();
        frame.frame.id = "sj-frame";
        
        document.body.appendChild(frame.frame);
        console.log("Loading URL in frame...");
        frame.go(url);
    } catch (err) {
        console.error("Proxy error:", err);
        error.textContent = "Error: " + err.message;
        btn.innerHTML = originalBtnHTML;
        btn.disabled = false;
    }
}

form.addEventListener("submit", async (event) => {
    event.preventDefault();
    handleProxy(input.value);
});

topInput.addEventListener("keydown", async (event) => {
    if (event.key === "Enter") {
        handleProxy(topInput.value);
    }
});

// Dot Grid Background Logic
const canvas = document.getElementById('dot-grid');
const ctx = canvas.getContext('2d');
let points = [];
const spacing = 40;
let mouse = { x: -1000, y: -1000 };

function initPoints() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    points = [];
    for (let x = 0; x < canvas.width + spacing; x += spacing) {
        for (let y = 0; y < canvas.height + spacing; y += spacing) {
            points.push({ 
                x, y, 
                originX: x, originY: y,
                phaseX: Math.random() * Math.PI * 2,
                phaseY: Math.random() * Math.PI * 2,
                speedX: 0.0005 + Math.random() * 0.001,
                speedY: 0.0005 + Math.random() * 0.001
            });
        }
    }
}

window.addEventListener('resize', initPoints);
window.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
});

function animate(time = 0) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';

    points.forEach(p => {
        // Individualized idle movement
        const idleX = Math.sin(time * p.speedX + p.phaseX) * 5;
        const idleY = Math.cos(time * p.speedY + p.phaseY) * 5;
        
        const currentOriginX = p.originX + idleX;
        const currentOriginY = p.originY + idleY;

        const dx = mouse.x - currentOriginX;
        const dy = mouse.y - currentOriginY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const maxDist = 200;

        if (dist < maxDist) {
            const force = (maxDist - dist) / maxDist;
            p.x = currentOriginX + dx * force * 0.6;
            p.y = currentOriginY + dy * force * 0.6;
        } else {
            p.x += (currentOriginX - p.x) * 0.1;
            p.y += (currentOriginY - p.y) * 0.1;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, 1, 0, Math.PI * 2);
        ctx.fill();
    });

    requestAnimationFrame(animate);
}

initPoints();
requestAnimationFrame(animate);


// Fallback for generic close buttons
document.querySelectorAll('[data-overlay]').forEach(btn => {
    btn.addEventListener('click', () => {
        const overlayId = btn.dataset.overlay;
        if (overlayId) {
            const overlay = document.getElementById(overlayId);
            if (overlay) overlay.classList.add('hidden');
        }
    });
});

window.addEventListener('load', () => {
    if (window.location.hash) {
        handleProxy(window.location.hash.substring(1));
    }
});
