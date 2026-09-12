import { store } from '../state/store.js';

export function renderBottomNavigation() {
  const activeTab = store.activeTab;

  return `
    <aside class="fixed bottom-0 left-0 right-0 z-40 bg-surface/90 backdrop-blur-xl border-t border-surface-container-high md:hidden shadow-[0_-4px_16px_rgba(43,40,37,0.06)]">
      <div class="flex items-center justify-around h-16 px-space-sm">
        <button 
          data-tab="today" 
          class="bottom-nav-btn flex flex-col items-center justify-center flex-1 py-1 ${activeTab === 'today' ? 'text-primary font-bold' : 'text-on-surface-variant hover:text-on-surface'}"
        >
          <span class="material-symbols-outlined text-[22px]">today</span>
          <span class="font-label-sm text-label-sm mt-0.5">Today</span>
        </button>
        
        <button 
          data-tab="explore-and-weekend" 
          class="bottom-nav-btn flex flex-col items-center justify-center flex-1 py-1 ${activeTab === 'explore-and-weekend' ? 'text-primary font-bold' : 'text-on-surface-variant hover:text-on-surface'}"
        >
          <span class="material-symbols-outlined text-[22px]">explore</span>
          <span class="font-label-sm text-label-sm mt-0.5">Explore</span>
        </button>
        
        <button 
          data-tab="saved" 
          class="bottom-nav-btn flex flex-col items-center justify-center flex-1 py-1 ${activeTab === 'saved' ? 'text-primary font-bold' : 'text-on-surface-variant hover:text-on-surface'}"
        >
          <span class="material-symbols-outlined text-[22px]">bookmark</span>
          <span class="font-label-sm text-label-sm mt-0.5">Saved</span>
        </button>
        
        <button 
          data-tab="add-event" 
          class="bottom-nav-btn flex flex-col items-center justify-center flex-1 py-1 ${activeTab === 'add-event' ? 'text-primary font-bold' : 'text-on-surface-variant hover:text-on-surface'}"
        >
          <span class="material-symbols-outlined text-[22px]">add_box</span>
          <span class="font-label-sm text-label-sm mt-0.5">Post</span>
        </button>
      </div>
    </aside>
  `;
}

export function bindBottomNavigationEvents(container) {
  container.querySelectorAll('.bottom-nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.getAttribute('data-tab');
      store.setActiveTab(tab);
    });
  });
}
