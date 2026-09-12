import { store } from '../state/store.js';

export function renderEventDetailModal() {
  const event = store.activeModalEvent;
  if (!event) return '<div id="quick-view-modal" class="hidden"></div>';

  const isSaved = store.isSaved(event.id);

  return `
    <div 
      id="quick-view-modal" 
      class="fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-300 opacity-100"
    >
      <!-- Backdrop -->
      <div 
        id="modal-backdrop" 
        class="absolute inset-0 bg-on-background/50 backdrop-blur-md pointer-events-auto cursor-pointer"
      ></div>

      <!-- Modal Box -->
      <div class="relative w-full max-w-xl bg-surface-container-lowest rounded-3xl shadow-2xl overflow-hidden pointer-events-auto transform scale-100 transition-all duration-300 max-h-[90vh] flex flex-col z-10">
        <!-- Hero Banner Image -->
        <div class="relative h-64 w-full shrink-0">
          <img 
            class="w-full h-full object-cover" 
            alt="${event.title}" 
            src="${event.image}"
          />
          <div class="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent"></div>
          
          <button 
            id="close-modal-btn" 
            class="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 backdrop-blur-sm transition-all"
          >
            <span class="material-symbols-outlined text-[20px]">close</span>
          </button>

          <div class="absolute bottom-4 left-4 right-4 text-white">
            <span class="px-3 py-1 rounded-full bg-primary text-white font-label-sm text-label-sm uppercase tracking-wider font-bold">
              ${event.status || 'Editor\'s Pick Today'}
            </span>
            <h2 class="font-headline-md text-headline-md font-bold text-white mt-1 leading-tight">
              ${event.title}
            </h2>
            <p class="font-body-sm text-body-sm text-white/80">
              ${event.venue}, ${event.address || 'Bhavnagar'}
            </p>
          </div>
        </div>

        <!-- Scrollable Modal Content -->
        <div class="p-space-md space-y-space-md overflow-y-auto flex-1">
          <!-- Time & Price Bar -->
          <div class="flex items-center justify-between p-3 rounded-2xl bg-surface-container-low">
            <div class="flex items-center gap-3">
              <span class="material-symbols-outlined text-primary text-[24px]">schedule</span>
              <div>
                <p class="font-label-md text-label-md font-bold text-on-surface">${event.dateText}</p>
                <p class="font-body-sm text-body-sm text-on-surface-variant">Doors open 30 mins prior • 120 mins</p>
              </div>
            </div>

            <div class="text-right">
              <p class="font-headline-sm text-headline-sm font-bold text-primary">${event.priceText}</p>
              <p class="font-label-sm text-label-sm text-tertiary">Onwards</p>
            </div>
          </div>

          <!-- Description -->
          <p class="font-body-md text-body-md text-on-surface-variant leading-relaxed">
            ${event.description}
          </p>

          <!-- Organizer Info -->
          <div class="p-3 rounded-xl bg-surface-container flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-primary text-[20px]">verified</span>
              <div>
                <p class="font-label-sm text-label-sm text-on-surface-variant uppercase">Organised By</p>
                <p class="font-label-md text-label-md font-bold text-on-surface">${event.organizer || 'Bhavnagar Local Guild'}</p>
              </div>
            </div>
            <span class="font-label-sm text-label-sm text-primary font-bold">${event.interestedCount} People Going</span>
          </div>

          <!-- Quick Actions Row -->
          <div class="flex items-center gap-3">
            <button 
              id="modal-share-wa" 
              class="flex-1 py-3 px-4 rounded-xl bg-surface-container hover:bg-surface-container-high flex items-center justify-center gap-2 font-label-md text-label-md text-on-surface transition-all"
            >
              <span class="material-symbols-outlined text-[18px] text-green-600">chat</span>
              Share WhatsApp
            </button>

            <button 
              id="modal-open-maps" 
              class="flex-1 py-3 px-4 rounded-xl bg-surface-container hover:bg-surface-container-high flex items-center justify-center gap-2 font-label-md text-label-md text-on-surface transition-all"
            >
              <span class="material-symbols-outlined text-[18px] text-primary">directions</span>
              Open Maps
            </button>
          </div>

          <!-- Main CTA Button -->
          <button 
            id="modal-book-cta" 
            class="w-full py-3.5 px-space-md bg-primary hover:bg-primary-container text-on-primary rounded-xl font-label-lg text-label-lg font-bold transition-all shadow-lg flex items-center justify-center gap-2 spring-press"
          >
            <span class="material-symbols-outlined text-[20px]">confirmation_number</span>
            Book Passes (${event.priceText})
          </button>
        </div>
      </div>
    </div>
  `;
}

export function bindEventDetailModalEvents(container) {
  const event = store.activeModalEvent;
  if (!event) return;

  const closeBtn = container.querySelector('#close-modal-btn');
  const backdrop = container.querySelector('#modal-backdrop');
  const shareWa = container.querySelector('#modal-share-wa');
  const openMaps = container.querySelector('#modal-open-maps');
  const bookCta = container.querySelector('#modal-book-cta');

  if (closeBtn) closeBtn.addEventListener('click', () => store.closeEventModal());
  if (backdrop) backdrop.addEventListener('click', () => store.closeEventModal());

  if (shareWa) {
    shareWa.addEventListener('click', () => {
      const text = encodeURIComponent(`Check out ${event.title} in Bhavnagar! ${event.venue} • ${event.priceText}`);
      window.open(`https://wa.me/?text=${text}`, '_blank');
    });
  }

  if (openMaps) {
    openMaps.addEventListener('click', () => {
      const q = encodeURIComponent(`${event.venue}, ${event.address || 'Bhavnagar, Gujarat'}`);
      window.open(`https://maps.google.com/?q=${q}`, '_blank');
    });
  }

  if (bookCta) {
    bookCta.addEventListener('click', () => {
      store.showToast(`🎉 Pass Booking Confirmed for ${event.title}! (Mock Ticket Issued)`);
      store.closeEventModal();
    });
  }
}
