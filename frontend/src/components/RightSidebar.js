import { store } from '../state/store.js';

export function renderRightSidebar() {
  const selectedCity = store.selectedCity;

  return `
    <div class="hidden lg:flex lg:col-span-3 flex-col gap-space-md sticky top-48">
      <!-- Live City Map Glance -->
      <div class="p-space-md rounded-2xl bg-surface-container-lowest shadow-[0_4px_16px_-2px_rgba(43,40,37,0.05)]">
        <div class="flex items-center justify-between mb-space-sm">
          <h4 class="font-label-lg text-label-lg font-bold text-on-surface">Event Map Glance</h4>
          <span class="px-2 py-0.5 rounded-full bg-primary/10 text-primary font-label-sm text-[11px] font-bold">${selectedCity}</span>
        </div>
        
        <div 
          class="w-full h-48 bg-cover bg-center rounded-xl relative overflow-hidden mb-space-sm" 
          style="background-image: url('https://lh3.googleusercontent.com/aida-public/AB6AXuBBUsy9HNlLH-lmRCNPUhZxjIN155LLmMzheDtYuzkNi0AdsyAPoHN5dJjcbUXL2-2uG6ImOtAfu5KUCtLNQpFHTi3KQ3Bk0qpzk-MjUOV0Y781JluLvwwkn0bNrClI3NGBgX5W-1Fd_0IR-Kz4V3XYaEpTMVEOABL0FBCrPYrLELXwW6xouHTCQ3UtlHzabmscuyrPks92-i7BNzSsQar9V_5ia7Ap_Vum78ZZmnEA1DeFM8QDQL7vMA')"
        >
          <div class="absolute inset-0 bg-primary/5"></div>
          <!-- Animated Floating Pin -->
          <div class="absolute top-1/3 left-1/2 transform -translate-x-1/2 -translate-y-1/2 px-2.5 py-1 rounded-full bg-primary text-white font-label-sm text-[11px] font-bold shadow-lg flex items-center gap-1 animate-bounce">
            <span class="material-symbols-outlined text-[14px]">theater_comedy</span>
            <span>12 Events Near You</span>
          </div>
        </div>

        <p class="font-body-sm text-body-sm text-on-surface-variant mb-space-sm">
          High cluster of night food pop-ups and live plays active around <strong>Waghawadi Road</strong> and <strong>Nilambag</strong>.
        </p>

        <button 
          id="open-map-btn"
          class="w-full py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high font-label-md text-label-md font-bold text-on-surface transition-colors flex items-center justify-center gap-1.5"
        >
          <span class="material-symbols-outlined text-[18px] text-primary">map</span>
          <span>Open Interactive Map</span>
        </button>
      </div>

      <!-- Curated 3-Hour Saurashtra Evening Route -->
      <div class="p-space-md rounded-2xl bg-surface-container-lowest shadow-[0_4px_16px_-2px_rgba(43,40,37,0.05)]">
        <div class="flex items-center gap-2 mb-space-sm">
          <span class="material-symbols-outlined text-primary text-[20px]">route</span>
          <h4 class="font-label-lg text-label-lg font-bold text-on-surface">Tonight's Perfect 3-Hour Route</h4>
        </div>
        
        <div class="relative pl-6 space-y-4 before:content-[''] before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-outline-variant">
          <div class="relative">
            <span class="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full bg-primary ring-4 ring-surface-container-lowest"></span>
            <p class="font-label-md text-label-md font-bold text-on-surface">6:00 PM • Takhteshwar</p>
            <p class="font-body-sm text-body-sm text-on-surface-variant">Golden hour temple breeze & photography</p>
          </div>
          <div class="relative">
            <span class="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full bg-tertiary ring-4 ring-surface-container-lowest"></span>
            <p class="font-label-md text-label-md font-bold text-on-surface">7:15 PM • Crescent Circle</p>
            <p class="font-body-sm text-body-sm text-on-surface-variant">Fresh hot vanela gathiya & cutting chai</p>
          </div>
          <div class="relative">
            <span class="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full bg-secondary ring-4 ring-surface-container-lowest"></span>
            <p class="font-label-md text-label-md font-bold text-on-surface">8:30 PM • Jubilee Hall</p>
            <p class="font-body-sm text-body-sm text-on-surface-variant">Sur Sangam acoustic ghazal performance</p>
          </div>
        </div>

        <button 
          id="share-route-btn"
          class="mt-space-md w-full py-2 rounded-xl bg-surface-container-low hover:bg-surface-container font-label-sm text-label-sm font-bold text-primary transition-colors flex items-center justify-center gap-1"
        >
          <span>Share Route on WhatsApp</span>
          <span class="material-symbols-outlined text-[16px]">chat</span>
        </button>
      </div>

      <!-- Official Brand Curator Stamp -->
      <div class="p-space-sm text-center flex items-center justify-center gap-2 text-on-surface-variant/60 font-label-sm text-label-sm">
        <img 
          alt="Aaje Su? Brand Logo" 
          class="h-4 w-4 object-contain opacity-70" 
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuACMH9AjFrfo0rsl_vhZRsVanXCo7K1DiFaIkMNFh0kypibitPgbUjBoNgYOLY0gRXw49TmEr9IyApHOcN3pDv1X0CqQ2fI7QOczpDfI7qPQZWGOSG-g1NGMH1bN5NesJiXcoFbeIQICFL7_WpQxuJFAVUIZnZ8qbkg0mbeMEejJ0fF8Ex9uTSY3DLZtuv0mVCKMKxzSMpPIs4vC0BjKPz7zeS_vlOlagGa1e6wN4cgy1KyEwgIOa0yQw"
        />
        <span>Curated by ${selectedCity} Local Insiders</span>
      </div>
    </div>
  `;
}

export function bindRightSidebarEvents(container) {
  const mapBtn = container.querySelector('#open-map-btn');
  if (mapBtn) {
    mapBtn.addEventListener('click', () => {
      window.open('https://maps.google.com/?q=Bhavnagar+Gujarat', '_blank');
    });
  }

  const routeBtn = container.querySelector('#share-route-btn');
  if (routeBtn) {
    routeBtn.addEventListener('click', () => {
      const text = encodeURIComponent("Check out tonight's 3-Hour Bhavnagar Evening Route on Aaje Su?: Takhteshwar -> Crescent Circle Gathiya -> Jubilee Hall Ghazals!");
      window.open(`https://wa.me/?text=${text}`, '_blank');
    });
  }
}
