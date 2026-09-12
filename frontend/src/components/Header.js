import { store } from '../state/store.js';

export function renderHeader() {
  const state = store;
  const savedCount = state.savedEventIds.size;

  return `
    <header class="fixed top-0 left-0 right-0 z-50 bg-surface/85 backdrop-blur-xl shadow-[0_2px_12px_rgba(43,40,37,0.04)]">
      <div class="h-20 max-w-[1440px] mx-auto px-margin md:px-margin-desktop flex items-center justify-between gap-space-md">
        <!-- Brand Logo & City Switcher -->
        <div class="flex items-center gap-space-md shrink-0">
          <button id="logo-btn" class="flex items-center gap-space-sm group text-left">
            <img 
              alt="Aaje Su? Brand Logo" 
              class="h-8 w-auto object-contain" 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuACMH9AjFrfo0rsl_vhZRsVanXCo7K1DiFaIkMNFh0kypibitPgbUjBoNgYOLY0gRXw49TmEr9IyApHOcN3pDv1X0CqQ2fI7QOczpDfI7qPQZWGOSG-g1NGMH1bN5NesJiXcoFbeIQICFL7_WpQxuJFAVUIZnZ8qbkg0mbeMEejJ0fF8Ex9uTSY3DLZtuv0mVCKMKxzSMpPIs4vC0BjKPz7zeS_vlOlagGa1e6wN4cgy1KyEwgIOa0yQw"
            />
            <div class="flex flex-col">
              <span class="font-headline-sm text-headline-sm tracking-tight text-primary font-extrabold leading-none">આજે શું?</span>
              <span class="font-label-sm text-label-sm uppercase tracking-wider text-tertiary">Aaje Su • ${state.selectedCity}</span>
            </div>
          </button>

          <!-- City Selector Dropdown -->
          <div class="relative group hidden sm:block">
            <button class="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container hover:bg-surface-container-high transition-all border border-surface-container-high/60 text-on-surface shadow-xs cursor-pointer" type="button">
              <span class="material-symbols-outlined text-primary text-[18px]">location_on</span>
              <span class="font-label-md text-label-md font-bold">${state.selectedCity}</span>
              <span class="material-symbols-outlined text-[16px] text-on-surface-variant transition-transform group-hover:rotate-180">expand_more</span>
            </button>

            <div class="absolute top-[calc(100%+8px)] left-0 w-52 bg-surface-container-lowest rounded-2xl shadow-[0_16px_36px_-6px_rgba(43,40,37,0.18)] border border-surface-container-high p-2 hidden group-hover:block transition-all z-50">
              <div class="px-3 py-2 font-label-sm text-[11px] font-bold uppercase tracking-wider text-on-surface-variant/80 border-b border-surface-container-low mb-1">
                Switch City
              </div>
              <div class="space-y-0.5">
                ${['Bhavnagar', 'Rajkot', 'Ahmedabad', 'Surat'].map(city => `
                  <button 
                    class="city-option-btn w-full flex items-center justify-between px-3 py-2 rounded-xl font-label-md text-sm font-medium transition-colors ${state.selectedCity === city ? 'bg-primary/10 text-primary font-bold' : 'hover:bg-surface-container text-on-surface'}" 
                    data-city="${city}"
                  >
                    <span>${city}</span>
                    ${state.selectedCity === city ? '<span class="material-symbols-outlined text-[18px] text-primary">check</span>' : ''}
                  </button>
                `).join('')}
              </div>
            </div>
          </div>
        </div>

        <!-- Global Search Field -->
        <div class="flex-1 max-w-xl hidden lg:block">
          <div class="relative flex items-center">
            <span class="material-symbols-outlined absolute left-space-md text-primary text-[20px] pointer-events-none">search</span>
            <input 
              id="header-search-input"
              class="w-full h-11 pl-11 pr-space-md rounded-full bg-surface-container-lowest font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant placeholder:opacity-60 focus:outline-none focus:ring-2 focus:ring-primary shadow-[0_2px_8px_rgba(43,40,37,0.04)]" 
              placeholder="Search 'Gathiya', Takhteshwar, live natak, workshops..." 
              type="text"
              value="${state.searchQuery}"
            />
          </div>
        </div>

        <!-- Navigation Links (Desktop) -->
        <nav class="hidden xl:flex items-center gap-space-xs p-1 bg-surface-container rounded-full">
          <button 
            data-tab="today" 
            class="nav-tab-btn px-space-md py-space-xs rounded-full transition-all ${state.activeTab === 'today' ? 'bg-primary text-on-primary font-bold shadow-[0_4px_12px_rgba(173,44,0,0.2)]' : 'font-label-md text-label-md text-on-surface-variant hover:text-on-surface'}"
          >
            Today
          </button>
          <button 
            data-tab="explore-and-weekend" 
            class="nav-tab-btn px-space-md py-space-xs rounded-full transition-all ${state.activeTab === 'explore-and-weekend' ? 'bg-primary text-on-primary font-bold shadow-[0_4px_12px_rgba(173,44,0,0.2)]' : 'font-label-md text-label-md text-on-surface-variant hover:text-on-surface'}"
          >
            Explore & Weekend
          </button>
          <button 
            data-tab="saved" 
            class="nav-tab-btn px-space-md py-space-xs rounded-full transition-all ${state.activeTab === 'saved' ? 'bg-primary text-on-primary font-bold shadow-[0_4px_12px_rgba(173,44,0,0.2)]' : 'font-label-md text-label-md text-on-surface-variant hover:text-on-surface'}"
          >
            Saved (${savedCount})
          </button>
          <button 
            data-tab="add-event" 
            class="nav-tab-btn px-space-md py-space-xs rounded-full transition-all ${state.activeTab === 'add-event' ? 'bg-primary text-on-primary font-bold shadow-[0_4px_12px_rgba(173,44,0,0.2)]' : 'font-label-md text-label-md text-on-surface-variant hover:text-on-surface'}"
          >
            Add Event
          </button>
        </nav>

        <!-- Right Action CTAs -->
        <div class="flex items-center gap-space-sm shrink-0">
          <button 
            id="header-saved-btn"
            class="p-space-xs rounded-full hover:bg-surface-container-high text-on-surface-variant hover:text-primary transition-colors flex items-center justify-center relative" 
            title="View Saved Events"
          >
            <span class="material-symbols-outlined text-[22px]">favorite</span>
            ${savedCount > 0 ? '<span class="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-primary ring-2 ring-surface"></span>' : ''}
          </button>

  
          <button 
            id="header-profile-btn" 
            class="w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-sm shrink-0 hover:bg-primary-container transition-colors cursor-pointer"
            title="Login / Account"
          >
            <span class="material-symbols-outlined text-on-primary text-[18px]">person</span>
          </button>
        </div>
      </div>
    </header>
  `;
}

