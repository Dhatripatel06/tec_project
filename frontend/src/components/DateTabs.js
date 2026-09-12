import { store } from '../state/store.js';

export function renderDateTabs() {
  const currentDate = store.selectedDate;
  const activeFiltersCount = (store.filters.timeBand !== 'all' ? 1 : 0) + (store.filters.maxPrice !== null ? 1 : 0);

  return `
    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-space-sm mb-space-md">
      <!-- Date Segmented Control -->
      <div class="flex items-center gap-1.5 p-1 bg-surface-container rounded-full shadow-sm overflow-x-auto max-w-full">
        <button 
          data-date="today"
          class="date-pill flex items-center gap-1.5 px-4 py-2 rounded-full font-label-md text-label-md transition-all ${
            currentDate === 'today' 
              ? 'bg-primary text-on-primary font-bold shadow-[0_2px_10px_rgba(173,44,0,0.25)]' 
              : 'text-on-surface-variant hover:text-on-surface'
          }"
        >
          ${currentDate === 'today' ? '<span class="w-2 h-2 rounded-full bg-white animate-pulse"></span>' : ''}
          <span>Today (આજે)</span>
        </button>

        <button 
          data-date="tomorrow"
          class="date-pill flex items-center gap-1.5 px-4 py-2 rounded-full font-label-md text-label-md transition-all ${
            currentDate === 'tomorrow' 
              ? 'bg-primary text-on-primary font-bold shadow-[0_2px_10px_rgba(173,44,0,0.25)]' 
              : 'text-on-surface-variant hover:text-on-surface'
          }"
        >
          <span>Tomorrow (કાલે)</span>
        </button>

        <button 
          data-date="weekend"
          class="date-pill flex items-center gap-1.5 px-4 py-2 rounded-full font-label-md text-label-md transition-all ${
            currentDate === 'weekend' 
              ? 'bg-primary text-on-primary font-bold shadow-[0_2px_10px_rgba(173,44,0,0.25)]' 
              : 'text-on-surface-variant hover:text-on-surface'
          }"
        >
          <span>This Weekend (વીકેન્ડ)</span>
        </button>

        <button 
          data-date="calendar"
          class="date-pill flex items-center gap-1.5 px-3 py-2 rounded-full font-label-md text-label-md transition-all ${
            currentDate === 'calendar' 
              ? 'bg-primary text-on-primary font-bold shadow-[0_2px_10px_rgba(173,44,0,0.25)]' 
              : 'text-on-surface-variant hover:text-on-surface'
          }"
        >
          <span class="material-symbols-outlined text-[18px]">calendar_month</span>
          <span class="hidden md:inline">Calendar</span>
        </button>
      </div>

      <!-- Filter Pill Button & Quick Metric -->
      <div class="flex items-center gap-space-xs w-full sm:w-auto justify-end">
        <button 
          id="open-filter-btn"
          class="flex items-center gap-2 px-space-md py-2.5 rounded-full bg-surface-container-lowest hover:bg-surface-container font-label-md text-label-md text-on-surface shadow-[0_2px_12px_rgba(43,40,37,0.06)] transition-all spring-press"
        >
          <span class="material-symbols-outlined text-primary text-[18px]">tune</span>
          <span class="font-bold">Filters</span>
          ${activeFiltersCount > 0 ? `<span class="px-2 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed text-[11px] font-bold">${activeFiltersCount}</span>` : ''}
        </button>

        <div class="hidden lg:flex items-center gap-1.5 px-3 py-2 rounded-full bg-surface-container text-on-surface-variant font-label-sm text-label-sm">
          <span class="w-2 h-2 rounded-full bg-green-600"></span>
          <span>${store.getFilteredEvents().length} Active Happenings ${store.selectedDate === 'all' ? '' : store.selectedDate === 'tomorrow' ? 'Tomorrow' : store.selectedDate === 'weekend' ? 'This Weekend' : 'Today'}</span>
        </div>
      </div>
    </div>
  `;
}

export function bindDateTabsEvents(container) {
  container.querySelectorAll('.date-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      const dateVal = btn.getAttribute('data-date');
      if (dateVal === 'calendar') {
        store.setActiveTab('explore-and-weekend');
      } else {
        store.setSelectedDate(dateVal);
      }
    });
  });

  const filterBtn = container.querySelector('#open-filter-btn');
  if (filterBtn) {
    filterBtn.addEventListener('click', () => {
      store.setFilterDrawerOpen(true);
    });
  }
}
