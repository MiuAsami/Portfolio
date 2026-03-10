// ===================== GALAXY BACKGROUND =====================

let galaxyAnimId = null;

function initGalaxy() {
    const canvas = document.getElementById("galaxy-canvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    // Size canvas to full scrollable page
    function resizeCanvas() {
        canvas.width  = Math.max(document.body.scrollWidth,  window.innerWidth);
        canvas.height = Math.max(document.body.scrollHeight, window.innerHeight);
    }
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    const dark = () => document.body.classList.contains("dark");

    // ---- Bouncing 4-pointed stars ----
    const STAR_COUNT = 105;
    const stars = Array.from({ length: STAR_COUNT }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 1.4,
        vy: (Math.random() - 0.5) * 1.4,
        size: Math.random() * 3.5 + 1.5,
        twinkle: Math.random() * Math.PI * 2,
        twinkleSpeed: Math.random() * 0.04 + 0.01,
        hue: Math.floor(190 + Math.random() * 80),
        rot: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() * 0.02 + 0.003) * (Math.random() < 0.5 ? 1 : -1),
    }));

    // ---- Planets & BH — drift, fade out when off-screen, respawn at random edge ----
    const BASE_SPEED  = 0.12;
    const REF_SIZE    = 18;
    const FADE_FRAMES = 600; // ~10s at 60fps — fade-out duration once off-screen

    function spawnAtEdge(speed) {
        const edge = Math.floor(Math.random() * 4); // 0=top,1=right,2=bottom,3=left
        let x, y, angle;
        if      (edge === 0) { x = Math.random() * canvas.width;  y = -10;            angle = Math.PI * 0.1 + Math.random() * Math.PI * 0.8; }
        else if (edge === 1) { x = canvas.width + 10;  y = Math.random() * canvas.height; angle = Math.PI * 0.6 + Math.random() * Math.PI * 0.8; }
        else if (edge === 2) { x = Math.random() * canvas.width;  y = canvas.height + 10; angle = -Math.PI * 0.9 + Math.random() * Math.PI * 0.8; }
        else                 { x = -10; y = Math.random() * canvas.height; angle = -Math.PI * 0.4 + Math.random() * Math.PI * 0.8; }
        return { x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed };
    }

    function isOffScreen(x, y, margin) {
        return x + margin < 0 || x - margin > canvas.width ||
               y + margin < 0 || y - margin > canvas.height;
    }

    const planetDefs = [
        { r: 20, color: "#e8a87c", ringColor: "rgba(232,168,124,0.35)", hasRing: true  },
        { r: 13, color: "#7ec8e3", hasRing: false },
        { r: 25, color: "#c39bd3", ringColor: "rgba(195,155,211,0.3)",  hasRing: true  },
        { r: 10, color: "#f9ca74", hasRing: false },
        { r: 16, color: "#82e0aa", ringColor: "rgba(130,224,170,0.3)",  hasRing: true  },
    ];

    const planets = planetDefs.map(p => {
        const speed = BASE_SPEED * (p.r / REF_SIZE);
        const angle = Math.random() * Math.PI * 2;
        return {
            ...p,
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            spin: Math.random() * Math.PI * 2,
            spinSpeed: (Math.random() * 0.0004 + 0.0001) * (Math.random() < 0.5 ? 1 : -1),
            opacity: 1,
            fadeState: "visible",   // "visible" | "fadingOut" | "fadingIn"
            fadeTimer: 0,
        };
    });

    // ---- Black hole ----
    const BH_R    = 26;
    const bhSpeed = BASE_SPEED * (BH_R / REF_SIZE);
    const bhSpawn = spawnAtEdge(bhSpeed);
    const bh = {
        ...bhSpawn,
        r: BH_R,
        spin: 0,
        opacity: 0,
        fadeState: "fadingIn",
        fadeTimer: 0,
    };

    function draw4Star(x, y, r, hue, alpha, rot) {
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(x, y);
        ctx.rotate(rot);
        ctx.fillStyle = dark() ? `hsl(${hue},80%,80%)` : `hsl(220,70%,50%)`;
        ctx.shadowColor = dark() ? `hsl(${hue},80%,80%)` : `hsl(220,70%,60%)`;
        ctx.shadowBlur = 7;
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
            const angle = (i * Math.PI) / 4 - Math.PI / 4;
            const rad   = i % 2 === 0 ? r : r * 0.3;
            i === 0
                ? ctx.moveTo(rad * Math.cos(angle), rad * Math.sin(angle))
                : ctx.lineTo(rad * Math.cos(angle), rad * Math.sin(angle));
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    function drawPlanet(p) {
        p.x += p.vx;
        p.y += p.vy;
        p.spin += p.spinSpeed;
        const margin = p.r * 3;

        if (p.fadeState === "fadingIn") {
            p.fadeTimer++;
            p.opacity = Math.min(1, p.fadeTimer / (FADE_FRAMES * 0.3));
            if (p.opacity >= 1) { p.fadeState = "visible"; p.fadeTimer = 0; }
        } else if (p.fadeState === "visible") {
            if (isOffScreen(p.x, p.y, margin)) {
                p.fadeState = "fadingOut";
                p.fadeTimer = 0;
                p.opacity = 1;
            }
        } else if (p.fadeState === "fadingOut") {
            p.fadeTimer++;
            p.opacity = Math.max(0, 1 - p.fadeTimer / FADE_FRAMES);
            if (p.opacity <= 0) {
                // Respawn at random edge
                const speed = BASE_SPEED * (p.r / REF_SIZE);
                const spawn = spawnAtEdge(speed);
                p.x = spawn.x; p.y = spawn.y;
                p.vx = spawn.vx; p.vy = spawn.vy;
                p.opacity = 0;
                p.fadeState = "fadingIn";
                p.fadeTimer = 0;
            }
        }

        if (p.opacity <= 0) return;
        ctx.save();
        ctx.globalAlpha = p.opacity;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 18;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();

        if (p.hasRing) {
            ctx.shadowBlur = 0;
            ctx.strokeStyle = p.ringColor;
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.ellipse(p.x, p.y, p.r * 2.3, p.r * 0.5, Math.PI / 6 + p.spin, 0, Math.PI * 2);
            ctx.stroke();
        }
        ctx.restore();
    }

    function drawBlackHole() {
        bh.x += bh.vx;
        bh.y += bh.vy;
        bh.spin += 0.008;
        const margin = bh.r * 4;

        if (bh.fadeState === "fadingIn") {
            bh.fadeTimer++;
            bh.opacity = Math.min(1, bh.fadeTimer / (FADE_FRAMES * 0.3));
            if (bh.opacity >= 1) { bh.fadeState = "visible"; bh.fadeTimer = 0; }
        } else if (bh.fadeState === "visible") {
            if (isOffScreen(bh.x, bh.y, margin)) {
                bh.fadeState = "fadingOut";
                bh.fadeTimer = 0;
                bh.opacity = 1;
            }
        } else if (bh.fadeState === "fadingOut") {
            bh.fadeTimer++;
            bh.opacity = Math.max(0, 1 - bh.fadeTimer / FADE_FRAMES);
            if (bh.opacity <= 0) {
                const spawn = spawnAtEdge(bhSpeed);
                bh.x = spawn.x; bh.y = spawn.y;
                bh.vx = spawn.vx; bh.vy = spawn.vy;
                bh.opacity = 0;
                bh.fadeState = "fadingIn";
                bh.fadeTimer = 0;
            }
        }

        if (bh.opacity <= 0) return;
        const x = bh.x, y = bh.y;

        ctx.save();
        ctx.globalAlpha = bh.opacity;

        // Outer glow / accretion disk
        const glow = ctx.createRadialGradient(x, y, bh.r * 0.9, x, y, bh.r * 4);
        glow.addColorStop(0,   "rgba(255,120,0,0.55)");
        glow.addColorStop(0.25,"rgba(160,0,255,0.30)");
        glow.addColorStop(0.6, "rgba(0,80,200,0.10)");
        glow.addColorStop(1,   "transparent");
        ctx.beginPath();
        ctx.arc(x, y, bh.r * 4, 0, Math.PI * 2);
        ctx.fillStyle = glow;
        ctx.fill();

        // Spinning ring
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(bh.spin);
        ctx.strokeStyle = "rgba(255,160,0,0.5)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(0, 0, bh.r * 1.8, bh.r * 0.45, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        // Dark core
        ctx.beginPath();
        ctx.arc(x, y, bh.r, 0, Math.PI * 2);
        ctx.fillStyle = "#00000f";
        ctx.fill();

        ctx.restore();
    }

    function drawNebula() {
        const clouds = [
            { rx: 0.22, ry: 0.25, color: dark() ? "rgba(90,40,200,0.06)"  : "rgba(80,100,220,0.04)"  },
            { rx: 0.65, ry: 0.50, color: dark() ? "rgba(0,140,255,0.05)"  : "rgba(60,100,200,0.04)"  },
            { rx: 0.40, ry: 0.78, color: dark() ? "rgba(160,40,255,0.06)" : "rgba(120,80,200,0.04)"  },
            { rx: 0.80, ry: 0.40, color: dark() ? "rgba(0,180,200,0.04)"  : "rgba(60,160,200,0.03)"  },
        ];
        clouds.forEach(n => {
            const nx = n.rx * canvas.width;
            const ny = n.ry * canvas.height;
            const gr = ctx.createRadialGradient(nx, ny, 0, nx, ny, canvas.width * 0.28);
            gr.addColorStop(0, n.color);
            gr.addColorStop(1, "transparent");
            ctx.fillStyle = gr;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        });
    }

    function drawBackground() {
        const bg = ctx.createLinearGradient(0, 0, 0, canvas.height);
        if (dark()) {
            bg.addColorStop(0,   "#00000f");
            bg.addColorStop(0.4, "#050520");
            bg.addColorStop(1,   "#020010");
        } else {
            bg.addColorStop(0,   "#e8ecff");
            bg.addColorStop(0.4, "#dce4ff");
            bg.addColorStop(1,   "#e0e6ff");
        }
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    function animate() {
        galaxyAnimId = requestAnimationFrame(animate);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawBackground();
        drawNebula();
        drawBlackHole();
        planets.forEach(drawPlanet);

        stars.forEach(s => {
            s.x += s.vx;
            s.y += s.vy;
            if (s.x < 0 || s.x > canvas.width)  s.vx *= -1;
            if (s.y < 0 || s.y > canvas.height)  s.vy *= -1;
            s.twinkle += s.twinkleSpeed;
            s.rot += s.rotSpeed;
            const alpha = 0.55 + 0.45 * Math.sin(s.twinkle);
            draw4Star(s.x, s.y, s.size, s.hue, alpha, s.rot);
        });
    }

    if (galaxyAnimId) cancelAnimationFrame(galaxyAnimId);
    animate();
}

// ===================== APPLY THEME =====================

function applyTheme(isDark) {
    const root = document.documentElement;

    if (isDark) {
        document.body.classList.add("dark");
        document.body.style.background = "transparent";
        document.body.style.color = "#e8e8ff";
        root.style.setProperty('--bg', '#000010');
        root.style.setProperty('--text', '#e8e8ff');
        root.style.setProperty('--glass', 'rgba(255,255,255,0.05)');
        root.style.setProperty('--accent', '#00f7ff');
        root.style.setProperty('--accent2', '#7b2fff');
    } else {
        document.body.classList.remove("dark");
        document.body.style.background = "transparent";
        document.body.style.color = "#0a0a1a";
        root.style.setProperty('--bg', '#f0f4ff');
        root.style.setProperty('--text', '#0a0a1a');
        root.style.setProperty('--glass', 'rgba(0,0,0,0.05)');
        root.style.setProperty('--accent', '#0055cc');
        root.style.setProperty('--accent2', '#6600cc');
    }

    localStorage.setItem("theme", isDark ? "dark" : "light");
    // Galaxy adapts via dark() check in its animation loop — no restart needed
}

// ===================== INIT ON PAGE LOAD =====================

document.addEventListener("DOMContentLoaded", () => {
    const toggleBtn = document.getElementById("themeToggle");

    if (!toggleBtn) {
        console.error("themeToggle button not found!");
        return;
    }

    const isDarkOnLoad = localStorage.getItem("theme") === "dark";
    toggleBtn.textContent = isDarkOnLoad ? "☀️" : "🌙";
    applyTheme(isDarkOnLoad);
    initGalaxy();

    toggleBtn.addEventListener("click", () => {
        const isDark = !document.body.classList.contains("dark");
        toggleBtn.textContent = isDark ? "☀️" : "🌙";
        applyTheme(isDark);
    });
});


// ===================== TYPING EFFECT =====================
const roles = ["Computer Science", "BSCS Student", "CETA"];
let roleIndex = 0;
let charIndex = 0;

function typeEffect() {
    const typingElement = document.getElementById("typing");
    if (!typingElement) return;
    if (charIndex < roles[roleIndex].length) {
        typingElement.textContent += roles[roleIndex].charAt(charIndex);
        charIndex++;
        setTimeout(typeEffect, 100);
    } else {
        setTimeout(eraseEffect, 1500);
    }
}

function eraseEffect() {
    const typingElement = document.getElementById("typing");
    if (!typingElement) return;
    if (charIndex > 0) {
        typingElement.textContent = roles[roleIndex].substring(0, charIndex - 1);
        charIndex--;
        setTimeout(eraseEffect, 50);
    } else {
        roleIndex = (roleIndex + 1) % roles.length;
        setTimeout(typeEffect, 500);
    }
}

typeEffect();


// ===================== GALLERY =====================
const gallery = document.querySelector(".gallery");
const images = document.querySelectorAll(".gallery img");
const leftArrow = document.querySelector(".left");
const rightArrow = document.querySelector(".right");
let index = 0;

function updateGallery() {
    if (gallery) gallery.style.transform = `translateX(${-index * 250}px)`;
}

if (rightArrow) rightArrow.addEventListener("click", () => {
    index = (index + 1) % images.length;
    updateGallery();
});

if (leftArrow) leftArrow.addEventListener("click", () => {
    index = (index - 1 + images.length) % images.length;
    updateGallery();
});

setInterval(() => {
    if (images.length > 0) {
        index = (index + 1) % images.length;
        updateGallery();
    }
}, 5000);


// ===================== LOADER =====================
window.addEventListener("load", () => {
    const loader = document.getElementById("loader");
    if (loader) {
        loader.style.opacity = "0";
        setTimeout(() => loader.style.display = "none", 500);
    }
});


// ===================== SCROLL ANIMATIONS =====================
// Only track these specific top-level sections (avoids picking up nested sections like #experience inside #main-content)
// offset        = how many px BEFORE the section top the nav link highlights
// scrollOffset  = extra px below the navbar the page lands when you click the nav link
//                 increase to land further down (more breathing room), decrease to land higher
const navSections = [
    { id: "about",               href: "#about",              offset: 200, scrollOffset: 20  },
    { id: "main-content",        href: "#experience",         offset: 200, scrollOffset: 100 },
    { id: "skills",              href: "#skills",             offset: 200, scrollOffset: 20  },
    { id: "cs-projects",         href: "#cs-projects",        offset: 200, scrollOffset: 20  },
    { id: "gallery",             href: "#gallery",            offset: 200, scrollOffset: 20  },
    { id: "functional-gallery",  href: "#functional-gallery", offset: 200, scrollOffset: 20  },
];

window.addEventListener("scroll", () => {
    document.querySelectorAll(".section").forEach(sec => {
        if (sec.getBoundingClientRect().top < window.innerHeight - 100) {
            sec.classList.add("show");
        }
    });

    const scrollY = window.scrollY;
    const windowH = window.innerHeight;
    const bodyH = document.body.scrollHeight;

    let currentNavHref = "";

    // Near bottom of page → always highlight Functional Gallery
    if (scrollY + windowH >= bodyH - 80) {
        currentNavHref = "#functional-gallery";
    } else {
        navSections.forEach(({ id, href, offset }) => {
            const el = document.getElementById(id);
            if (!el) return;
            const sectionTop = el.getBoundingClientRect().top + scrollY;
            if (scrollY >= sectionTop - offset) {
                currentNavHref = href;
            }
        });
    }

    document.querySelectorAll("nav a").forEach(link => {
        link.classList.remove("active");
        if (link.getAttribute("href") === currentNavHref) {
            link.classList.add("active");
        }
    });
});


// ===================== CURSOR GLOW =====================
const cursorGlow = document.querySelector(".cursor-glow");
if (cursorGlow) {
    document.addEventListener("mousemove", (e) => {
        cursorGlow.style.left = e.clientX + "px";
        cursorGlow.style.top = e.clientY + "px";
        cursorGlow.classList.add("visible");
    });
}


// ===================== IMAGE MODAL (gallery) =====================
const modal = document.getElementById("imageModal");
const modalImg = document.getElementById("modalImg");
const closeBtn = document.querySelector(".close");

document.querySelectorAll(".gallery img").forEach(img => {
    img.addEventListener("click", () => {
        if (modal && modalImg) {
            modal.style.display = "block";
            modalImg.src = img.src;
        }
    });
});

if (closeBtn) closeBtn.onclick = () => modal.style.display = "none";
if (modal) modal.onclick = (e) => { if (e.target === modal) modal.style.display = "none"; };


// ===================== GALLERY DRAG & SWIPE =====================
let startX = 0;
let isDragging = false;

if (gallery) {
    gallery.addEventListener("mousedown", (e) => { isDragging = true; startX = e.pageX; });
    gallery.addEventListener("mouseup", (e) => {
        if (!isDragging) return;
        const diff = e.pageX - startX;
        if (diff > 50) index = (index - 1 + images.length) % images.length;
        else if (diff < -50) index = (index + 1) % images.length;
        updateGallery();
        isDragging = false;
    });
    gallery.addEventListener("touchstart", (e) => { startX = e.touches[0].clientX; });
    gallery.addEventListener("touchend", (e) => {
        const diff = e.changedTouches[0].clientX - startX;
        if (diff > 50) index = (index - 1 + images.length) % images.length;
        else if (diff < -50) index = (index + 1) % images.length;
        updateGallery();
    });
}


// ===================== NAV FADE =====================
document.querySelectorAll("nav a").forEach(link => {
    link.addEventListener("click", function (e) {
        e.preventDefault();
        const targetId = this.getAttribute("href").replace("#", "");
        const targetEl = document.getElementById(targetId);
        if (targetEl) {
            const headerHeight = document.querySelector("header")?.offsetHeight || 70;
            const section = navSections.find(s => s.id === targetId || s.href === "#" + targetId);
            const extraOffset = section?.scrollOffset ?? 20;
            const top = targetEl.getBoundingClientRect().top + window.scrollY - headerHeight - extraOffset;
            window.scrollTo({ top, behavior: "smooth" });
            // Fire scroll event after animation so highlight updates
            setTimeout(() => window.dispatchEvent(new Event("scroll")), 600);
        }
    });
});


// ===================== CHAT BOX =====================
const chatBtn = document.querySelector(".chat-button");
const chatBox = document.querySelector(".chat-box");
const chatInput = document.getElementById("chatInput");
const chatMessages = document.querySelector(".chat-messages");

if (chatBtn && chatBox) {
    chatBtn.addEventListener("click", () => {
        chatBox.style.display = chatBox.style.display === "flex" ? "none" : "flex";
    });
}

if (chatInput && chatMessages) {
    chatInput.addEventListener("keypress", function (e) {
        if (e.key === "Enter" && chatInput.value.trim()) {
            appendMessage("You: " + chatInput.value);
            chatInput.value = "";
            setTimeout(() => appendMessage("AI: I am Kenji's AI assistant 🤖"), 500);
        }
    });
}

function appendMessage(msg) {
    if (!chatMessages) return;
    const div = document.createElement("div");
    div.textContent = msg;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}


// ===================== PROFILE IMAGE =====================
document.addEventListener("DOMContentLoaded", function () {
    const uploadInput = document.getElementById("uploadProfile");
    const profilePreview = document.getElementById("profilePreview");
    const deleteBtn = document.getElementById("deleteProfile");

    if (!uploadInput || !profilePreview || !deleteBtn) return;

    const savedImage = localStorage.getItem("profileImage");
    // Default profile image — always falls back to facebookprofile.jpg
    profilePreview.src = savedImage || "facebookprofile.jpg";

    uploadInput.addEventListener("change", function () {
        const file = this.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            profilePreview.src = e.target.result;
            localStorage.setItem("profileImage", e.target.result);
        };
        reader.readAsDataURL(file);
    });

    deleteBtn.addEventListener("click", () => {
        // Visually clear the image — transparent placeholder
        profilePreview.src = "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";
        localStorage.removeItem("profileImage");
    });

    const profileModal = document.getElementById("imageModal");
    const profileModalImg = document.getElementById("modalImg");
    const closeModal = document.getElementById("closeModal");

    if (profileModal && profileModalImg && closeModal) {
        profilePreview.addEventListener("click", () => {
            profileModal.style.display = "block";
            profileModalImg.src = profilePreview.src;
        });
        closeModal.addEventListener("click", () => profileModal.style.display = "none");
        window.addEventListener("click", (e) => {
            if (e.target === profileModal) profileModal.style.display = "none";
        });
    }
});


