import { store } from '../state/store.js';
import { renderGridCard, bindEventCardEvents } from './EventCard.js';

export function renderCalendarView() {
  const events = store.getFilteredEvents();

  return `
    <div class="max-w-[1440px] mx-auto px-margin md:px-margin-desktop py-space-md w-full min-h-[70vh]">
      <!-- Header banner -->
      <div class="mb-space-lg p-space-md sm:p-space-lg rounded-3xl bg-gradient-to-r from-primary-fixed to-surface-container-high">
        <span class="px-3 py-1 rounded-full bg-primary text-on-primary font-label-sm text-label-sm uppercase tracking-wider font-bold">Weekend Discovery</span>
        <h2 class="font-headline-lg text-headline-lg font-bold text-on-surface mt-2">Explore Bhavnagar Calendar & Weekend Plans</h2>
        <p class="font-body-md text-body-md text-on-surface-variant max-w-xl mt-1">
          Plan your Saurashtrian Saturday & Sunday. Live nataks, coastal food walks, beach sunrises, and heritage trail passes.
        </p>
      </div>

      <!-- Quick Calendar Date Picker Widget -->
      <div class="p-space-md bg-surface-container-lowest rounded-2xl shadow-sm mb-space-lg">
        <h3 class="font-label-lg text-label-lg font-bold text-on-surface mb-space-sm">Select Target Weekend Date</h3>
        <div class="grid grid-cols-4 sm:grid-cols-7 gap-2">
          ${[
            { day: 'Mon', date: '14 Sep', active: false },
            { day: 'Tue', date: '15 Sep', active: false },
            { day: 'Wed', date: '16 Sep', active: false },
            { day: 'Thu', date: '17 Sep', active: false },
            { day: 'Fri', date: '18 Sep', active: false },
            { day: 'Sat', date: '19 Sep', active: true },
            { day: 'Sun', date: '20 Sep', active: true }
          ].map(d => `
            <button 
              class="cal-day-btn p-3 rounded-xl border text-center transition-all ${
                d.active 
                  ? 'border-primary bg-primary-fixed/40 text-primary font-bold shadow-sm' 
                  : 'border-outline-variant hover:bg-surface-container text-on-surface'
              }"
            >
              <span class="block font-label-sm text-[11px] uppercase">${d.day}</span>
              <span class="block font-headline-sm text-headline-sm mt-0.5">${d.date.split(' ')[0]}</span>
            </button>
          `).join('')}
        </div>
      </div>

      <!-- Grid feed of weekend events -->
      <div class="mb-space-md flex items-center justify-between">
        <h3 class="font-headline-sm text-headline-sm font-bold text-on-surface">Upcoming Weekend Happenings</h3>
        <span class="font-label-sm text-label-sm text-tertiary font-bold">${events.length} Events Scheduled</span>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-space-md">
        ${events.map(evt => renderGridCard(evt)).join('')}
      </div>
    </div>
  `;
}

export function bindCalendarViewEvents(container) {
  bindEventCardEvents(container);

  container.querySelectorAll('.cal-day-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.cal-day-btn').forEach(b => {
        b.classList.remove('border-primary', 'bg-primary-fixed/40', 'text-primary', 'font-bold');
        b.classList.add('border-outline-variant', 'text-on-surface');
      });
      btn.classList.remove('border-outline-variant', 'text-on-surface');
      btn.classList.add('border-primary', 'bg-primary-fixed/40', 'text-primary', 'font-bold');
      store.setSelectedDate('weekend');
    });
  });
}
