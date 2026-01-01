const parallaxBg = document.getElementById('parallaxBg');
const overlay = document.getElementById('mainOverlay');
const cards = document.querySelectorAll('.premium-card');
const modals = document.querySelectorAll('.modal-card');

window.addEventListener('mousemove', (e) => {
    if (!parallaxBg) return;
    const x = (e.clientX / window.innerWidth - 0.5) * 60;
    const y = (e.clientY / window.innerHeight - 0.5) * 60;
    parallaxBg.style.transform = `translate(${-x}px, ${-y}px)`;
});

if (cards.length > 0 && overlay) {
    cards.forEach(card => {
        card.addEventListener('click', (e) => {
            const modalId = card.getAttribute('data-modal');
            const target = document.getElementById(modalId);
            
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
