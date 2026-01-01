const cards = document.querySelectorAll('.feature-card');
const overlay = document.getElementById('modal-overlay');
const contents = document.querySelectorAll('.modal-content');

cards.forEach(card => {
    card.addEventListener('click', (e) => {
        const targetId = card.getAttribute('data-target');
        const targetContent = document.getElementById(targetId);
        
        overlay.style.display = 'flex';
        contents.forEach(content => content.style.display = 'none');
        targetContent.style.display = 'block';
        
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
