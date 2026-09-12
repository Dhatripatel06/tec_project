import { store } from '../state/store.js';

// Grid Card (Happening Now & Soon)
export function renderGridCard(event) {
  const isSaved = store.isSaved(event.id);

  return `
    <div class="flex flex-col bg-surface-container-lowest rounded-2xl overflow-hidden shadow-[0_4px_16px_-2px_rgba(43,40,37,0.06)] hover:shadow-lg transition-all group">
      <div class="relative h-48 w-full overflow-hidden">
        <img 
          class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
          alt="${event.title}"
          src="${event.image}"
        />
        <div class="absolute top-3 left-3">
          <span class="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-white font-label-sm text-label-sm font-bold flex items-center gap-1">
            <span class="w-1.5 h-1.5 rounded-full ${event.price === 0 ? 'bg-green-400' : 'bg-amber-400'}"></span>
            ${event.dateText}
          </span>
        </div>
        <button 
          data-event-id="${event.id}"
          class="save-toggle-btn absolute top-3 right-3 w-8 h-8 rounded-full bg-white/80 hover:bg-white text-on-surface flex items-center justify-center backdrop-blur-sm transition-colors spring-press"
        >
          <span class="material-symbols-outlined text-[18px] ${isSaved ? 'text-primary filled' : ''}">
            ${isSaved ? 'favorite' : 'favorite_border'}
          </span>
        </button>
      </div>
      
      <div class="p-space-md flex flex-col flex-1 justify-between">
        <div>
          <div class="flex items-center justify-between mb-1">
            <span class="text-primary font-label-sm text-label-sm font-bold uppercase tracking-wider">${event.categoryName}</span>
            <span class="text-xs px-2 py-0.5 rounded-full ${event.price === 0 ? 'bg-green-100 text-green-800' : 'bg-surface-container text-on-surface'} font-bold">${event.priceText}</span>
          </div>
          <h4 class="font-headline-sm text-headline-sm font-bold text-on-surface leading-tight mb-1">
            ${event.title}
          </h4>
          <p class="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-1">
            <span class="material-symbols-outlined text-[15px] text-tertiary">location_on</span>
            ${event.venue}
          </p>
        </div>
        
        <div class="pt-space-sm mt-space-sm border-t-0 flex items-center justify-between">
          <span class="font-label-sm text-label-sm text-on-surface-variant">${event.status || `${event.interestedCount} interested`}</span>
          <button 
            data-event-id="${event.id}"
            class="card-details-btn px-3 py-1.5 rounded-full ${event.category === 'sports' ? 'bg-primary text-on-primary' : 'bg-surface-container hover:bg-surface-container-high text-on-surface'} font-label-md text-label-md transition-colors spring-press"
          >
            ${event.category === 'sports' ? 'Join Match' : 'Details'}
          </button>
        </div>
      </div>
    </div>
  `;
}

