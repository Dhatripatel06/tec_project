import { store } from '../state/store.js';

export function renderSubmitListingScreen() {
  const selectedCity = store.selectedCity;
  const zones = store.zones || ['Waghawadi', 'Nilambag', 'Ghogha Circle', 'Kaliyabid', 'Crescent', 'Subhashnagar'];
  const defaultImage = 'https://lh3.googleusercontent.com/aida-public/AB6AXuBKairyZcRpTMjpTnJERNAbkEOFO31vdoPIyG22ybkw4IDUq-zHGAP3Wo1G9gz6Lijm4aBj6pCzozc9Jnhbhfhwi4Ccedu8Te3-tT9R0wfkQfrW79PaT6SnCVVr_ZIHjPWTigDYz0_rNQ8fxp_Do3LJJh1jJtpcD1Dd5jFn4fXNiJ2YniNBKOT6b7E1ZHkvumoysermLwE3gDWff6tt0mKseCODxwmfzCklXzAQjFtVOKs8PyuCbhBY1Q';

  return `
    <div class="max-w-[800px] mx-auto px-margin md:px-margin-desktop py-space-md w-full min-h-[70vh]">
      <!-- Header Ribbon -->
      <div class="mb-space-lg p-space-md sm:p-space-lg rounded-3xl bg-surface-container-lowest shadow-sm border border-surface-container-high">
        <div class="flex items-center gap-space-sm mb-2">
          <span class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <span class="material-symbols-outlined text-[24px]">add_circle</span>
          </span>
          <div>
            <h2 class="font-headline-md text-headline-md font-bold text-on-surface">Submit Local Event Listing</h2>
            <p class="font-body-sm text-body-sm text-on-surface-variant">તમારા સ્થાનિક કાર્યક્રમની નોંધણી કરો (Free for ${selectedCity})</p>
          </div>
        </div>
        <p class="font-body-sm text-body-sm text-on-surface-variant">
          Organising a natak, box cricket tournament, garba night, or food popup? Post it live on Aaje Su? in 2 minutes.
        </p>
      </div>

      <!-- Form Container -->
      <form id="submit-listing-form" class="bg-surface-container-lowest p-space-md sm:p-space-lg rounded-3xl shadow-sm border border-surface-container-high space-y-space-md">
        <!-- Event Title -->
        <div>
          <label class="block font-label-md text-label-md font-bold text-on-surface mb-1">
            Event Title * (કાર્યક્રમનું નામ)
          </label>
          <input 
            type="text" 
            name="title" 
            required 
            placeholder="e.g. Waghawadi Live Acoustic Jam & Standup Comedy"
            class="w-full px-4 py-3 rounded-xl bg-surface-container-low border border-outline-variant/40 focus:outline-none focus:ring-2 focus:ring-primary font-body-md text-body-md"
          />
        </div>

        <!-- Category & Time Band -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
          <div>
            <label class="block font-label-md text-label-md font-bold text-on-surface mb-1">
              Category *
            </label>
            <select 
              name="category" 
              required 
              class="w-full px-4 py-3 rounded-xl bg-surface-container-low border border-outline-variant/40 focus:outline-none focus:ring-2 focus:ring-primary font-body-md text-body-md"
            >
              <option value="culture">🎭 Culture & Natak</option>
              <option value="food">🍜 Food & Popups</option>
              <option value="sports">🏏 Sports & Turf</option>
              <option value="workshops">🎨 Workshops & Art</option>
              <option value="social">🎤 Social & Open Mic</option>
              <option value="exhibitions">🛍 Exhibitions</option>
              <option value="festivals">🛕 Festivals & Darshan</option>
            </select>
          </div>

          <div>
            <label class="block font-label-md text-label-md font-bold text-on-surface mb-1">
              Time Band *
            </label>
            <select 
              name="timeBand" 
              required 
              class="w-full px-4 py-3 rounded-xl bg-surface-container-low border border-outline-variant/40 focus:outline-none focus:ring-2 focus:ring-primary font-body-md text-body-md"
            >
              <option value="now">Happening Now / Starting Soon</option>
              <option value="evening" selected>This Evening (6 PM - 9 PM)</option>
              <option value="night">Tonight & Late Night (9 PM+)</option>
              <option value="evergreen">Evergreen Local Pick</option>
            </select>
          </div>
        </div>

        <!-- Venue Name & Dynamic Neighborhood Zone -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
          <div>
            <label class="block font-label-md text-label-md font-bold text-on-surface mb-1">
              Venue Name * (સ્થળ)
            </label>
            <input 
              type="text" 
              name="venue" 
              required 
              placeholder="e.g. Victoria Jubilee Hall / Crescent Pavilion"
              class="w-full px-4 py-3 rounded-xl bg-surface-container-low border border-outline-variant/40 focus:outline-none focus:ring-2 focus:ring-primary font-body-md text-body-md"
            />
          </div>

          <div>
            <label class="block font-label-md text-label-md font-bold text-on-surface mb-1">
              Neighborhood Zone * (વિસ્તાર)
            </label>
            <select 
              id="zone-select"
              name="areaSelect" 
              class="w-full px-4 py-3 rounded-xl bg-surface-container-low border border-outline-variant/40 focus:outline-none focus:ring-2 focus:ring-primary font-body-md text-body-md mb-2"
            >
              ${zones.map(z => `<option value="${z}">${z}</option>`).join('')}
              <option value="__custom__">➕ Add New Zone (અન્ય વિસ્તાર ઉમેરો)...</option>
            </select>

            <div id="custom-zone-container" class="hidden">
              <input 
                type="text" 
                id="custom-zone-input"
                name="customArea"
                placeholder="Type new neighborhood zone (e.g. Subhashnagar, Chitra GIDC)"
                class="w-full px-4 py-2.5 rounded-xl bg-tertiary-fixed/20 border border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary text-sm font-semibold text-primary"
              />
              <span class="text-[11px] text-on-surface-variant block mt-1">✨ This new zone will be automatically added to the city database!</span>
            </div>
          </div>
        </div>

        <!-- Start Time Picker & Ticket Price -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
          <div>
            <label class="block font-label-md text-label-md font-bold text-on-surface mb-1">
              Start Time * (સમય નક્કી કરો)
            </label>
            <div class="flex items-center gap-2">
              <input 
                type="time" 
                id="start-time-picker"
                name="startTimePicker"
                value="19:30"
                required
                class="w-full px-4 py-3 rounded-xl bg-surface-container-low border border-outline-variant/40 focus:outline-none focus:ring-2 focus:ring-primary font-body-md text-body-md font-bold"
              />
              <input 
                type="hidden" 
                id="formatted-date-text"
                name="dateText" 
                value="7:30 PM Tonight"
              />
            </div>
            <div class="flex items-center gap-1.5 mt-2 flex-wrap text-xs">
              <button type="button" class="time-preset-btn px-2.5 py-1 rounded-full bg-surface-container hover:bg-primary/20 text-on-surface hover:text-primary transition-colors font-semibold" data-time="18:30">6:30 PM</button>
              <button type="button" class="time-preset-btn px-2.5 py-1 rounded-full bg-surface-container hover:bg-primary/20 text-on-surface hover:text-primary transition-colors font-semibold" data-time="19:30">7:30 PM</button>
              <button type="button" class="time-preset-btn px-2.5 py-1 rounded-full bg-surface-container hover:bg-primary/20 text-on-surface hover:text-primary transition-colors font-semibold" data-time="20:30">8:30 PM</button>
            </div>
          </div>

          <div>
            <label class="block font-label-md text-label-md font-bold text-on-surface mb-1">
              Ticket Price (₹)
            </label>
            <input 
              type="number" 
              name="price" 
              placeholder="0 for Free Entry"
              value="0"
              class="w-full px-4 py-3 rounded-xl bg-surface-container-low border border-outline-variant/40 focus:outline-none focus:ring-2 focus:ring-primary font-body-md text-body-md"
            />
          </div>
        </div>

        <!-- Description -->
        <div>
          <label class="block font-label-md text-label-md font-bold text-on-surface mb-1">
            Description & Highlights *
          </label>
          <textarea 
            name="description" 
            rows="3" 
            required 
            placeholder="Tell local insiding details, artists performing, food included, entry terms..."
            class="w-full px-4 py-3 rounded-xl bg-surface-container-low border border-outline-variant/40 focus:outline-none focus:ring-2 focus:ring-primary font-body-md text-body-md"
          ></textarea>
        </div>

        <!-- Cover Banner Image Picker -->
        <div>
          <label class="block font-label-md text-label-md font-bold text-on-surface mb-1">
            Cover Banner Image *
          </label>
          
          <input type="hidden" id="selected-banner-image" name="image" value="${defaultImage}" />

          <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-3 rounded-2xl bg-surface-container-low border border-outline-variant/40">
            <div id="banner-preview-thumb" class="w-full sm:w-28 h-20 rounded-xl bg-surface-container-high overflow-hidden shrink-0 border border-surface-container-high relative">
              <img src="${defaultImage}" class="w-full h-full object-cover" />
            </div>
            
            <div class="flex-1 flex flex-col justify-between gap-2">
              <div>
                <span class="text-xs font-bold text-on-surface block">Cover Banner Attached</span>
                <span class="text-[11px] text-on-surface-variant block">Upload your own event poster or choose from high-res presets.</span>
              </div>
              <button 
                type="button" 
                id="open-banner-modal-btn"
                class="self-start px-4 py-2 rounded-xl bg-surface-container-highest hover:bg-primary/20 text-primary font-label-md text-xs font-bold transition-colors flex items-center gap-1.5 border border-primary/20 cursor-pointer"
              >
                <span class="material-symbols-outlined text-[16px]">photo_camera</span>
                <span>Upload / Choose Cover Banner</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Submit Button -->
        <button 
          type="submit" 
          class="w-full py-4 px-space-md bg-primary hover:bg-primary-container text-on-primary rounded-xl font-label-lg text-label-lg font-bold transition-all shadow-lg flex items-center justify-center gap-2 spring-press cursor-pointer"
        >
          <span class="material-symbols-outlined text-[20px]">publish</span>
          <span>Submit Event for ${selectedCity} Moderation</span>
        </button>
      </form>
    </div>

    <!-- Cover Banner Image Upload Modal -->
    <div id="banner-modal-overlay" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-inverse-surface/60 backdrop-blur-md hidden">
      <div class="relative w-full max-w-xl bg-surface-container-lowest rounded-3xl shadow-2xl p-6 border border-surface-container-high space-y-4 my-auto max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between border-b border-surface-container-high pb-3">
          <div class="flex items-center gap-2">
            <span class="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
              <span class="material-symbols-outlined text-[20px]">image</span>
            </span>
            <h3 class="text-base font-bold text-on-surface">Cover Banner Image Studio</h3>
          </div>
          <button type="button" id="close-banner-modal-btn" class="text-on-surface-variant font-bold text-lg hover:text-primary">✕</button>
        </div>

        <!-- Option A: Local File Upload -->
        <div class="p-4 rounded-2xl bg-surface-container-low border border-dashed border-primary/40 text-center">
          <span class="material-symbols-outlined text-[36px] text-primary mb-1">cloud_upload</span>
          <h4 class="text-xs font-bold text-on-surface">Upload Image File from Device</h4>
          <p class="text-[11px] text-on-surface-variant mb-3">PNG, JPG, WEBP up to 5MB</p>
          <label class="px-4 py-2 rounded-full bg-primary text-on-primary text-xs font-bold hover:bg-primary-container cursor-pointer inline-block shadow-sm">
            Browse Device Image
            <input type="file" id="modal-banner-file-input" accept="image/*" class="hidden" />
          </label>
        </div>

        <!-- Option B: Direct Image URL -->
        <div>
          <label class="block text-xs font-bold text-on-surface mb-1">Or Paste Public Image URL</label>
          <input 
            type="url" 
            id="modal-banner-url-input"
            placeholder="https://images.unsplash.com/photo-..."
            class="w-full px-3 py-2.5 rounded-xl bg-surface-container-low border border-surface-container-high text-xs focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <!-- Option C: High Quality Presets -->
        <div>
          <label class="block text-xs font-bold text-on-surface mb-2">Or Select Category Preset Banner</label>
          <div class="grid grid-cols-2 gap-2 text-xs">
            <button type="button" class="preset-banner-btn text-left p-2 rounded-xl bg-surface-container-low hover:bg-primary/10 border border-surface-container-high transition-colors flex items-center gap-2" data-url="https://lh3.googleusercontent.com/aida-public/AB6AXuBKairyZcRpTMjpTnJERNAbkEOFO31vdoPIyG22ybkw4IDUq-zHGAP3Wo1G9gz6Lijm4aBj6pCzozc9Jnhbhfhwi4Ccedu8Te3-tT9R0wfkQfrW79PaT6SnCVVr_ZIHjPWTigDYz0_rNQ8fxp_Do3LJJh1jJtpcD1Dd5jFn4fXNiJ2YniNBKOT6b7E1ZHkvumoysermLwE3gDWff6tt0mKseCODxwmfzCklXzAQjFtVOKs8PyuCbhBY1Q">
              <span class="w-10 h-10 rounded-lg bg-cover bg-center shrink-0" style="background-image: url('https://lh3.googleusercontent.com/aida-public/AB6AXuBKairyZcRpTMjpTnJERNAbkEOFO31vdoPIyG22ybkw4IDUq-zHGAP3Wo1G9gz6Lijm4aBj6pCzozc9Jnhbhfhwi4Ccedu8Te3-tT9R0wfkQfrW79PaT6SnCVVr_ZIHjPWTigDYz0_rNQ8fxp_Do3LJJh1jJtpcD1Dd5jFn4fXNiJ2YniNBKOT6b7E1ZHkvumoysermLwE3gDWff6tt0mKseCODxwmfzCklXzAQjFtVOKs8PyuCbhBY1Q')"></span>
              <span class="font-bold truncate">🎭 Theatre & Ghazal</span>
            </button>

            <button type="button" class="preset-banner-btn text-left p-2 rounded-xl bg-surface-container-low hover:bg-primary/10 border border-surface-container-high transition-colors flex items-center gap-2" data-url="https://lh3.googleusercontent.com/aida-public/AB6AXuALRQnCb2arjuDTIX6DSqxum3zcPWZJ-A6gKbGGDCiA7X0hulvV_D5Av2unmGccW-7x44O5n62CkMXMbMxf6qrS10LK88XdIgijeJqzQ3ZVRXWuK6vMSLwtKT-5RvbQNLlo6rBtN2qKOS-MrdO3r0vPydn-bA-FK1f_ZvKLAo585ciiwUrkgO9zt4a2JQVaMSz-uO7WkdfNIUWQRhXkjuaqH0O3OcvsHv_xVbZ5NtR-leeZGGoVthuuyQ">
              <span class="w-10 h-10 rounded-lg bg-cover bg-center shrink-0" style="background-image: url('https://lh3.googleusercontent.com/aida-public/AB6AXuALRQnCb2arjuDTIX6DSqxum3zcPWZJ-A6gKbGGDCiA7X0hulvV_D5Av2unmGccW-7x44O5n62CkMXMbMxf6qrS10LK88XdIgijeJqzQ3ZVRXWuK6vMSLwtKT-5RvbQNLlo6rBtN2qKOS-MrdO3r0vPydn-bA-FK1f_ZvKLAo585ciiwUrkgO9zt4a2JQVaMSz-uO7WkdfNIUWQRhXkjuaqH0O3OcvsHv_xVbZ5NtR-leeZGGoVthuuyQ')"></span>
              <span class="font-bold truncate">🏺 Handicrafts Exhibition</span>
            </button>

            <button type="button" class="preset-banner-btn text-left p-2 rounded-xl bg-surface-container-low hover:bg-primary/10 border border-surface-container-high transition-colors flex items-center gap-2" data-url="https://lh3.googleusercontent.com/aida-public/AB6AXuDGVyaFZSCuvhapUFAdNzpoRRXCk1FuWtyWA5BwuR7X8qlN2kiYxgzJIS3HJwLhjYw8S2r6fwb_SVxeDKK_0IT1dSlh2jLL3Iq49aF_4ShrQwbHjfm5H2-AZP37ec51QEkzNyDg5JpL_MEhCpWLCPzztlGkUhJ5zcO1LNeQufQWY_ettrA7fgGgfvSo8aw6ax4Lfr815JnkwQLVfZ-b2_qVWIPiRMzm6kjW-L4AiQDCxk_PvdL2IkRLJg">
              <span class="w-10 h-10 rounded-lg bg-cover bg-center shrink-0" style="background-image: url('https://lh3.googleusercontent.com/aida-public/AB6AXuDGVyaFZSCuvhapUFAdNzpoRRXCk1FuWtyWA5BwuR7X8qlN2kiYxgzJIS3HJwLhjYw8S2r6fwb_SVxeDKK_0IT1dSlh2jLL3Iq49aF_4ShrQwbHjfm5H2-AZP37ec51QEkzNyDg5JpL_MEhCpWLCPzztlGkUhJ5zcO1LNeQufQWY_ettrA7fgGgfvSo8aw6ax4Lfr815JnkwQLVfZ-b2_qVWIPiRMzm6kjW-L4AiQDCxk_PvdL2IkRLJg')"></span>
              <span class="font-bold truncate">🏏 Box Turf Cricket</span>
            </button>

            <button type="button" class="preset-banner-btn text-left p-2 rounded-xl bg-surface-container-low hover:bg-primary/10 border border-surface-container-high transition-colors flex items-center gap-2" data-url="https://lh3.googleusercontent.com/aida-public/AB6AXuCmDWgl_-uVycx1QKIGVEG2p5_4zJmj2LKvzJmL5Z22xq1H8Jlu26XwF6x1VCAG5ljDQKvA1DIxWsn8ZvkeB5ctbcuA8Nhme3Up1Yq0gDG565dpdkQRN1ja1CIQMad6OsKXhj6cr79Nt_cnbrsDOrFe7pHUHv4herEkQbRM3t5QgeO4MVnY5BGDo1VR6pebi8krb6_Ns9nYXksRHe_wF4umW-Y5LRbACdsVoYF4Vo9CjmliWdiTffjIgQ">
              <span class="w-10 h-10 rounded-lg bg-cover bg-center shrink-0" style="background-image: url('https://lh3.googleusercontent.com/aida-public/AB6AXuCmDWgl_-uVycx1QKIGVEG2p5_4zJmj2LKvzJmL5Z22xq1H8Jlu26XwF6x1VCAG5ljDQKvA1DIxWsn8ZvkeB5ctbcuA8Nhme3Up1Yq0gDG565dpdkQRN1ja1CIQMad6OsKXhj6cr79Nt_cnbrsDOrFe7pHUHv4herEkQbRM3t5QgeO4MVnY5BGDo1VR6pebi8krb6_Ns9nYXksRHe_wF4umW-Y5LRbACdsVoYF4Vo9CjmliWdiTffjIgQ')"></span>
              <span class="font-bold truncate">🍜 Kathiyawadi Food</span>
            </button>
          </div>
        </div>

        <!-- Live Preview Banner Box -->
        <div className="pt-2">
          <label class="block text-xs font-bold text-on-surface mb-1">Live Cover Banner Preview</label>
          <div class="relative h-36 w-full rounded-2xl bg-surface-container-high overflow-hidden border border-surface-container-high">
            <img id="modal-banner-preview-img" src="${defaultImage}" class="w-full h-full object-cover" />
            <span class="absolute top-3 left-3 bg-inverse-surface/80 text-white backdrop-blur-md text-[10px] font-bold px-2.5 py-1 rounded-full uppercase">
              Cover Banner Preview
            </span>
          </div>
        </div>

        <button 
          type="button" 
          id="apply-banner-btn"
          class="w-full py-3 rounded-full bg-primary text-on-primary font-bold text-xs shadow-md hover:bg-primary-container transition-all cursor-pointer"
        >
          Apply Selected Cover Banner
        </button>
      </div>
    </div>
  `;
}

