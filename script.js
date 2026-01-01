const parallax = document.querySelector('.parallax-wrapper');
const overlay = document.getElementById('overlay');
const cards = document.querySelectorAll('.card');
const modals = document.querySelectorAll('.modal');

window.addEventListener('mousemove', (e) => {
    if (!parallax) return;
    const x = (e.clientX / window.innerWidth - 0.5) * 40;
    const y = (e.clientY / window.innerHeight - 0.5) * 40;
    parallax.style.transform = `translate(${-x}px, ${-y}px)`;
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
