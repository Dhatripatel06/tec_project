import { store } from '../state/store.js';
import { renderGridCard, bindEventCardEvents } from './EventCard.js';

export function renderSavedScreen() {
  const savedEvents = store.getSavedEvents();

  return `
    <div class="max-w-[1440px] mx-auto px-margin md:px-margin-desktop py-space-md w-full min-h-[70vh]">
      <!-- Title Bar -->
      <div class="flex items-center justify-between mb-space-lg p-space-md rounded-2xl bg-surface-container-lowest shadow-sm">
        <div>
          <h2 class="font-headline-md text-headline-md font-bold text-on-surface">Your Saved Happenings</h2>
          <p class="font-body-sm text-body-sm text-on-surface-variant">તમારા સાચવેલા કાર્યક્રમો (${savedEvents.length} items)</p>
        </div>

        <button 
          id="saved-back-today-btn" 
          class="px-4 py-2 rounded-full bg-surface-container hover:bg-surface-container-high font-label-md text-label-md text-on-surface transition-colors flex items-center gap-1"
        >
          <span class="material-symbols-outlined text-[18px]">arrow_back</span>
          <span>Back to Today Feed</span>
        </button>
      </div>

      ${savedEvents.length === 0 ? `
        <!-- Empty State -->
        <div class="py-space-xl flex flex-col items-center justify-center text-center space-y-space-md bg-surface-container-lowest rounded-3xl p-space-xl shadow-sm my-space-lg">
          <div class="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <span class="material-symbols-outlined text-[36px]">bookmark_border</span>
          </div>
          <div>
            <h3 class="font-headline-sm text-headline-sm font-bold text-on-surface">No Saved Events Yet</h3>
            <p class="font-body-sm text-body-sm text-on-surface-variant max-w-sm mt-1">
              Tap the heart or bookmark icon on any event card in the feed to save it for quick offline access!
            </p>
          </div>
          <button 
            id="saved-explore-now-btn" 
            class="px-space-lg py-3 rounded-full bg-primary hover:bg-primary-container text-on-primary font-label-md text-label-md font-bold transition-all shadow-md spring-press"
          >
            Explore Today's Feed
          </button>
        </div>
      ` : `
        <!-- Saved Grid -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-space-md">
          ${savedEvents.map(evt => renderGridCard(evt)).join('')}
        </div>
      `}
    </div>
  `;
}

export function bindSavedScreenEvents(container) {
  bindEventCardEvents(container);

  const backBtn = container.querySelector('#saved-back-today-btn');
  if (backBtn) {
    backBtn.addEventListener('click', () => store.setActiveTab('today'));
  }

  const exploreBtn = container.querySelector('#saved-explore-now-btn');
  if (exploreBtn) {
    exploreBtn.addEventListener('click', () => store.setActiveTab('today'));
  }
}
