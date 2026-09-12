import { store } from '../state/store.js';

export function renderFeaturedHero(event) {
  if (!event) return '';
  const isSaved = store.isSaved(event.id);

  return `
    <section class="w-full mb-space-lg">
      <div class="flex items-center justify-between mb-space-xs px-1">
        <div class="flex items-center gap-2">
          <span class="material-symbols-outlined text-primary text-[20px]">local_fire_department</span>
          <h2 class="font-headline-sm text-headline-sm font-extrabold text-on-surface">Editor's Pick Today</h2>
        </div>
        <span class="font-label-sm text-label-sm text-tertiary font-bold tracking-wider uppercase">સંપાદકની પસંદ</span>
      </div>

      <!-- Hero Immersive Poster Card -->
      <div class="quick-view-trigger group relative rounded-3xl overflow-hidden bg-surface-container shadow-[0_12px_32px_-4px_rgba(173,44,0,0.15)] transition-all cursor-pointer" data-event-id="${event.id}">
        <div class="relative w-full aspect-[4/3] sm:aspect-[16/10] overflow-hidden">
          <img 
            class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out" 
            alt="${event.title}"
            src="${event.image}"
          />
          <!-- Scrim gradient for contrast -->
          <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-transparent"></div>

          <!-- Top floating action row -->
          <div class="absolute top-4 left-4 right-4 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="px-3 py-1.5 rounded-full bg-primary text-on-primary font-label-xs text-[11px] font-extrabold uppercase tracking-wider shadow-md flex items-center gap-1">
                <span class="material-symbols-outlined text-[14px]">stars</span>
                Editor's Pick
              </span>
              <span class="px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-md text-white font-label-xs text-[11px] font-bold">
                ${event.dateText}
              </span>
            </div>

            <div class="flex items-center gap-2">
              <button 
                data-event-id="${event.id}"
                class="save-toggle-btn w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md text-white flex items-center justify-center transition-all spring-press z-10"
                title="Save event"
              >
                <span class="material-symbols-outlined text-[20px] ${isSaved ? 'text-primary filled' : ''}">
                  ${isSaved ? 'favorite' : 'favorite_border'}
                </span>
              </button>
              
              <button 
                data-event-id="${event.id}"
                class="share-btn w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md text-white flex items-center justify-center transition-all spring-press z-10"
                title="Share on WhatsApp"
              >
                <span class="material-symbols-outlined text-[20px]">share</span>
              </button>
            </div>
          </div>

          <!-- Bottom Content Over Scrim -->
          <div class="absolute bottom-0 left-0 right-0 p-space-md sm:p-space-lg text-white">
            <div class="flex items-center gap-2 mb-2">
              <span class="px-2.5 py-0.5 rounded-md bg-white/20 backdrop-blur-md text-[11px] font-bold uppercase tracking-wider">${event.categoryBadge || 'Featured'}</span>
              <span class="text-xs text-white/80">• ${event.venue}</span>
            </div>
            <h3 class="font-headline-lg font-bold text-white leading-tight mb-2 drop-shadow-sm">
              ${event.title}
            </h3>
            <p class="font-body-sm text-body-sm text-white/90 line-clamp-2 max-w-xl mb-space-sm drop-shadow">
              ${event.description}
            </p>

            <!-- Micro Stats & Quick View CTA -->
            <div class="flex flex-wrap items-center justify-between gap-space-sm pt-space-xs">
              <div class="flex items-center gap-3">
                <div class="flex -space-x-2">
                  <div class="w-7 h-7 rounded-full bg-primary-fixed text-on-primary-fixed flex items-center justify-center text-[10px] font-bold ring-2 ring-black">JM</div>
                  <div class="w-7 h-7 rounded-full bg-tertiary-fixed text-on-tertiary-fixed flex items-center justify-center text-[10px] font-bold ring-2 ring-black">PK</div>
                  <div class="w-7 h-7 rounded-full bg-surface-container text-on-surface flex items-center justify-center text-[10px] font-bold ring-2 ring-black">+40</div>
                </div>
                <span class="font-label-sm text-label-sm text-white/90 font-medium">42 people planning to go</span>
              </div>

              <div class="flex items-center gap-2">
                <span class="font-headline-sm text-headline-sm font-extrabold text-primary-fixed">${event.priceText}</span>
                <button 
                  data-event-id="${event.id}"
                  class="quick-view-trigger px-4 py-2 rounded-full bg-primary hover:bg-primary-container text-on-primary font-label-md text-label-md font-bold transition-all shadow-md flex items-center gap-1 spring-press"
                >
                  <span>Quick View</span>
                  <span class="material-symbols-outlined text-[16px]">arrow_forward</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  `;
}

export function bindFeaturedHeroEvents(container, event) {
  if (!event) return;

  const shareBtn = container.querySelector('.share-btn');
  if (shareBtn) {
    shareBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const text = encodeURIComponent(`Check out ${event.title} in Bhavnagar tonight! ${event.venue} • ${event.priceText}`);
      window.open(`https://wa.me/?text=${text}`, '_blank');
    });
  }

  container.querySelectorAll('.quick-view-trigger').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      store.openEventModal(event);
    });
  });
}

