import { store } from '../state/store.js';
import { renderGridCard, bindEventCardEvents } from './EventCard.js';

export function renderCalendarView() {
  const events = store.getFilteredEvents();

  const daysList = [
    { day: 'Mon', date: '14 Sep', key: 'mon' },
    { day: 'Tue', date: '15 Sep', key: 'tue' },
    { day: 'Wed', date: '16 Sep', key: 'wed' },
    { day: 'Thu', date: '17 Sep', key: 'thu' },
    { day: 'Fri', date: '18 Sep', key: 'fri' },
    { day: 'Sat', date: '19 Sep', key: 'sat' },
    { day: 'Sun', date: '20 Sep', key: 'sun' }
  ];

  return `
    <div class="max-w-[1440px] mx-auto px-margin md:px-margin-desktop py-space-md w-full min-h-[70vh]">
      <!-- Header banner -->
      <div class="mb-space-lg p-space-md sm:p-space-lg rounded-3xl bg-gradient-to-r from-primary-fixed to-surface-container-high">
        <span class="px-3 py-1 rounded-full bg-primary text-on-primary font-label-sm text-label-sm uppercase tracking-wider font-bold">Weekend Discovery</span>
        <h2 class="font-headline-lg text-headline-lg font-bold text-on-surface mt-2">Explore ${store.selectedCity} Calendar & Weekend Plans</h2>
        <p class="font-body-md text-body-md text-on-surface-variant max-w-xl mt-1">
          Plan your Saturday & Sunday. Live nataks, coastal food walks, beach sunrises, and heritage trail passes.
        </p>
      </div>

      <!-- Quick Calendar Date Picker Widget -->
      <div class="p-space-md bg-surface-container-lowest rounded-2xl shadow-sm mb-space-lg">
        <h3 class="font-label-lg text-label-lg font-bold text-on-surface mb-space-sm">Select Target Weekend Date</h3>
        <div class="grid grid-cols-4 sm:grid-cols-7 gap-2">
          ${daysList.map(d => {
            const isWeekend = d.key === 'sat' || d.key === 'sun';
            return `
              <button 
                data-day="${d.key}"
                class="cal-day-btn p-3 rounded-xl border text-center transition-all ${
                  isWeekend 
                    ? 'border-primary bg-primary-fixed/40 text-primary font-bold shadow-sm' 
                    : 'border-outline-variant hover:bg-surface-container text-on-surface'
                }"
              >
                <span class="block font-label-sm text-[11px] uppercase">${d.day}</span>
                <span class="block font-headline-sm text-headline-sm mt-0.5">${d.date.split(' ')[0]}</span>
              </button>
            `;
          }).join('')}
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
      store.setSelectedDate('weekend');
    });
  });
}
