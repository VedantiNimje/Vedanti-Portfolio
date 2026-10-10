// Cursor-Tracking Character Hero Implementation
(function () {
    const canvas = document.getElementById("character-canvas");
    const container = document.getElementById("character-container");
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    
    // 27 curated stationary-body frames (where shoulders remain stationary and only head/eyes follow cursor)
    const TOTAL_FRAMES = 27;
    const CENTER_FRAME_INDEX = 8; // Resting center-forward gaze
    const FRAMES_DIR = "Public/curated_frames";

    const frames = new Array(TOTAL_FRAMES);
    let loadedCount = 0;
    let currentFrameIndex = CENTER_FRAME_INDEX;
    let targetFrameIndex = CENTER_FRAME_INDEX;
    let currentInterpolatedIndex = CENTER_FRAME_INDEX;
    const ease = 0.12; // Smooth interpolation factor

    let idleTimeout = null;
    let isPageVisible = true;
    const supportsFinePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Preload all frames into memory
    function preloadFrames() {
        // Load center resting frame first for instant paint
        const order = [CENTER_FRAME_INDEX];
        for (let i = 0; i < TOTAL_FRAMES; i++) {
            if (i !== CENTER_FRAME_INDEX) order.push(i);
        }

        order.forEach((index) => {
            const img = new Image();
            img.src = `${FRAMES_DIR}/frame_${String(index).padStart(3, "0")}.webp`;
            img.onload = () => {
                frames[index] = img;
                loadedCount++;

                // Draw initial resting frame as soon as it arrives
                if (index === CENTER_FRAME_INDEX && currentFrameIndex === CENTER_FRAME_INDEX) {
                    renderFrame(CENTER_FRAME_INDEX);
                }
            };
            img.onerror = () => {
                console.warn(`Could not load character frame ${index}`);
            };
        });
    }

    // Render frame onto canvas preserving aspect ratio and original centering
    function renderFrame(index) {
        const img = frames[index];
        if (!img || !img.complete || img.naturalWidth === 0) return;

        const rect = canvas.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;

        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const displayWidth = Math.round(rect.width * dpr);
        const displayHeight = Math.round(rect.height * dpr);

        if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
            canvas.width = displayWidth;
            canvas.height = displayHeight;
        }

        ctx.save();
        ctx.scale(dpr, dpr);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";

        const cw = rect.width;
        const ch = rect.height;
        ctx.clearRect(0, 0, cw, ch);

        // Aspect ratio contain algorithm (ensures no distortion or stretching)
        const iw = img.naturalWidth;
        const ih = img.naturalHeight;
        const scale = Math.min(cw / iw, ch / ih);
        const dw = iw * scale;
        const dh = ih * scale;
        const dx = (cw - dw) / 2;
        const dy = (ch - dh) / 2;

        ctx.drawImage(img, dx, dy, dw, dh);
        ctx.restore();
    }

    // Map normalized cursor X position [0..1] to frame index with center anchoring
    function getTargetFrameForProgress(progress) {
        const p = Math.max(0, Math.min(1, progress));
        if (p <= 0.5) {
            // Left half: 0 -> frame 0, 0.5 -> frame CENTER_FRAME_INDEX (8)
            return (p / 0.5) * CENTER_FRAME_INDEX;
        } else {
            // Right half: 0.5 -> frame CENTER_FRAME_INDEX (8), 1.0 -> frame TOTAL_FRAMES - 1 (26)
            return CENTER_FRAME_INDEX + ((p - 0.5) / 0.5) * (TOTAL_FRAMES - 1 - CENTER_FRAME_INDEX);
        }
    }

    // Update cursor position
    function onPointerMove(e) {
        if (!supportsFinePointer || prefersReducedMotion) return;

        // Map cursor X across window width to [0, 1]
        const nx = Math.max(0, Math.min(1, e.clientX / window.innerWidth));
        targetFrameIndex = getTargetFrameForProgress(nx);

        if (idleTimeout) clearTimeout(idleTimeout);
        // Softly return character to center gaze when pointer becomes idle
        idleTimeout = setTimeout(() => {
            targetFrameIndex = CENTER_FRAME_INDEX;
        }, 3000);
    }

    // Handle cursor leaving window
    function onPointerLeave() {
        if (!supportsFinePointer) return;
        targetFrameIndex = CENTER_FRAME_INDEX;
    }

    // Touch interaction for mobile devices
    function onTouchMove(e) {
        if (prefersReducedMotion || !e.touches || e.touches.length === 0) return;
        const touch = e.touches[0];
        const nx = Math.max(0, Math.min(1, touch.clientX / window.innerWidth));
        targetFrameIndex = getTargetFrameForProgress(nx);
    }

    function onTouchEnd() {
        targetFrameIndex = CENTER_FRAME_INDEX;
    }

    // Main animation loop
    let idleAngle = 0;
    function animate() {
        if (isPageVisible) {
            if (!supportsFinePointer && !prefersReducedMotion) {
                // Subtle ambient idle breathing on touch devices (around center ±1 frame)
                idleAngle += 0.015;
                targetFrameIndex = CENTER_FRAME_INDEX + Math.sin(idleAngle) * 1.5;
            }

            const diff = targetFrameIndex - currentInterpolatedIndex;
            if (Math.abs(diff) > 0.01) {
                currentInterpolatedIndex += diff * ease;
                const newFrameIndex = Math.max(
                    0,
                    Math.min(TOTAL_FRAMES - 1, Math.round(currentInterpolatedIndex))
                );

                if (newFrameIndex !== currentFrameIndex) {
                    currentFrameIndex = newFrameIndex;
                    renderFrame(currentFrameIndex);
                }
            }
        }
        requestAnimationFrame(animate);
    }

    // Window resize handler
    window.addEventListener("resize", () => {
        renderFrame(currentFrameIndex);
    }, { passive: true });

    // Pointer events
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    document.addEventListener("mouseleave", onPointerLeave);

    // Touch events
    if (container) {
        container.addEventListener("touchmove", onTouchMove, { passive: true });
        container.addEventListener("touchend", onTouchEnd, { passive: true });
    }

    // Page visibility handler
    document.addEventListener("visibilitychange", () => {
        isPageVisible = !document.hidden;
        if (isPageVisible) {
            renderFrame(currentFrameIndex);
        }
    });

    // Start loading and animation
    preloadFrames();
    requestAnimationFrame(animate);
})();

// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (event) => {
        const targetId = link.getAttribute("href");

        if (!targetId || targetId === "#") {
            event.preventDefault();
            return;
        }

        const target = document.querySelector(targetId);

        if (target) {
            event.preventDefault();
            target.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });
        }
    });
});
// 🌸 Cherry Noir & Soft Blush Theme Switcher
const themeToggle = document.getElementById("theme-toggle");
const lightVideo = document.getElementById("light-character-video");

function applyTheme(theme) {
    const isSoftBlush = theme === "soft-blush";

    if (isSoftBlush) {
        document.body.setAttribute("data-theme", "soft-blush");
        themeToggle.textContent = "🍒 Cherry Noir";
        themeToggle.setAttribute("aria-label", "Switch to Cherry Noir theme");

        if (lightVideo) {
            lightVideo.play().catch(() => {
                // Playback may require user interaction in some browsers.
            });
        }
    } else {
        document.body.removeAttribute("data-theme");
        themeToggle.textContent = "🌸 Soft Blush";
        themeToggle.setAttribute("aria-label", "Switch to Soft Blush theme");

        if (lightVideo) {
            lightVideo.pause();
            lightVideo.currentTime = 0;
        }
    }

    localStorage.setItem("portfolio-theme", theme);
}

// Restore the saved theme
const savedTheme = localStorage.getItem("portfolio-theme");
applyTheme(savedTheme === "soft-blush" ? "soft-blush" : "cherry-noir");

// Switch themes when clicked
themeToggle.addEventListener("click", () => {
    const isSoftBlush =
        document.body.getAttribute("data-theme") === "soft-blush";

    applyTheme(isSoftBlush ? "cherry-noir" : "soft-blush");
});