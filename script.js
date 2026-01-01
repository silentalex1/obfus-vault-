const bg = document.getElementById('parallaxBg');
const overlay = document.getElementById('globalOverlay');
const cards = document.querySelectorAll('.feature-card');
const modals = document.querySelectorAll('.modal');

window.addEventListener('mousemove', (e) => {
    if (!bg) return;
    const x = (e.clientX / window.innerWidth - 0.5) * 80;
    const y = (e.clientY / window.innerHeight - 0.5) * 80;
    bg.style.transform = `translate(${-x}px, ${-y}px)`;
});

if (cards.length > 0 && overlay) {
    cards.forEach(card => {
        card.addEventListener('click', (e) => {
            const id = card.getAttribute('data-modal');
            const target = document.getElementById(id);
            if (target) {
                overlay.style.display = 'flex';
                modals.forEach(m => m.style.display = 'none');
                target.style.display = 'block';
            }
            e.stopPropagation();
        });
    });

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.style.display = 'none';
        }
    });
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay) {
        overlay.style.display = 'none';
    }
});