export function bindSubmitListingEvents(container) {
  const form = container.querySelector('#submit-listing-form');
  if (!form) return;

  // 1. Dynamic Neighborhood Zone Selection Toggle
  const zoneSelect = container.querySelector('#zone-select');
  const customZoneContainer = container.querySelector('#custom-zone-container');
  const customZoneInput = container.querySelector('#custom-zone-input');

  if (zoneSelect && customZoneContainer) {
    zoneSelect.addEventListener('change', (e) => {
      if (e.target.value === '__custom__') {
        customZoneContainer.classList.remove('hidden');
        if (customZoneInput) customZoneInput.focus();
      } else {
        customZoneContainer.classList.add('hidden');
      }
    });
  }

  // 2. Start Time Picker Formatter
  const timePicker = container.querySelector('#start-time-picker');
  const formattedDateText = container.querySelector('#formatted-date-text');

  function updateFormattedTime(val) {
    if (!val) return;
    const [hours, minutes] = val.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const h12 = hours % 12 || 12;
    const formatted = `${h12}:${minutes < 10 ? '0' : ''}${minutes} ${period} Tonight`;
    if (formattedDateText) formattedDateText.value = formatted;
  }

  if (timePicker) {
    timePicker.addEventListener('change', (e) => updateFormattedTime(e.target.value));
  }

  container.querySelectorAll('.time-preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const timeVal = btn.getAttribute('data-time');
      if (timePicker) {
        timePicker.value = timeVal;
        updateFormattedTime(timeVal);
      }
    });
  });

  // 3. Cover Banner Image Upload Modal logic
  const bannerOverlay = container.querySelector('#banner-modal-overlay');
  const openBannerBtn = container.querySelector('#open-banner-modal-btn');
  const closeBannerBtn = container.querySelector('#close-banner-modal-btn');
  const applyBannerBtn = container.querySelector('#apply-banner-btn');
  
  const modalFileInput = container.querySelector('#modal-banner-file-input');
  const modalUrlInput = container.querySelector('#modal-banner-url-input');
  const modalPreviewImg = container.querySelector('#modal-banner-preview-img');
  
  const hiddenBannerInput = container.querySelector('#selected-banner-image');
  const thumbPreviewContainer = container.querySelector('#banner-preview-thumb');

  let tempSelectedBanner = hiddenBannerInput ? hiddenBannerInput.value : '';

  if (openBannerBtn && bannerOverlay) {
    openBannerBtn.addEventListener('click', () => {
      bannerOverlay.classList.remove('hidden');
    });
  }

  if (closeBannerBtn && bannerOverlay) {
    closeBannerBtn.addEventListener('click', () => {
      bannerOverlay.classList.add('hidden');
    });
  }

  if (modalFileInput) {
    modalFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          tempSelectedBanner = event.target.result;
          if (modalPreviewImg) modalPreviewImg.src = tempSelectedBanner;
        };
        reader.readAsDataURL(file);
      }
    });
  }

  if (modalUrlInput) {
    modalUrlInput.addEventListener('input', (e) => {
      if (e.target.value.trim()) {
        tempSelectedBanner = e.target.value.trim();
        if (modalPreviewImg) modalPreviewImg.src = tempSelectedBanner;
      }
    });
  }

  container.querySelectorAll('.preset-banner-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const url = btn.getAttribute('data-url');
      if (url) {
        tempSelectedBanner = url;
        if (modalPreviewImg) modalPreviewImg.src = url;
        if (modalUrlInput) modalUrlInput.value = url;
      }
    });
  });

  if (applyBannerBtn) {
    applyBannerBtn.addEventListener('click', () => {
      if (tempSelectedBanner) {
        if (hiddenBannerInput) hiddenBannerInput.value = tempSelectedBanner;
        if (thumbPreviewContainer) {
          thumbPreviewContainer.innerHTML = `<img src="${tempSelectedBanner}" class="w-full h-full object-cover" />`;
        }
      }
      if (bannerOverlay) bannerOverlay.classList.add('hidden');
    });
  }

  // 4. Form Submit
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    const title = formData.get('title');
    const category = formData.get('category');
    const timeBand = formData.get('timeBand');
    const venue = formData.get('venue');
    const areaSelect = formData.get('areaSelect');
    const customArea = formData.get('customArea');
    
    // Determine actual area (zone)
    let area = areaSelect === '__custom__' && customArea ? customArea.trim() : areaSelect;
    if (!area) area = 'Waghawadi';

    const dateText = formData.get('dateText') || '7:30 PM Tonight';
    const price = Number(formData.get('price')) || 0;
    const description = formData.get('description');
    const image = formData.get('image') || tempSelectedBanner;

    const newEvt = {
      id: `evt-user-${Date.now()}`,
      title,
      category,
      categoryName: String(category).toUpperCase(),
      categoryBadge: 'Community Submission',
      date: 'today',
      dateText,
      startTime: timePicker ? timePicker.value : '19:30',
      endTime: '21:30',
      timeBand,
      venue,
      address: `${venue}, ${area}`,
      area,
      distance: '1.0 km',
      price,
      priceText: price === 0 ? 'Free Entry' : `₹${price}`,
      organizer: 'Community Organiser',
      interestedCount: 1,
      status: 'NEEDS_REVIEW',
      isFeatured: false,
      image,
      description,
      features: { familyFriendly: true, acIndoor: false, foodOnSite: true }
    };

    store.addCustomEvent(newEvt);
    store.showToast('📋 Event submitted for curation! Sent to Admin Moderation Desk.');
  });
}
