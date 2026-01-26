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
