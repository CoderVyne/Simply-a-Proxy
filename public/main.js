"use strict";

// Points animation (Moved to top to ensure it starts immediately)
const canvas = document.getElementById("dot-grid");
const ctx = canvas.getContext("2d");
let points = [];
const mouse = { x: -100, y: -100 };

function initPoints() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    points = [];
    const spacing = 30;
    for (let x = 0; x < canvas.width; x += spacing) {
        for (let y = 0; y < canvas.height; y += spacing) {
            points.push({ x, y, originX: x, originY: y });
        }
    }
}

function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    points.forEach(p => {
        const dx = mouse.x - p.originX;
        const dy = mouse.y - p.originY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const maxDist = 150;

        if (dist < maxDist) {
            const force = (maxDist - dist) / maxDist;
            p.x = p.originX - dx * force * 0.5;
            p.y = p.originY - dy * force * 0.5;
        } else {
            p.x += (p.originX - p.x) * 0.1;
            p.y += (p.originY - p.y) * 0.1;
        }

        ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1, 0, Math.PI * 2);
        ctx.fill();
    });
    requestAnimationFrame(animate);
}

window.addEventListener("mousemove", (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
});

window.addEventListener("resize", initPoints);
initPoints();
animate();

async function registerSW() {
    try {
        if (!navigator.serviceWorker) return;
        await navigator.serviceWorker.register("/sw.js");
    } catch (e) {
        console.error("SW failed:", e);
    }
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
scramjet.init();

const form = document.getElementById("proxy-form");
const input = document.getElementById("url-input");
const topInput = document.getElementById("top-url-input");
const homeBtn = document.getElementById("home-btn");
const bookmarkBtn = document.getElementById("bookmark-btn");
const settingsToggle = document.getElementById("settings-toggle");
const historyToggle = document.getElementById("history-toggle");
const bookmarksToggle = document.getElementById("bookmarks-toggle");
const settingsOverlay = document.getElementById("settings-overlay");
const historyOverlay = document.getElementById("history-overlay");
const bookmarksOverlay = document.getElementById("bookmarks-overlay");
const closeButtons = document.querySelectorAll(".close-btn");

// State Management
let currentSearchEngine = localStorage.getItem("simplySearchEngine") || "https://duckduckgo.com/?q=%s";
let cloakEnabled = localStorage.getItem("simplyCloak") === "true";
let currentTheme = localStorage.getItem("simplyTheme") || "midnight";
let history = JSON.parse(localStorage.getItem("simplyHistory") || "[]");
let bookmarks = JSON.parse(localStorage.getItem("simplyBookmarks") || "[]");

let tabs = [{ id: Date.now(), url: "simply://home", active: true }];
let activeTabId = tabs[0].id;

// Initialize Theme
document.body.className = `theme-${currentTheme}`;
document.querySelectorAll('.theme-option').forEach(opt => {
    if (opt.dataset.theme === currentTheme) opt.classList.add('active');
    else opt.classList.remove('active');
});

// Initialize Settings Toggles
document.getElementById('cloak-toggle').checked = cloakEnabled;

function updateHistoryList() {
    const list = document.getElementById("history-list");
    list.innerHTML = history.length ? "" : "<p style='opacity:0.5; padding: 20px;'>No history yet.</p>";
    history.slice().reverse().forEach((item) => {
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
    list.innerHTML = bookmarks.length ? "" : "<p style='opacity:0.5; padding: 20px;'>No bookmarks yet.</p>";
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

// Tab Management
function renderTabs() {
    const container = document.getElementById('tabs-container');
    const bar = document.getElementById('tabs-bar');
    container.innerHTML = '';
    
    if (tabs.length > 1 || tabs[0].url !== "simply://home") {
        bar.classList.remove('hidden');
    } else {
        bar.classList.add('hidden');
    }

    tabs.forEach(tab => {
        const div = document.createElement('div');
        div.className = `tab ${tab.active ? 'active' : ''}`;
        const title = tab.url === "simply://home" ? "Home" : tab.url.replace(/^https?:\/\//, '').split('/')[0];
        div.innerHTML = `
            <i class="ti ti-world"></i>
            <span>${title}</span>
            <i class="ti ti-x" onclick="closeTab(event, ${tab.id})"></i>
        `;
        div.onclick = () => switchTab(tab.id);
        container.appendChild(div);
    });
}

function switchTab(id) {
    tabs.forEach(t => t.active = (t.id === id));
    activeTabId = id;
    const activeTab = tabs.find(t => t.id === id);
    
    const container = document.getElementById('proxy-container');
    const homeView = document.getElementById('home-view');
    const topInput = document.getElementById('top-url-input');

    // Hide all frames
    document.querySelectorAll('.proxy-frame').forEach(f => f.classList.add('hidden'));
    
    if (activeTab.url === "simply://home") {
        homeView.classList.remove('hidden');
        container.classList.add('hidden');
        topInput.value = "simply://home";
    } else {
        homeView.classList.add('hidden');
        container.classList.remove('hidden');
        const frame = document.getElementById(`frame-${id}`);
        if (frame) frame.classList.remove('hidden');
        topInput.value = activeTab.url;
    }
    renderTabs();
    updateStarIcon(activeTab.url);
}

function closeTab(e, id) {
    e.stopPropagation();
    if (tabs.length === 1) {
        tabs[0].url = "simply://home";
        const frame = document.getElementById(`frame-${id}`);
        if (frame) frame.remove();
        switchTab(id);
        return;
    }
    const index = tabs.findIndex(t => t.id === id);
    const wasActive = tabs[index].active;
    tabs.splice(index, 1);
    const frame = document.getElementById(`frame-${id}`);
    if (frame) frame.remove();
    
    if (wasActive) switchTab(tabs[Math.max(0, index - 1)].id);
    else renderTabs();
}

function addTab(url = "simply://home") {
    tabs.forEach(t => t.active = false);
    const newId = Date.now();
    tabs.push({ id: newId, url: url, active: true });
    activeTabId = newId;
    
    if (url !== "simply://home") {
        createFrame(newId, url);
    }
    switchTab(newId);
}

function createFrame(id, url) {
    const container = document.getElementById('proxy-container');
    const iframe = document.createElement('iframe');
    iframe.id = `frame-${id}`;
    iframe.className = 'proxy-frame';
    const searchUrl = search(url, currentSearchEngine);
    iframe.src = __scramjet$config.prefix + scramjet.encodeUrl(searchUrl);
    container.appendChild(iframe);
}

async function handleProxy(urlValue) {
    const cloak = document.getElementById('cloak-toggle').checked;
    
    if (cloak && !window.frameElement) {
        const win = window.open('about:blank', '_blank');
        if (win) {
            win.document.body.style.margin = '0';
            win.document.body.style.height = '100vh';
            const frame = win.document.createElement('iframe');
            frame.style.width = '100%';
            frame.style.height = '100%';
            frame.style.border = 'none';
            frame.src = window.location.origin + '?url=' + encodeURIComponent(urlValue);
            win.document.body.appendChild(frame);
            return;
        }
    }

    if (!history.includes(urlValue)) {
        history.push(urlValue);
        localStorage.setItem("simplyHistory", JSON.stringify(history));
    }

    const activeTab = tabs.find(t => t.id === activeTabId);
    activeTab.url = urlValue;
    
    let frame = document.getElementById(`frame-${activeTabId}`);
    if (!frame) {
        createFrame(activeTabId, urlValue);
    } else {
        const searchUrl = search(urlValue, currentSearchEngine);
        frame.src = __scramjet$config.prefix + scramjet.encodeUrl(searchUrl);
    }
    
    switchTab(activeTabId);
}

// Toggles and Events
settingsToggle.addEventListener("click", () => settingsOverlay.classList.remove("hidden"));
historyToggle.addEventListener("click", () => { updateHistoryList(); historyOverlay.classList.remove("hidden"); });
bookmarksToggle.addEventListener("click", () => { updateBookmarksList(); bookmarksOverlay.classList.remove("hidden"); });

closeButtons.forEach(btn => {
    btn.addEventListener("click", () => {
        document.getElementById(btn.dataset.overlay).classList.add("hidden");
    });
});

document.getElementById('cloak-toggle').addEventListener('change', (e) => {
    localStorage.setItem("simplyCloak", e.target.checked);
});

document.querySelectorAll('.theme-option').forEach(opt => {
    opt.addEventListener('click', () => {
        const theme = opt.dataset.theme;
        document.body.className = `theme-${theme}`;
        document.querySelectorAll('.theme-option').forEach(o => o.classList.remove('active'));
        opt.classList.add('active');
        localStorage.setItem("simplyTheme", theme);
    });
});

document.querySelectorAll('.dial-item').forEach(item => {
    item.addEventListener('click', () => handleProxy(item.dataset.url));
});

document.getElementById('add-tab-btn').onclick = () => addTab();

// Panic Key
window.addEventListener('keydown', (e) => {
    if (e.key === "Escape") {
        const homeTab = tabs.find(t => t.url === "simply://home");
        if (homeTab) switchTab(homeTab.id);
        else addTab("simply://home");
    }
});

// Search Engine Switcher
document.querySelectorAll('.engine-option').forEach(opt => {
    opt.addEventListener('click', () => {
        const engine = opt.dataset.engine === 'google' ? "https://www.google.com/search?q=%s" : "https://duckduckgo.com/?q=%s";
        currentSearchEngine = engine;
        localStorage.setItem("simplySearchEngine", engine);
        document.querySelectorAll('.engine-option').forEach(o => o.classList.remove('active'));
        opt.classList.add('active');
    });
});

form.addEventListener("submit", (e) => {
    e.preventDefault();
    handleProxy(input.value);
});

topInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") handleProxy(topInput.value);
});

homeBtn.addEventListener("click", () => switchTab(tabs[0].id));
bookmarkBtn.addEventListener("click", () => {
    const url = tabs.find(t => t.id === activeTabId).url;
    if (url && url !== "simply://home") {
        const index = bookmarks.indexOf(url);
        if (index === -1) bookmarks.push(url);
        else bookmarks.splice(index, 1);
        localStorage.setItem("simplyBookmarks", JSON.stringify(bookmarks));
        updateStarIcon(url);
    }
});

// Check URL Params for cloaking
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.has('url')) {
    handleProxy(decodeURIComponent(urlParams.get('url')));
}

renderTabs();
updateStarIcon("simply://home");
registerSW();