export function bindHeaderEvents(container) {
  // Language toggle button
  const langBtn = container.querySelector('#header-lang-btn');
  if (langBtn) {
    langBtn.addEventListener('click', () => store.toggleLanguage());
  }

  // Navigation tabs
  container.querySelectorAll('.nav-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.getAttribute('data-tab');
      store.setActiveTab(tab);
    });
  });

  // Logo button returns to Today
  const logoBtn = container.querySelector('#logo-btn');
  if (logoBtn) {
    logoBtn.addEventListener('click', () => store.setActiveTab('today'));
  }

  // City selection
  container.querySelectorAll('.city-option-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const city = btn.getAttribute('data-city');
      store.setSelectedCity(city);
    });
  });

  // Search input
  const searchInput = container.querySelector('#header-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      store.setSearchQuery(e.target.value);
    });
  }

  // Saved button
  const savedBtn = container.querySelector('#header-saved-btn');
  if (savedBtn) {
    savedBtn.addEventListener('click', () => store.setActiveTab('saved'));
  }

  // Add Listing button
  const addBtn = container.querySelector('#header-add-btn');
  if (addBtn) {
    addBtn.addEventListener('click', () => store.setActiveTab('add-event'));
  }

  // Clear & Seed DB button
  const seedBtn = container.querySelector('#header-seed-btn');
  if (seedBtn) {
    seedBtn.addEventListener('click', () => store.clearAndSeedData());
  }

  // Profile / Login button
  const profileBtn = container.querySelector('#header-profile-btn');
  if (profileBtn) {
    profileBtn.addEventListener('click', () => store.setLoginModalOpen(true));
  }
}
