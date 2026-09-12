import { store } from '../state/store.js';

export function renderFilterDrawer() {
  const isOpen = store.filterDrawerOpen;
  const f = store.filters;

  return `
    <div 
      id="filter-drawer" 
      class="fixed inset-0 z-50 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'}"
    >
      <!-- Backdrop -->
      <div 
        id="filter-backdrop" 
        class="absolute inset-0 bg-on-background/40 backdrop-blur-sm pointer-events-auto cursor-pointer"
      ></div>

      <!-- Drawer Panel -->
      <div class="absolute bottom-0 md:top-0 md:right-0 md:bottom-auto w-full md:w-[460px] h-[85vh] md:h-full bg-surface-container-lowest shadow-2xl flex flex-col pointer-events-auto rounded-t-3xl md:rounded-l-3xl md:rounded-tr-none transform transition-transform duration-300 ease-out z-10 ${
        isOpen ? 'translate-y-0 md:translate-x-0' : 'translate-y-full md:translate-x-full'
      }">
        <!-- Header -->
        <div class="p-space-md flex items-center justify-between border-b-0">
          <div class="flex items-center gap-space-sm">
            <div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <span class="material-symbols-outlined text-[22px]">tune</span>
            </div>
            <div>
              <h3 class="font-headline-sm text-headline-sm font-bold text-on-surface">Filters & Preferences</h3>
              <p class="font-body-sm text-body-sm text-on-surface-variant">ગાળકો (Customized search)</p>
            </div>
          </div>
          <button id="close-filter-btn" class="w-9 h-9 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant">
            <span class="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <!-- Body Scrollable Content -->
        <div class="flex-1 overflow-y-auto px-space-md py-space-sm space-y-space-lg">
          <!-- Time of Day -->
          <div>
            <label class="font-label-md text-label-md uppercase tracking-wider text-on-surface-variant mb-space-xs block">Time of Day (સમય)</label>
            <div class="flex flex-wrap gap-space-xs">
              <button 
                data-time="all" 
                class="time-filter-btn px-space-md py-2 rounded-full font-label-md text-label-md ${f.timeBand === 'all' ? 'bg-primary text-on-primary shadow-sm' : 'bg-surface-container text-on-surface-variant hover:text-on-surface'}"
              >
                All Day
              </button>
              <button 
                data-time="now" 
                class="time-filter-btn px-space-md py-2 rounded-full font-label-md text-label-md ${f.timeBand === 'now' ? 'bg-primary text-on-primary shadow-sm' : 'bg-surface-container text-on-surface-variant hover:text-on-surface'}"
              >
                Right Now (હમણાં)
              </button>
              <button 
                data-time="evening" 
                class="time-filter-btn px-space-md py-2 rounded-full font-label-md text-label-md ${f.timeBand === 'evening' ? 'bg-primary text-on-primary shadow-sm' : 'bg-surface-container text-on-surface-variant hover:text-on-surface'}"
              >
                This Evening (6 - 9 PM)
              </button>
              <button 
                data-time="night" 
                class="time-filter-btn px-space-md py-2 rounded-full font-label-md text-label-md ${f.timeBand === 'night' ? 'bg-primary text-on-primary shadow-sm' : 'bg-surface-container text-on-surface-variant hover:text-on-surface'}"
              >
                Late Night (9 PM+)
              </button>
            </div>
          </div>

          <!-- Price Range -->
          <div>
            <label class="font-label-md text-label-md uppercase tracking-wider text-on-surface-variant mb-space-xs block">Budget (પ્રવેશ ફી)</label>
            <div class="grid grid-cols-3 gap-space-xs">
              <button 
                data-price="0"
                class="price-filter-btn py-2.5 px-3 rounded-xl ${f.maxPrice === 0 ? 'bg-primary-fixed text-on-primary-fixed ring-2 ring-primary' : 'bg-surface-container-low hover:bg-surface-container text-on-surface'} text-center font-label-md text-label-md"
              >
                <span class="block font-bold">Free Entry</span>
                <span class="text-[10px] text-primary">મફત પ્રવેશ</span>
              </button>
              <button 
                data-price="300"
                class="price-filter-btn py-2.5 px-3 rounded-xl ${f.maxPrice === 300 ? 'bg-primary-fixed text-on-primary-fixed ring-2 ring-primary' : 'bg-surface-container-low hover:bg-surface-container text-on-surface'} text-center font-label-md text-label-md shadow-sm"
              >
                <span class="block font-bold">Under ₹300</span>
                <span class="text-[10px] text-tertiary">સસ્તું અને મજાનું</span>
              </button>
              <button 
                data-price="null"
                class="price-filter-btn py-2.5 px-3 rounded-xl ${f.maxPrice === null ? 'bg-primary-fixed text-on-primary-fixed ring-2 ring-primary' : 'bg-surface-container-low hover:bg-surface-container text-on-surface'} text-center font-label-md text-label-md"
              >
                <span class="block font-bold">Any Price</span>
                <span class="text-[10px] text-on-surface-variant">બધા જ</span>
              </button>
            </div>
          </div>

          <!-- Distance Radius -->
          <div>
            <div class="flex justify-between items-center mb-space-xs">
              <label class="font-label-md text-label-md uppercase tracking-wider text-on-surface-variant">Distance Radius</label>
              <span class="font-label-md text-label-md font-bold text-primary">Within ${f.maxDistance} km</span>
            </div>
            <div class="flex gap-space-xs">
              <button data-distance="3" class="distance-filter-btn flex-1 py-2 rounded-lg ${f.maxDistance === 3 ? 'bg-primary text-on-primary font-bold' : 'bg-surface-container text-on-surface-variant'} font-label-md text-label-md text-center">&lt; 3 km</button>
              <button data-distance="8" class="distance-filter-btn flex-1 py-2 rounded-lg ${f.maxDistance === 8 ? 'bg-primary text-on-primary font-bold' : 'bg-surface-container text-on-surface-variant'} font-label-md text-label-md text-center">8 km (City Hub)</button>
              <button data-distance="15" class="distance-filter-btn flex-1 py-2 rounded-lg ${f.maxDistance === 15 ? 'bg-primary text-on-primary font-bold' : 'bg-surface-container text-on-surface-variant'} font-label-md text-label-md text-center">All Bhavnagar</button>
            </div>
          </div>

          <!-- Special Badges / Amenities -->
          <div>
            <label class="font-label-md text-label-md uppercase tracking-wider text-on-surface-variant mb-space-xs block">Experience Vibe</label>
            <div class="space-y-2">
              <label class="flex items-center justify-between p-space-sm rounded-xl bg-surface-container-low cursor-pointer">
                <span class="flex items-center gap-2 font-body-md text-body-md text-on-surface">
                  <span class="material-symbols-outlined text-primary text-[20px]">family_restroom</span>
                  Family Friendly (કુટુંબ સાથે)
                </span>
                <input id="family-check" type="checkbox" ${f.familyFriendly ? 'checked' : ''} class="w-5 h-5 accent-primary rounded cursor-pointer"/>
              </label>

              <label class="flex items-center justify-between p-space-sm rounded-xl bg-surface-container-low cursor-pointer">
                <span class="flex items-center gap-2 font-body-md text-body-md text-on-surface">
                  <span class="material-symbols-outlined text-primary text-[20px]">ac_unit</span>
                  Air Conditioned Indoor Venue
                </span>
                <input id="ac-check" type="checkbox" ${f.acIndoor ? 'checked' : ''} class="w-5 h-5 accent-primary rounded cursor-pointer"/>
              </label>

              <label class="flex items-center justify-between p-space-sm rounded-xl bg-surface-container-low cursor-pointer">
                <span class="flex items-center gap-2 font-body-md text-body-md text-on-surface">
                  <span class="material-symbols-outlined text-primary text-[20px]">local_cafe</span>
                  Kathiyawadi Street Food On-Site
                </span>
                <input id="food-check" type="checkbox" ${f.foodOnSite ? 'checked' : ''} class="w-5 h-5 accent-primary rounded cursor-pointer"/>
              </label>
            </div>
          </div>
        </div>

        <!-- Footer Actions -->
        <div class="p-space-md bg-surface-container-low flex items-center gap-space-md">
          <button id="reset-filters-btn" class="px-space-md py-3 font-label-md text-label-md text-on-surface-variant hover:text-on-surface">Clear All</button>
          <button id="apply-filters-btn" class="flex-1 py-3 px-space-md bg-primary hover:bg-primary-container text-on-primary rounded-xl font-label-lg text-label-lg font-bold transition-all shadow-md">Show 38 Happenings</button>
        </div>
      </div>
    </div>
  `;
}

