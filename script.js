const featureData = {
    obfuscation: {
        title: 'Obfuscation',
        features: [
            'Strong Polymorphic VM',
            'Lua variable script rename',
            'Multi-Layer Encryption',
            'Advanced Control Flow Obfuscation',
            'Bytecode Mutation & Anti-Decompiler',
            'Anti-Leak Self-Destruction',
            'High-Intensity Mode (Max Protection)',
            'Advanced Control Flow Obfuscation'
        ]
    },
    client: {
        title: 'Client & Miscs',
        features: [
            'Environment Spoofing & Anti-Executor Detection',
            'AI Illusion (ANY AI\'s you could think of will NOT be able to deobfuscate your script.)'
        ]
    },
    deobfuscation: {
        title: 'Deobfuscation',
        features: [
            'Advanced script analysis tools',
            'Multi-format support',
            'Pattern recognition',
            'Bytecode reverse engineering',
            'Control flow reconstruction'
        ]
    }
};

const modal = document.getElementById('featureModal');
const modalTitle = document.getElementById('modalTitle');
const modalBody = document.getElementById('modalBody');
const featureCards = document.querySelectorAll('.feature-card');

featureCards.forEach(card => {
    card.addEventListener('click', (e) => {
        e.stopPropagation();
        const feature = card.getAttribute('data-feature');
        openModal(feature);
    });
});

function openModal(featureType) {
    const data = featureData[featureType];
    
    modalTitle.textContent = data.title;
    
    const featureList = document.createElement('ul');
    data.features.forEach(feature => {
        const li = document.createElement('li');
        li.textContent = feature;
        featureList.appendChild(li);
    });
    
    modalBody.innerHTML = '';
    modalBody.appendChild(featureList);
    
    modal.classList.add('active');
}

modal.addEventListener('click', (e) => {
    if (e.target === modal) {
        modal.classList.remove('active');
    }
});

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});