// ===================== PROFILE — ORBITING STARS =====================
(function initProfileStars() {
    const canvas = document.getElementById("profileStars");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const SIZE = 210;
    const CX = SIZE / 2, CY = SIZE / 2;
    const INNER_R = 98; // bounce boundary — just inside the circle edge
    canvas.width = SIZE;
    canvas.height = SIZE;

    const dark = () => document.body.classList.contains("dark");
    const FPS  = 60;
    const FADE_SECS   = 3;
    const WAIT_SECS   = 5;
    const FADE_FRAMES = FADE_SECS * FPS;
    const WAIT_FRAMES = WAIT_SECS * FPS;
    const FADEIN_FRAMES = FADE_FRAMES; // same 3s fade in as fade out

    function randLife() { return (5 + Math.random() * 15) * FPS; } // 5–20 s

    function spawnStar() {
        // Start at a random point safely inside the circle
        const angle = Math.random() * Math.PI * 2;
        const dist  = Math.random() * (INNER_R - 10);
        const moveAngle = Math.random() * Math.PI * 2;
        const speed = 0.2 + Math.random() * 0.25; // slow drift
        return {
            x:  CX + Math.cos(angle) * dist,
            y:  CY + Math.sin(angle) * dist,
            vx: Math.cos(moveAngle) * speed,
            vy: Math.sin(moveAngle) * speed,
            size: 3.5 + Math.random() * 2.5,
            rot: Math.random() * Math.PI * 2,
            rotSpeed: (Math.random() * 0.03 + 0.005) * (Math.random() < 0.5 ? 1 : -1),
            life: randLife(),
            timer: 0,
            phase: "alive",
            waitTimer: 0,
            opacity: 1,
        };
    }

    const stars = Array.from({ length: 4 }, spawnStar);
    // Stagger initial timers so they don't all expire together
    stars.forEach((s, i) => { s.timer = Math.floor((i / 4) * s.life); });

    function draw4Star(x, y, r, alpha, rot) {
        const color = dark() ? "#00f7ff" : "#0055cc";
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(x, y);
        ctx.rotate(rot);
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
            const a = (i * Math.PI) / 4 - Math.PI / 4;
            const rad = i % 2 === 0 ? r : r * 0.35;
            i === 0
                ? ctx.moveTo(rad * Math.cos(a), rad * Math.sin(a))
                : ctx.lineTo(rad * Math.cos(a), rad * Math.sin(a));
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    function updateStar(s) {
        if (s.phase === "waiting") {
            s.waitTimer++;
            if (s.waitTimer >= WAIT_FRAMES) {
                Object.assign(s, spawnStar(), { phase: "fadingIn", opacity: 0, timer: 0 });
            }
            return;
        }

        // Move
        s.x += s.vx;
        s.y += s.vy;

        // Bounce off circle boundary
        const dx = s.x - CX, dy = s.y - CY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist + s.size >= INNER_R) {
            // Reflect velocity off the circle normal
            const nx = dx / dist, ny = dy / dist;
            const dot = s.vx * nx + s.vy * ny;
            s.vx -= 2 * dot * nx;
            s.vy -= 2 * dot * ny;
            // Push back inside
            const overlap = dist + s.size - INNER_R + 1;
            s.x -= nx * overlap;
            s.y -= ny * overlap;
        }

        if (s.phase === "fadingIn") {
            s.timer++;
            s.opacity = Math.min(1, s.timer / FADEIN_FRAMES);
            if (s.opacity >= 1) {
                s.phase = "alive";
                s.timer = 0;
            }
        } else if (s.phase === "alive") {
            s.timer++;
            s.opacity = 1;
            if (s.timer >= s.life) {
                s.phase = "fadingOut";
                s.timer = 0;
            }
        } else if (s.phase === "fadingOut") {
            s.timer++;
            s.opacity = Math.max(0, 1 - s.timer / FADE_FRAMES);
            if (s.opacity <= 0) {
                s.phase = "waiting";
                s.waitTimer = 0;
            }
        }
        s.rot += s.rotSpeed;
        draw4Star(s.x, s.y, s.size, s.opacity, s.rot);
    }

    function animate() {
        requestAnimationFrame(animate);
        ctx.clearRect(0, 0, SIZE, SIZE);
        stars.forEach(updateStar);
    }
    animate();
})();