// Large Horizontal Natak Card (This Evening)
export function renderLargeNatakCard(event) {
  const isSaved = store.isSaved(event.id);

  return `
    <div class="bg-surface-container-lowest rounded-3xl overflow-hidden shadow-[0_8px_24px_-4px_rgba(43,40,37,0.08)] group mb-space-md">
      <div class="grid grid-cols-1 md:grid-cols-12">
        <div class="relative md:col-span-5 h-60 md:h-auto overflow-hidden">
          <img 
            class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
            alt="${event.title}"
            src="${event.image}"
          />
          <div class="absolute top-3 left-3">
            <span class="px-3 py-1 rounded-full bg-red-600 text-white font-label-sm text-label-sm font-bold uppercase tracking-wider">
              ${event.status || 'Almost Full'}
            </span>
          </div>
        </div>

        <div class="p-space-md md:p-space-lg md:col-span-7 flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between mb-2">
              <span class="px-2.5 py-1 rounded-full bg-primary-fixed text-on-primary-fixed font-label-sm text-label-sm font-bold">
                🎭 Theater Natak
              </span>
              <span class="font-headline-sm text-headline-sm font-extrabold text-primary">${event.priceText}</span>
            </div>
            <h4 class="font-headline-md text-headline-md font-bold text-on-surface mb-2">
              ${event.title}
            </h4>
            <p class="font-body-sm text-body-sm text-on-surface-variant mb-space-sm line-clamp-2">
              ${event.description}
            </p>
            
            <div class="space-y-1 mb-space-sm font-body-sm text-body-sm text-on-surface">
              <p class="flex items-center gap-2">
                <span class="material-symbols-outlined text-[18px] text-primary">schedule</span>
                <span class="font-bold">${event.dateText}</span> • ${event.venue}
              </p>
              <p class="flex items-center gap-2 text-on-surface-variant">
                <span class="material-symbols-outlined text-[18px]">airline_seat_recline_normal</span>
                Row D & F selling fast
              </p>
            </div>
          </div>

          <div class="flex items-center gap-space-sm pt-space-xs">
            <button 
              data-event-id="${event.id}"
              class="card-details-btn flex-1 py-2.5 px-space-md rounded-full bg-primary hover:bg-primary-container text-on-primary font-label-md text-label-md font-bold shadow-md transition-all spring-press"
            >
              Reserve Seats
            </button>
            
            <button 
              data-event-id="${event.id}"
              class="save-toggle-btn w-10 h-10 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface flex items-center justify-center transition-colors spring-press"
            >
              <span class="material-symbols-outlined text-[20px] ${isSaved ? 'text-primary filled' : ''}">
                ${isSaved ? 'favorite' : 'favorite_border'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

// Horizontal Guide List Card (Food & Workshop)
export function renderGuideListCard(event) {
  const isSaved = store.isSaved(event.id);

  return `
    <div class="flex items-center gap-space-md p-space-sm rounded-2xl bg-surface-container-lowest hover:bg-surface-container-low transition-all shadow-sm group">
      <div class="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden shrink-0">
        <img 
          class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
          alt="${event.title}"
          src="${event.image}"
        />
        <span class="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/70 text-white font-label-sm text-[10px] font-bold">${event.startTime}</span>
      </div>

      <div class="flex-1 min-w-0 pr-2 cursor-pointer card-details-trigger" data-event-id="${event.id}">
        <div class="flex items-center gap-2 mb-1">
          <span class="px-2 py-0.5 rounded-full ${event.category === 'food' ? 'bg-amber-100 text-amber-900' : 'bg-purple-100 text-purple-900'} font-label-sm text-[10px] font-bold uppercase">${event.categoryBadge}</span>
          <span class="text-[11px] ${event.price === 0 ? 'text-green-700 font-bold' : 'text-primary font-bold'}">${event.priceText}</span>
        </div>
        <h5 class="font-headline-sm text-headline-sm font-bold text-on-surface truncate">
          ${event.title}
        </h5>
        <p class="font-body-sm text-body-sm text-on-surface-variant truncate">
          ${event.venue} • ${event.area}
        </p>
        <div class="flex items-center gap-3 mt-1.5 font-label-sm text-label-sm text-on-surface-variant">
          <span class="flex items-center gap-0.5 text-primary font-bold">
            <span class="material-symbols-outlined text-[14px]">local_fire_department</span>
            ${event.status}
          </span>
          <span>• ${event.interestedCount} locals participating</span>
        </div>
      </div>

      <button 
        data-event-id="${event.id}"
        class="save-toggle-btn w-9 h-9 rounded-full bg-surface-container flex items-center justify-center text-on-surface shrink-0 hover:text-primary transition-colors spring-press"
      >
        <span class="material-symbols-outlined text-[18px] ${isSaved ? 'text-primary filled' : ''}">
          ${isSaved ? 'bookmark' : 'bookmark_border'}
        </span>
      </button>
    </div>
  `;
}

// Dark Mode Night Poster Card (Starlight Open Mic)
export function renderStarlightNightCard(event) {
  const isSaved = store.isSaved(event.id);

  return `
    <div class="relative rounded-3xl overflow-hidden bg-inverse-surface text-inverse-on-surface shadow-xl p-space-md sm:p-space-lg mb-space-md">
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-space-md">
        <div class="space-y-space-xs max-w-md">
          <div class="flex items-center gap-2">
            <span class="px-2.5 py-1 rounded-full bg-primary text-white font-label-sm text-label-sm font-bold">
              ☕ Starlight Sessions
            </span>
            <span class="text-xs text-secondary-fixed-dim font-bold">${event.dateText}</span>
          </div>
          
          <h4 class="font-headline-md text-headline-md font-bold text-white">
            ${event.title}
          </h4>
          
          <p class="font-body-sm text-body-sm text-secondary-fixed-dim">
            ${event.description}
          </p>

          <div class="flex items-center gap-3 pt-2 text-[12px] text-white/80">
            <span class="flex items-center gap-1">
              <span class="material-symbols-outlined text-[16px] text-primary-fixed">check_circle</span>
              ${event.priceText}
            </span>
            <span>•</span>
            <span>${event.status}</span>
          </div>
        </div>

        <div class="flex sm:flex-col gap-2 w-full sm:w-auto">
          <button 
            data-event-id="${event.id}"
            class="card-details-btn flex-1 sm:flex-none px-5 py-2.5 rounded-full bg-primary hover:bg-primary-container text-on-primary font-label-md text-label-md font-bold shadow-md transition-all whitespace-nowrap text-center spring-press"
          >
            Register Mic Slot
          </button>

          <button 
            data-event-id="${event.id}"
            class="save-toggle-btn flex-1 sm:flex-none px-4 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white font-label-md text-label-md transition-all text-center spring-press"
          >
            ${isSaved ? 'Saved' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  `;
}

// Evergreen Card
export function renderEvergreenCard(event) {
  return `
    <div 
      data-event-id="${event.id}"
      class="card-details-trigger bg-surface-container-lowest rounded-2xl p-space-sm shadow-sm hover:shadow-md transition-all group cursor-pointer"
    >
      <div class="relative h-32 rounded-xl overflow-hidden mb-2">
        <img 
          class="w-full h-full object-cover group-hover:scale-105 transition-transform" 
          alt="${event.title}"
          src="${event.image}"
        />
        <span class="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/60 text-white text-[10px] font-bold">${event.categoryBadge}</span>
      </div>
      <h5 class="font-label-lg text-label-lg font-bold text-on-surface leading-snug group-hover:text-primary">
        ${event.title}
      </h5>
      <p class="font-body-sm text-body-sm text-on-surface-variant mt-0.5">${event.venue}</p>
    </div>
  `;
}

export function bindEventCardEvents(container) {
  // Save toggle
  container.querySelectorAll('.save-toggle-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-event-id');
      if (id) store.toggleSaveEvent(id);
    });
  });

  // Card detail clicks
  container.querySelectorAll('.card-details-btn, .card-details-trigger').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = el.getAttribute('data-event-id');
      const found = store.events.find(x => x.id === id);
      if (found) store.openEventModal(found);
    });
  });
}
