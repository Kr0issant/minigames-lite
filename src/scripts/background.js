document.addEventListener('mousemove', (e) => {
    const x = e.clientX / window.innerWidth;
    const y = e.clientY / window.innerHeight;

    // Calculate offset (opposite direction, slight movement)
    // -20px to 20px range
    const moveX = -(x - 0.5) * 40;
    const moveY = -(y - 0.5) * 40;

    document.body.style.setProperty('--bg-x', `${moveX}px`);
    document.body.style.setProperty('--bg-y', `${moveY}px`);
});

// === IFRAME NAVIGATION LOGIC ===
// Since the user might remove background-music.js from child pages,
// we need to handle the "Back" button here to ensure it communicates with the parent shell.
if (window.self !== window.top) {
    document.addEventListener('DOMContentLoaded', () => {
        const backBtns = document.querySelectorAll('a[href*="index.html"], .back-btn');
        backBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                window.parent.postMessage('closeGame', '*');
            });
        });
    });
}
