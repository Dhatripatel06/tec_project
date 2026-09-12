import { store } from '../state/store.js';

export function renderLeftRail() {
  const selectedCity = store.selectedCity;

  return `
    <div class="hidden lg:flex lg:col-span-3 flex-col gap-space-md sticky top-48">
      <!-- Hyperlocal Weather Card -->
      <div class="p-space-md rounded-2xl bg-surface-container-lowest shadow-[0_4px_16px_-2px_rgba(43,40,37,0.05)]">
        <div class="flex items-center justify-between mb-space-sm">
          <span class="font-label-sm text-label-sm uppercase tracking-wider text-tertiary font-bold">Hyperlocal Weather</span>
          <span class="flex items-center gap-1 text-[11px] text-green-700 bg-green-100 px-2 py-0.5 rounded-full font-bold">Pleasant Evening</span>
        </div>
        <div class="flex items-center justify-between">
          <div>
            <p class="font-headline-md text-headline-md font-extrabold text-on-surface leading-none">28°C</p>
            <p class="font-body-sm text-body-sm text-on-surface-variant mt-1">Breezy at Ghogha coast</p>
          </div>
          <div class="w-12 h-12 rounded-full bg-primary-fixed/40 flex items-center justify-center text-primary">
            <span class="material-symbols-outlined text-[28px]">air</span>
          </div>
        </div>
        <div class="mt-space-sm pt-space-xs text-[11px] text-on-surface-variant flex items-center gap-1">
          <span class="material-symbols-outlined text-[14px] text-primary">schedule</span>
          Best outdoor time: 5:45 PM – 9:30 PM
        </div>
      </div>

      <!-- Hotspots Quick Filter (Trending Addas) -->
      <div class="p-space-md rounded-2xl bg-surface-container-lowest shadow-[0_4px_16px_-2px_rgba(43,40,37,0.05)]">
        <div class="flex items-center justify-between mb-space-sm">
          <h4 class="font-label-lg text-label-lg font-bold text-on-surface">Trending Addas</h4>
          <span class="font-label-sm text-label-sm text-primary">વિસ્તાર</span>
        </div>
        <div class="space-y-2">
          <button data-search="Waghawadi" class="adda-filter-btn w-full flex items-center justify-between p-2 rounded-xl hover:bg-surface-container-low transition-colors group text-left">
            <div class="flex items-center gap-2">
              <span class="w-2 h-2 rounded-full bg-primary"></span>
              <span class="font-label-md text-label-md text-on-surface group-hover:text-primary">Waghawadi Road</span>
            </div>
            <span class="text-[11px] text-on-surface-variant font-bold">14 events</span>
          </button>

          <button data-search="Nilambag" class="adda-filter-btn w-full flex items-center justify-between p-2 rounded-xl hover:bg-surface-container-low transition-colors group text-left">
            <div class="flex items-center gap-2">
              <span class="w-2 h-2 rounded-full bg-tertiary"></span>
              <span class="font-label-md text-label-md text-on-surface group-hover:text-primary">Nilambag & Crescent</span>
            </div>
            <span class="text-[11px] text-on-surface-variant font-bold">8 events</span>
          </button>

          <button data-search="Ghogha" class="adda-filter-btn w-full flex items-center justify-between p-2 rounded-xl hover:bg-surface-container-low transition-colors group text-left">
            <div class="flex items-center gap-2">
              <span class="w-2 h-2 rounded-full bg-outline"></span>
              <span class="font-label-md text-label-md text-on-surface group-hover:text-primary">Ghogha Circle</span>
            </div>
            <span class="text-[11px] text-on-surface-variant font-bold">7 events</span>
          </button>

          <button data-search="Kaliyabid" class="adda-filter-btn w-full flex items-center justify-between p-2 rounded-xl hover:bg-surface-container-low transition-colors group text-left">
            <div class="flex items-center gap-2">
              <span class="w-2 h-2 rounded-full bg-secondary"></span>
              <span class="font-label-md text-label-md text-on-surface group-hover:text-primary">Kaliyabid Campus</span>
            </div>
            <span class="text-[11px] text-on-surface-variant font-bold">5 events</span>
          </button>
        </div>
      </div>

      <!-- Community Callout Card -->
      <div class="p-space-md rounded-2xl bg-gradient-to-br from-primary-fixed to-surface-container-low text-on-primary-fixed">
        <span class="material-symbols-outlined text-[24px] text-primary mb-1">campaign</span>
        <p class="font-label-md text-label-md font-bold mb-1">Organising an Event in ${selectedCity}?</p>
        <p class="font-body-sm text-body-sm opacity-80 mb-space-sm">Listing is free for local community nataks, garba, or food trails.</p>
        <button id="left-submit-btn" class="inline-flex items-center gap-1 font-label-sm text-label-sm font-extrabold text-primary hover:underline">
          Submit in 2 Minutes ➜
        </button>
      </div>
    </div>
  `;
}

export function bindLeftRailEvents(container) {
  container.querySelectorAll('.adda-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const query = btn.getAttribute('data-search');
      store.setSearchQuery(query);
    });
  });

  const submitBtn = container.querySelector('#left-submit-btn');
  if (submitBtn) {
    submitBtn.addEventListener('click', () => store.setActiveTab('add-event'));
  }
}
