import { store } from './state/store.js';
import { renderHeader, bindHeaderEvents } from './components/Header.js';
import { renderBottomNavigation, bindBottomNavigationEvents } from './components/BottomNavigation.js';
import { renderLeftRail, bindLeftRailEvents } from './components/LeftRail.js';
import { renderRightSidebar, bindRightSidebarEvents } from './components/RightSidebar.js';
import { renderInfiniteScrollFeed, bindInfiniteScrollFeedEvents } from './components/InfiniteScrollFeed.js';
import { renderCalendarView, bindCalendarViewEvents } from './components/CalendarView.js';
import { renderSavedScreen, bindSavedScreenEvents } from './components/SavedScreen.js';
import { renderSubmitListingScreen, bindSubmitListingEvents } from './components/SubmitListingScreen.js';
import { renderFilterDrawer, bindFilterDrawerEvents } from './components/FilterDrawer.js';
import { renderEventDetailModal, bindEventDetailModalEvents } from './components/EventDetailModal.js';

function renderApp() {
  const appContainer = document.getElementById('app');
  if (!appContainer) return;

  const activeTab = store.activeTab;

  appContainer.innerHTML = `
    <!-- Header -->
    <div id="header-root">
      ${renderHeader()}
    </div>

    <!-- Main Viewport Canvas -->
    <main class="w-full pt-20 bg-background min-h-[calc(100vh-80px)] pb-24 md:pb-0">
      <div class="flex flex-col w-full">
        <!-- Interactive Filter Drawer -->
        <div id="filter-drawer-root">
          ${renderFilterDrawer()}
        </div>

        <!-- Event Quick View Modal -->
        <div id="event-modal-root">
          ${renderEventDetailModal()}
        </div>

        <!-- Main Screen Router Container -->
        <div id="main-content-root" class="w-full">
          ${
            activeTab === 'today' 
              ? renderInfiniteScrollFeed()
              : activeTab === 'explore-and-weekend'
                ? renderCalendarView()
                : activeTab === 'saved'
                  ? renderSavedScreen()
                  : activeTab === 'add-event'
                    ? renderSubmitListingScreen()
                    : renderInfiniteScrollFeed()
          }
        </div>
      </div>
    </main>

    <!-- Mobile Bottom Navigation -->
    <div id="bottom-nav-root">
      ${renderBottomNavigation()}
    </div>

    <!-- Footer matching Google Stitch Design -->
    <footer class="w-full bg-surface-container-lowest mt-space-xl border-t border-surface-container-high">
      <div class="max-w-[1440px] mx-auto px-margin md:px-margin-desktop py-space-xl">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-space-lg mb-space-xl">
          <div class="md:col-span-2">
            <div class="flex items-center gap-space-xs mb-space-sm">
              <img 
                alt="Aaje Su? Brand Logo" 
                class="h-7 w-auto object-contain" 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuACMH9AjFrfo0rsl_vhZRsVanXCo7K1DiFaIkMNFh0kypibitPgbUjBoNgYOLY0gRXw49TmEr9IyApHOcN3pDv1X0CqQ2fI7QOczpDfI7qPQZWGOSG-g1NGMH1bN5NesJiXcoFbeIQICFL7_WpQxuJFAVUIZnZ8qbkg0mbeMEejJ0fF8Ex9uTSY3DLZtuv0mVCKMKxzSMpPIs4vC0BjKPz7zeS_vlOlagGa1e6wN4cgy1KyEwgIOa0yQw"
              />
              <span class="font-headline-sm text-headline-sm font-bold text-primary">આજે શું?</span>
            </div>
            <p class="font-body-md text-body-md text-on-surface-variant max-w-md">
              Bhavnagar's hyperlocal pulse. Real-time community happenings, Saurashtrian street food trails, coastal weekend getaways, Gujarati theatre, and heritage walks.
            </p>
            <div class="flex items-center gap-space-sm mt-space-md">
              <span class="px-space-sm py-space-xs rounded-full bg-surface-container font-label-sm text-label-sm text-on-surface-variant">📍 Takhteshwar</span>
              <span class="px-space-sm py-space-xs rounded-full bg-surface-container font-label-sm text-label-sm text-on-surface-variant">🌊 Ghogha</span>
              <span class="px-space-sm py-space-xs rounded-full bg-surface-container font-label-sm text-label-sm text-on-surface-variant">🌳 Victoria Park</span>
            </div>
          </div>

          <div>
            <h4 class="font-label-lg text-label-lg font-bold text-on-surface mb-space-sm">Top Zones</h4>
            <ul class="space-y-space-xs font-body-sm text-body-sm text-on-surface-variant">
              <li><button class="footer-zone-btn hover:text-primary transition-colors" data-zone="Waghawadi">Waghawadi Road Evening Stroll</button></li>
              <li><button class="footer-zone-btn hover:text-primary transition-colors" data-zone="Nilambag">Nilambag Heritage & Cafes</button></li>
              <li><button class="footer-zone-btn hover:text-primary transition-colors" data-zone="Ghogha">Ghogha Circle Night Addas</button></li>
              <li><button class="footer-zone-btn hover:text-primary transition-colors" data-zone="Kaliyabid">Kaliyabid Student Hub</button></li>
            </ul>
          </div>

          <div>
            <h4 class="font-label-lg text-label-lg font-bold text-on-surface mb-space-sm">Community & Organisers</h4>
            <ul class="space-y-space-xs font-body-sm text-body-sm text-on-surface-variant">
              <li><button id="footer-add-event-btn" class="hover:text-primary transition-colors">Submit Local Natak or Sabha</button></li>
              <li><a class="hover:text-primary transition-colors" href="https://wa.me/?text=Hi%20Aaje%20Su%20Team" target="_blank">Host a Food Pop-up</a></li>
              <li><a class="hover:text-primary transition-colors" href="#">Bhavnagar Heritage Guild</a></li>
              <li><a class="hover:text-primary transition-colors" href="#">Help & WhatsApp Helpline</a></li>
            </ul>
          </div>
        </div>

        <div class="pt-space-md border-t border-surface-container-high flex flex-col sm:flex-row items-center justify-between gap-space-sm">
          <p class="font-label-sm text-label-sm text-on-surface-variant">© 2025 Aaje Su? Made with Saurashtrian warmth for Bhavnagar, Gujarat.</p>
          <div class="flex items-center gap-space-md font-label-sm text-label-sm text-on-surface-variant">
            <a class="hover:text-on-surface" href="#">Privacy</a>
            <a class="hover:text-on-surface" href="#">Terms</a>
            <a class="hover:text-on-surface" href="#">Local Transit Links</a>
          </div>
        </div>
      </div>
    </footer>
  `;

  // Bind Event Listeners
  bindHeaderEvents(appContainer);
  bindBottomNavigationEvents(appContainer);
  bindFilterDrawerEvents(appContainer);
  bindEventDetailModalEvents(appContainer);

  if (activeTab === 'today') {
    bindInfiniteScrollFeedEvents(appContainer);

    // Mount Left & Right Rails in feed
    const leftSlot = appContainer.querySelector('#left-rail-slot');
    if (leftSlot) {
      leftSlot.innerHTML = renderLeftRail();
      bindLeftRailEvents(leftSlot);
    }

    const rightSlot = appContainer.querySelector('#right-sidebar-slot');
    if (rightSlot) {
      rightSlot.innerHTML = renderRightSidebar();
      bindRightSidebarEvents(rightSlot);
    }
  } else if (activeTab === 'explore-and-weekend') {
    bindCalendarViewEvents(appContainer);
  } else if (activeTab === 'saved') {
    bindSavedScreenEvents(appContainer);
  } else if (activeTab === 'add-event') {
    bindSubmitListingEvents(appContainer);
  }

  // Footer events
  appContainer.querySelectorAll('.footer-zone-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const zone = btn.getAttribute('data-zone');
      store.setSearchQuery(zone);
      store.setActiveTab('today');
    });
  });

  const footerAddBtn = appContainer.querySelector('#footer-add-event-btn');
  if (footerAddBtn) {
    footerAddBtn.addEventListener('click', () => store.setActiveTab('add-event'));
  }
}

// Subscribe renderer to state store changes
store.subscribe(() => {
  renderApp();
});

// Initial mount
document.addEventListener('DOMContentLoaded', () => {
  renderApp();
});

if (document.readyState === 'complete' || document.readyState === 'interactive') {
  renderApp();
}