export function bindFilterDrawerEvents(container) {
  const closeBtn = container.querySelector('#close-filter-btn');
  const backdrop = container.querySelector('#filter-backdrop');
  const resetBtn = container.querySelector('#reset-filters-btn');
  const applyBtn = container.querySelector('#apply-filters-btn');

  if (closeBtn) closeBtn.addEventListener('click', () => store.setFilterDrawerOpen(false));
  if (backdrop) backdrop.addEventListener('click', () => store.setFilterDrawerOpen(false));

  // Time buttons
  container.querySelectorAll('.time-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const time = btn.getAttribute('data-time');
      store.updateFilters({ timeBand: time });
    });
  });

  // Price buttons
  container.querySelectorAll('.price-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const p = btn.getAttribute('data-price');
      store.updateFilters({ maxPrice: p === 'null' ? null : Number(p) });
    });
  });

  // Distance buttons
  container.querySelectorAll('.distance-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const dist = Number(btn.getAttribute('data-distance'));
      store.updateFilters({ maxDistance: dist });
    });
  });

  // Checkboxes
  const familyCheck = container.querySelector('#family-check');
  if (familyCheck) {
    familyCheck.addEventListener('change', (e) => store.updateFilters({ familyFriendly: e.target.checked }));
  }

  const acCheck = container.querySelector('#ac-check');
  if (acCheck) {
    acCheck.addEventListener('change', (e) => store.updateFilters({ acIndoor: e.target.checked }));
  }

  const foodCheck = container.querySelector('#food-check');
  if (foodCheck) {
    foodCheck.addEventListener('change', (e) => store.updateFilters({ foodOnSite: e.target.checked }));
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', () => store.resetFilters());
  }

  if (applyBtn) {
    applyBtn.addEventListener('click', () => store.setFilterDrawerOpen(false));
  }
}
