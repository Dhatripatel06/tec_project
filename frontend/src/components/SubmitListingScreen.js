import { store } from '../state/store.js';

export function renderSubmitListingScreen() {
  const selectedCity = store.selectedCity;

  return `
    <div class="max-w-[800px] mx-auto px-margin md:px-margin-desktop py-space-md w-full min-h-[70vh]">
      <!-- Header -->
      <div class="mb-space-lg p-space-md sm:p-space-lg rounded-3xl bg-surface-container-lowest shadow-sm">
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
      <form id="submit-listing-form" class="bg-surface-container-lowest p-space-md sm:p-space-lg rounded-3xl shadow-sm space-y-space-md">
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
              <option value="evening">This Evening (6 PM - 9 PM)</option>
              <option value="night">Tonight & Late Night (9 PM+)</option>
              <option value="evergreen">Evergreen Local Pick</option>
            </select>
          </div>
        </div>

        <!-- Venue & Area -->
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
              Neighborhood Zone *
            </label>
            <select 
              name="area" 
              required 
              class="w-full px-4 py-3 rounded-xl bg-surface-container-low border border-outline-variant/40 focus:outline-none focus:ring-2 focus:ring-primary font-body-md text-body-md"
            >
              <option value="Waghawadi">Waghawadi Road</option>
              <option value="Nilambag">Nilambag & Crescent</option>
              <option value="Ghogha Circle">Ghogha Circle & Gate</option>
              <option value="Kaliyabid">Kaliyabid Campus</option>
            </select>
          </div>
        </div>

        <!-- Start Time & Ticket Price -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
          <div>
            <label class="block font-label-md text-label-md font-bold text-on-surface mb-1">
              Start Time *
            </label>
            <input 
              type="text" 
              name="dateText" 
              required 
              placeholder="e.g. 7:30 PM Tonight"
              class="w-full px-4 py-3 rounded-xl bg-surface-container-low border border-outline-variant/40 focus:outline-none focus:ring-2 focus:ring-primary font-body-md text-body-md"
            />
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

        <!-- Image Select Preset -->
        <div>
          <label class="block font-label-md text-label-md font-bold text-on-surface mb-1">
            Cover Banner Image *
          </label>
          <select 
            name="image" 
            class="w-full px-4 py-3 rounded-xl bg-surface-container-low border border-outline-variant/40 focus:outline-none focus:ring-2 focus:ring-primary font-body-md text-body-md"
          >
            <option value="https://lh3.googleusercontent.com/aida-public/AB6AXuBKairyZcRpTMjpTnJERNAbkEOFO31vdoPIyG22ybkw4IDUq-zHGAP3Wo1G9gz6Lijm4aBj6pCzozc9Jnhbhfhwi4Ccedu8Te3-tT9R0wfkQfrW79PaT6SnCVVr_ZIHjPWTigDYz0_rNQ8fxp_Do3LJJh1jJtpcD1Dd5jFn4fXNiJ2YniNBKOT6b7E1ZHkvumoysermLwE3gDWff6tt0mKseCODxwmfzCklXzAQjFtVOKs8PyuCbhBY1Q">Theater & Ghazal Hall Poster</option>
            <option value="https://lh3.googleusercontent.com/aida-public/AB6AXuALRQnCb2arjuDTIX6DSqxum3zcPWZJ-A6gKbGGDCiA7X0hulvV_D5Av2unmGccW-7x44O5n62CkMXMbMxf6qrS10LK88XdIgijeJqzQ3ZVRXWuK6vMSLwtKT-5RvbQNLlo6rBtN2qKOS-MrdO3r0vPydn-bA-FK1f_ZvKLAo585ciiwUrkgO9zt4a2JQVaMSz-uO7WkdfNIUWQRhXkjuaqH0O3OcvsHv_xVbZ5NtR-leeZGGoVthuuyQ">Handcrafts & Pottery Exhibition</option>
            <option value="https://lh3.googleusercontent.com/aida-public/AB6AXuDGVyaFZSCuvhapUFAdNzpoRRXCk1FuWtyWA5BwuR7X8qlN2kiYxgzJIS3HJwLhjYw8S2r6fwb_SVxeDKK_0IT1dSlh2jLL3Iq49aF_4ShrQwbHjfm5H2-AZP37ec51QEkzNyDg5JpL_MEhCpWLCPzztlGkUhJ5zcO1LNeQufQWY_ettrA7fgGgfvSo8aw6ax4Lfr815JnkwQLVfZ-b2_qVWIPiRMzm6kjW-L4AiQDCxk_PvdL2IkRLJg">Turf Sports & Box Cricket</option>
            <option value="https://lh3.googleusercontent.com/aida-public/AB6AXuCmDWgl_-uVycx1QKIGVEG2p5_4zJmj2LKvzJmL5Z22xq1H8Jlu26XwF6x1VCAG5ljDQKvA1DIxWsn8ZvkeB5ctbcuA8Nhme3Up1Yq0gDG565dpdkQRN1ja1CIQMad6OsKXhj6cr79Nt_cnbrsDOrFe7pHUHv4herEkQbRM3t5QgeO4MVnY5BGDo1VR6pebi8krb6_Ns9nYXksRHe_wF4umW-Y5LRbACdsVoYF4Vo9CjmliWdiTffjIgQ">Gathiya & Kathiyawadi Food Street</option>
          </select>
        </div>

        <!-- Submit Button -->
        <button 
          type="submit" 
          class="w-full py-4 px-space-md bg-primary hover:bg-primary-container text-on-primary rounded-xl font-label-lg text-label-lg font-bold transition-all shadow-lg flex items-center justify-center gap-2 spring-press"
        >
          <span class="material-symbols-outlined text-[20px]">publish</span>
          <span>Publish Event Live to ${selectedCity} Feed</span>
        </button>
      </form>
    </div>
  `;
}

export function bindSubmitListingEvents(container) {
  const form = container.querySelector('#submit-listing-form');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    const title = formData.get('title');
    const category = formData.get('category');
    const timeBand = formData.get('timeBand');
    const venue = formData.get('venue');
    const area = formData.get('area');
    const dateText = formData.get('dateText');
    const price = Number(formData.get('price')) || 0;
    const description = formData.get('description');
    const image = formData.get('image');

    const newEvt = {
      id: `evt-user-${Date.now()}`,
      title,
      category,
      categoryName: category.toUpperCase(),
      categoryBadge: 'User Listing',
      date: 'today',
      dateText,
      startTime: '19:00',
      endTime: '21:00',
      timeBand,
      venue,
      address: `${venue}, ${area}`,
      area,
      distance: '1.0 km',
      price,
      priceText: price === 0 ? 'Free Entry' : `₹${price}`,
      organizer: 'Community Organiser',
      interestedCount: 1,
      status: 'Just Added',
      isFeatured: false,
      image,
      description,
      features: { familyFriendly: true, acIndoor: false, foodOnSite: true }
    };

    store.addCustomEvent(newEvt);
    alert('🚀 Event successfully submitted and published to the live feed!');
  });
}
