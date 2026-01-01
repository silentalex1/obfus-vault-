const overlay = document.getElementById('globalOverlay');
const cards = document.querySelectorAll('.premium-card');
const modals = document.querySelectorAll('.modal-ui');

if (cards.length > 0 && overlay) {
    cards.forEach(card => {
        card.addEventListener('click', (e) => {
            const modalId = card.getAttribute('data-open');
            const targetModal = document.getElementById(modalId);
            
            if (targetModal) {
                overlay.style.display = 'flex';
                modals.forEach(m => m.style.display = 'none');
                targetModal.style.display = 'block';
            }
            e.stopPropagation();
        });
    });
}

if (overlay) {
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