function setupImageUpload(inputId, containerId) {
    const input = document.getElementById(inputId);
    const container = document.getElementById(containerId);
    if (!input || !container) return;

    input.addEventListener("change", function () {
        const file = this.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const imgWrapper = document.createElement("div");
            imgWrapper.classList.add("image-wrapper");
            const img = document.createElement("img");
            img.src = e.target.result;
            img.style.cursor = "pointer";

            // Lightbox on click
            img.addEventListener("click", () => {
                const modal = document.getElementById("imageModal");
                const modalImg = document.getElementById("modalImg");
                if (modal && modalImg) {
                    modalImg.src = img.src;
                    modal.style.display = "block";
                }
            });

            const delBtn = document.createElement("button");
            delBtn.textContent = "Delete";
            delBtn.classList.add("delete-btn");
            delBtn.onclick = () => imgWrapper.remove();
            imgWrapper.appendChild(img);
            imgWrapper.appendChild(delBtn);
            // Insert before the uploader label so it always stays last
            const uploaderLabel = container.querySelector("label.grid-uploader");
            if (uploaderLabel) {
                container.insertBefore(imgWrapper, uploaderLabel);
            } else {
                container.appendChild(imgWrapper);
            }
        };
        reader.readAsDataURL(file);
    });
}

setupImageUpload("uploadSaas", "saasImages");
setupImageUpload("uploadWorkout", "workoutImages");
setupImageUpload("uploadCert", "certImages");

