import { store } from '../state/store.js';

export function renderCategoryChips() {
  const currentCat = store.selectedCategory;

  const categories = [
    { id: 'all', label: '✨ All', count: 38 },
    { id: 'culture', label: '🎭 Culture & Natak', count: 5 },
    { id: 'food', label: '🍜 Food & Popups', count: 8 },
    { id: 'sports', label: '🏏 Sports & Turf', count: 6 },
    { id: 'workshops', label: '🎨 Workshops', count: 4 },
    { id: 'social', label: '🎤 Social & Music', count: 7 },
    { id: 'exhibitions', label: '🛍 Exhibitions', count: 3 },
    { id: 'festivals', label: '🛕 Festivals & Darshan', count: 3 }
  ];

  return `
    <div class="relative w-full">
      <div class="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none no-scrollbar">
        ${categories.map(cat => {
          const isActive = currentCat === cat.id;
          return `
            <button 
              data-category="${cat.id}"
              class="cat-pill shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full font-label-md text-label-md transition-all shadow-sm ${
                isActive 
                  ? 'bg-on-background text-surface font-bold' 
                  : 'bg-surface-container-lowest hover:bg-surface-container text-on-surface'
              }"
            >
              <span>${cat.label}</span>
              <span class="${isActive ? 'opacity-70 text-xs' : 'text-xs text-primary font-bold'}">(${cat.count})</span>
            </button>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

export function bindCategoryChipsEvents(container) {
  container.querySelectorAll('.cat-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      const cat = btn.getAttribute('data-category');
      store.setSelectedCategory(cat);
    });
  });
}
