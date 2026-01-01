const mouseGlow = document.getElementById('mouseGlow');
document.addEventListener('mousemove', (e) => {
    mouseGlow.style.left = e.clientX + 'px';
    mouseGlow.style.top = e.clientY + 'px';
});

const cards = document.querySelectorAll('.glass-card');
const overlay = document.getElementById('modalOverlay');
const windows = document.querySelectorAll('.modal-window');

cards.forEach(card => {
    card.addEventListener('click', (e) => {
        const targetId = card.getAttribute('data-modal');
        const targetWindow = document.getElementById(targetId);
        
        overlay.style.display = 'flex';
        setTimeout(() => {
            overlay.style.opacity = '1';
            targetWindow.style.display = 'block';
            setTimeout(() => targetWindow.style.transform = 'scale(1)', 10);
        }, 10);
        
        e.stopPropagation();
    });
});

const closeModal = () => {
    overlay.style.opacity = '0';
    windows.forEach(win => win.style.transform = 'scale(0.9)');
    setTimeout(() => {
        overlay.style.display = 'none';
        windows.forEach(win => win.style.display = 'none');
    }, 400);
};

overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
});
