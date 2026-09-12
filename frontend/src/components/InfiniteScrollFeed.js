import { store } from '../state/store.js';
import { renderCategoryChips, bindCategoryChipsEvents } from './CategoryChips.js';
import { renderDateTabs, bindDateTabsEvents } from './DateTabs.js';
import { renderFeaturedHero, bindFeaturedHeroEvents } from './FeaturedHero.js';
import { 
  renderGridCard, 
  renderLargeNatakCard, 
  renderGuideListCard, 
  renderStarlightNightCard, 
  renderEvergreenCard, 
  bindEventCardEvents 
} from './EventCard.js';
import { renderLoadingSkeleton } from './LoadingSkeleton.js';

export function renderInfiniteScrollFeed() {
  const events = store.getFilteredEvents();
  const featuredEvent = events.find(e => e.isFeatured) || events[0];

  // Group events by time band
  const nowEvents = events.filter(e => e.timeBand === 'now');
  const eveningEvents = events.filter(e => e.timeBand === 'evening');
  const nightEvents = events.filter(e => e.timeBand === 'night');
  const evergreenEvents = events.filter(e => e.timeBand === 'evergreen');

  return `
    <div class="max-w-[1440px] mx-auto px-margin md:px-margin-desktop py-space-md w-full">
      <!-- 1. TOP DISCOVERY CONTROLS (Sticky below header) -->
      <div class="sticky top-20 z-40 bg-background/95 backdrop-blur-md py-2 -mx-margin px-margin md:-mx-margin-desktop md:px-margin-desktop border-b border-surface-container-high/60 shadow-sm space-y-space-xs mb-space-lg transition-all">
        ${renderDateTabs()}
        ${renderCategoryChips()}
      </div>

      <!-- 3-COLUMN ASYMMETRIC DESKTOP LAYOUT -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">
        <!-- LEFT RAIL (Col 3) -->
        <div id="left-rail-slot" class="lg:col-span-3"></div>

        <!-- CENTER FEED (Col 6) -->
        <div class="lg:col-span-6 flex flex-col gap-space-xl">
          <!-- 2. FEATURED HERO: "Editor's Pick Today" -->
          ${featuredEvent ? renderFeaturedHero(featuredEvent) : ''}

          <!-- 3. TIME-BANDED FEED -->

          <!-- SECTION A: HAPPENING NOW / STARTING SOON -->
          ${nowEvents.length > 0 ? `
            <section class="space-y-space-md">
              <div class="flex items-center justify-between px-1">
                <div class="flex items-center gap-2">
                  <span class="relative flex h-3 w-3">
                    <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span class="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
                  </span>
                  <h3 class="font-headline-sm text-headline-sm font-extrabold text-on-surface">Happening Now & Soon</h3>
                </div>
                <span class="font-label-sm text-label-sm text-primary font-bold">હમણાં શરૂ થઈ રહ્યું છે</span>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
                ${nowEvents.map(evt => renderGridCard(evt)).join('')}
              </div>
            </section>
          ` : ''}

          <!-- SECTION B: THIS EVENING (6 PM – 9 PM) -->
          ${eveningEvents.length > 0 ? `
            <section class="space-y-space-md">
              <div class="flex items-center justify-between px-1">
                <div class="flex items-center gap-2">
                  <span class="material-symbols-outlined text-primary text-[22px]">wb_twilight</span>
                  <h3 class="font-headline-sm text-headline-sm font-extrabold text-on-surface">This Evening (6 PM – 9 PM)</h3>
                </div>
                <span class="font-label-sm text-label-sm text-on-surface-variant font-bold">આ સાંજે</span>
              </div>

              <!-- Large Featured Theater Natak Card -->
              ${eveningEvents[0] ? renderLargeNatakCard(eveningEvents[0]) : ''}

              <!-- Horizontal Guide List Cards (Food & Workshop) -->
              <div class="space-y-space-sm">
                ${eveningEvents.slice(1).map(evt => renderGuideListCard(evt)).join('')}
              </div>
            </section>
          ` : ''}

          <!-- SECTION C: TONIGHT & LATE NIGHT (9 PM ONWARDS) -->
          ${nightEvents.length > 0 ? `
            <section class="space-y-space-md">
              <div class="flex items-center justify-between px-1">
                <div class="flex items-center gap-2">
                  <span class="material-symbols-outlined text-primary text-[22px]">nights_stay</span>
                  <h3 class="font-headline-sm text-headline-sm font-extrabold text-on-surface">Tonight & Late Night (9 PM+)</h3>
                </div>
                <span class="font-label-sm text-label-sm text-tertiary font-bold">આ રાત્રે</span>
              </div>

              ${nightEvents.map(evt => renderStarlightNightCard(evt)).join('')}
            </section>
          ` : ''}

          <!-- SECTION D: STILL WORTH DOING (Evergreen Local Picks) -->
          ${evergreenEvents.length > 0 ? `
            <section class="space-y-space-md">
              <div class="flex items-center justify-between px-1">
                <div>
                  <h3 class="font-headline-sm text-headline-sm font-extrabold text-on-surface">
                    Still Wondering? Evergreen Local Picks
                  </h3>
                  <p class="font-body-sm text-body-sm text-on-surface-variant">જો બીજું કંઈ ન જડે, તો આ હંમેશા ખુલ્લું છે!</p>
                </div>
                <span class="material-symbols-outlined text-primary text-[24px]">explore</span>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-3 gap-space-sm">
                ${evergreenEvents.map(evt => renderEvergreenCard(evt)).join('')}
              </div>
            </section>
          ` : ''}

          <!-- FALLBACK GENERAL GRID FOR MATCHING EVENTS -->
          ${(nowEvents.length === 0 && eveningEvents.length === 0 && nightEvents.length === 0 && evergreenEvents.length === 0 && events.length > 0) ? `
            <section class="space-y-space-md">
              <div class="flex items-center justify-between px-1">
                <h3 class="font-headline-sm text-headline-sm font-extrabold text-on-surface">Matching Happenings (${events.length})</h3>
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
                ${events.map(evt => renderGridCard(evt)).join('')}
              </div>
            </section>
          ` : ''}

          ${events.length === 0 ? `
            <!-- NO MATCHES EMPTY STATE -->
            <div class="py-space-xl flex flex-col items-center justify-center text-center space-y-space-md bg-surface-container-lowest rounded-3xl p-space-xl shadow-sm my-space-md">
              <div class="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <span class="material-symbols-outlined text-[36px]">search_off</span>
              </div>
              <div>
                <h3 class="font-headline-sm text-headline-sm font-bold text-on-surface">No Happenings Found</h3>
                <p class="font-body-sm text-body-sm text-on-surface-variant max-w-sm mt-1">
                  No local events matched your search or active filter combination. Try clearing filters or switching date tabs!
                </p>
              </div>
              <button 
                id="feed-reset-filters-btn" 
                class="px-space-lg py-3 rounded-full bg-primary hover:bg-primary-container text-on-primary font-label-md text-label-md font-bold transition-all shadow-md spring-press"
              >
                Reset Filters & Search
              </button>
            </div>
          ` : ''}

          <!-- INFINITE SCROLL LOADING SKELETON OR CATCH-UP INDICATOR -->
          ${store.isLoadingMore ? renderLoadingSkeleton() : ''}

          ${!store.hasMoreFeed ? `
            <!-- COMPLETED CATCH-UP STATE -->
            <div class="py-space-lg flex flex-col items-center justify-center text-center space-y-space-sm bg-surface-container-low rounded-3xl p-space-lg shadow-sm">
              <div class="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center text-primary">
                <span class="material-symbols-outlined text-[26px]">task_alt</span>
              </div>
              <div>
                <h4 class="font-headline-sm text-headline-sm font-bold text-on-surface">You're all caught up for Today!</h4>
                <p class="font-body-sm text-body-sm text-on-surface-variant max-w-sm">તમે આજના બધા 38 કાર્યક્રમો જોઈ લીધા છે. કાલનું શેડ્યૂલ તપાસવું છે?</p>
              </div>
              <button 
                id="explore-tomorrow-btn"
                class="mt-2 px-space-lg py-3 rounded-full bg-primary hover:bg-primary-container text-on-primary font-label-md text-label-md font-bold transition-all shadow-md flex items-center gap-2 spring-press"
              >
                <span>Explore Tomorrow's Plan (કાલે શું?)</span>
                <span class="material-symbols-outlined text-[18px]">arrow_forward</span>
              </button>
            </div>
          ` : `
            <div id="infinite-scroll-sentinel" class="h-12 flex items-center justify-center text-on-surface-variant/60 font-label-sm text-label-sm">
              <span>Scroll down to load more events...</span>
            </div>
          `}
        </div>

        <!-- RIGHT SIDEBAR (Col 3) -->
        <div id="right-sidebar-slot" class="lg:col-span-3"></div>
      </div>
    </div>
  `;
}

export function bindInfiniteScrollFeedEvents(container) {
  bindDateTabsEvents(container);
  bindCategoryChipsEvents(container);

  const events = store.getFilteredEvents();
  const featuredEvent = events.find(e => e.isFeatured) || events[0];
  if (featuredEvent) {
    bindFeaturedHeroEvents(container, featuredEvent);
  }

  bindEventCardEvents(container);

  const tomorrowBtn = container.querySelector('#explore-tomorrow-btn');
  if (tomorrowBtn) {
    tomorrowBtn.addEventListener('click', () => store.setSelectedDate('tomorrow'));
  }

  const resetBtn = container.querySelector('#feed-reset-filters-btn');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      store.resetFilters();
      store.setSelectedDate('today');
      store.setSelectedCategory('all');
      store.setSearchQuery('');
    });
  }

  // Infinite Scroll Observer
  const sentinel = container.querySelector('#infinite-scroll-sentinel');
  if (sentinel && window.IntersectionObserver) {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        store.loadMoreEvents();
      }
    }, { rootMargin: '200px' });
    observer.observe(sentinel);
  }
}
