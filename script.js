const overlay = document.getElementById('mainOverlay');
const cards = document.querySelectorAll('.feature-card');
const modals = document.querySelectorAll('.modal-box');

cards.forEach(card => {
    card.addEventListener('click', (e) => {
        const id = card.getAttribute('data-modal');
        const target = document.getElementById(id);
        
        overlay.style.display = 'flex';
        modals.forEach(m => m.style.display = 'none');
        target.style.display = 'block';
        
        e.stopPropagation();
    });
});

overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
        overlay.style.display = 'none';
    }
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        overlay.style.display = 'none';
    }
});
