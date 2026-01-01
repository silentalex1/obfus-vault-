const overlay = document.getElementById('overlay');
const cards = document.querySelectorAll('.f-card');
const modals = document.querySelectorAll('.modal');

if (cards && overlay) {
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
        if (e.target === overlay) overlay.style.display = 'none';
    });
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay) overlay.style.display = 'none';
});