// ===================== CREATE PROJECT — ALL SECTIONS =====================
(function setupCreateProject() {
    const modal     = document.getElementById("createProjectModal");
    const cancelBtn = document.getElementById("cpCancel");
    const createBtn = document.getElementById("cpCreate");
    const nameInput = document.getElementById("cpName");
    const descInput = document.getElementById("cpDesc");
    const pageWrap  = document.getElementById("navbar"); // blur sentinel
    if (!modal) return;

    let projectCount = 0;
    let activeListEl = null;

    // All "Create Project" buttons share one modal, differentiated by data-list
    document.querySelectorAll(".open-cp-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            activeListEl = document.getElementById(btn.dataset.list);
            nameInput.value = "";
            descInput.value = "";
            openModal();
            nameInput.focus();
        });
    });

    function openModal() {
        modal.style.display = "flex";
        document.body.classList.add("modal-open");
    }

    function closeModal() {
        modal.style.display = "none";
        document.body.classList.remove("modal-open");
    }

    cancelBtn.addEventListener("click", closeModal);
    modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });

    createBtn.addEventListener("click", () => {
        const name = nameInput.value.trim();
        const desc = descInput.value.trim();
        if (!name) { nameInput.focus(); return; }
        closeModal();
        if (activeListEl) buildProject(name, desc, activeListEl);
    });

    function buildProject(name, desc, listEl) {
        projectCount++;
        const uid = "cp-" + projectCount;

        const card = document.createElement("div");
        card.classList.add("cp-card");
        card.id = uid;

        // Header
        const header = document.createElement("div");
        header.classList.add("cp-card-header");
        const titleWrap = document.createElement("div");
        const h2 = document.createElement("h2");
        h2.classList.add("cp-card-title");
        h2.textContent = name;
        const underline = document.createElement("div");
        underline.classList.add("cp-card-underline");
        titleWrap.appendChild(h2);
        titleWrap.appendChild(underline);
        const delCardBtn = document.createElement("button");
        delCardBtn.textContent = "Delete Project";
        delCardBtn.classList.add("cp-delete-card-btn");
        delCardBtn.addEventListener("click", () => card.remove());
        header.appendChild(titleWrap);
        header.appendChild(delCardBtn);

        // Description
        const descEl = document.createElement("p");
        descEl.classList.add("cp-card-desc");
        descEl.textContent = desc || "";

        // Image grid
        const imgInputId = uid + "-img";
        const imgGrid = document.createElement("div");
        imgGrid.classList.add("cp-img-grid");
        const addLabel = document.createElement("label");
        addLabel.setAttribute("for", imgInputId);
        addLabel.classList.add("gallery-upload-label", "grid-uploader");
        addLabel.innerHTML = `<span class="label-title">Add Image</span><span class="label-sub">Click to add image</span>`;
        const imgInput = document.createElement("input");
        imgInput.type = "file";
        imgInput.id = imgInputId;
        imgInput.accept = "image/*";
        imgInput.hidden = true;
        addLabel.appendChild(imgInput);
        imgGrid.appendChild(addLabel);

        imgInput.addEventListener("change", function () {
            const file = this.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (e) => {
                const wrapper = document.createElement("div");
                wrapper.classList.add("gallery-image-wrapper");
                const img = document.createElement("img");
                img.src = e.target.result;
                img.style.cssText = "width:100%;height:100%;object-fit:contain;object-position:center;position:absolute;top:0;left:0;border-radius:0;cursor:pointer;";
                img.addEventListener("click", () => {
                    const lbModal = document.getElementById("imageModal");
                    const lbImg = document.getElementById("modalImg");
                    if (lbModal && lbImg) { lbImg.src = img.src; lbModal.style.display = "block"; }
                });
                const delBtn = document.createElement("button");
                delBtn.textContent = "Delete";
                delBtn.classList.add("delete-btn");
                delBtn.onclick = () => wrapper.remove();
                wrapper.appendChild(img);
                wrapper.appendChild(delBtn);
                imgGrid.insertBefore(wrapper, addLabel);
            };
            reader.readAsDataURL(file);
            this.value = "";
        });

        card.appendChild(header);
        if (desc) card.appendChild(descEl);
        card.appendChild(imgGrid);
        listEl.appendChild(card);
        setTimeout(() => card.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    }
})();
(function setupGalleryUpload() {
    const input = document.getElementById("uploadGallery");
    const container = document.getElementById("galleryImages");
    if (!input || !container) return;

    input.addEventListener("change", function () {
        const file = this.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const wrapper = document.createElement("div");
            wrapper.classList.add("gallery-image-wrapper");
            const img = document.createElement("img");
            img.src = e.target.result;
            img.style.cursor = "pointer";

            // Lightbox click
            img.addEventListener("click", () => {
                const modal = document.getElementById("imageModal");
                const modalImg = document.getElementById("modalImg");
                if (modal && modalImg) {
                    modalImg.src = img.src;
                    modal.style.display = "block";
                }
            });

            const delBtn = document.createElement("button");
            delBtn.textContent = "Delete";
            delBtn.classList.add("delete-btn");
            delBtn.onclick = () => wrapper.remove();
            wrapper.appendChild(img);
            wrapper.appendChild(delBtn);
            const uploaderLabel = container.querySelector("label.grid-uploader");
            if (uploaderLabel) {
                container.insertBefore(wrapper, uploaderLabel);
            } else {
                container.appendChild(wrapper);
            }
        };
        reader.readAsDataURL(file);
        this.value = "";
    });
})();
(function setupVideoUpload() {
    const input = document.getElementById("uploadFuncVideo");
    const container = document.getElementById("funcVideoGrid");
    if (!input || !container) return;

    input.addEventListener("change", function () {
        const file = this.files[0];
        if (!file || !file.type.startsWith("video/")) return;

        const url = URL.createObjectURL(file);

        const wrapper = document.createElement("div");
        wrapper.classList.add("video-wrapper");

        const video = document.createElement("video");
        video.src = url;
        video.controls = true;
        video.preload = "metadata";

        const delBtn = document.createElement("button");
        delBtn.textContent = "Delete";
        delBtn.classList.add("delete-btn");
        delBtn.onclick = () => {
            URL.revokeObjectURL(url);
            wrapper.remove();
        };

        wrapper.appendChild(video);
        wrapper.appendChild(delBtn);
        // Insert before the uploader label so it always stays last
        const uploaderLabel = container.querySelector("label.grid-uploader");
        if (uploaderLabel) {
            container.insertBefore(wrapper, uploaderLabel);
        } else {
            container.appendChild(wrapper);
        }

        // Reset so same file can be re-uploaded if needed
        this.value = "";
    });
})();
