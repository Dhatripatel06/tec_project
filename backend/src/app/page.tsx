'use client';

import React, { useState } from 'react';

interface EventItem {
  id: string;
  title: string;
  titleGujarati?: string;
  category: string;
  categoryName: string;
  categoryBadge: string;
  date: string;
  dateText: string;
  startTime: string;
  endTime: string;
  timeBand: string;
  venue: string;
  address: string;
  area: string;
  distance: string;
  price: number;
  priceText: string;
  organizer: string;
  interestedCount: number;
  status: string;
  isFeatured: boolean;
  image: string;
  description: string;
  features: {
    familyFriendly: boolean;
    acIndoor: boolean;
    foodOnSite: boolean;
  };
}

export default function ConsumerHomePage() {
  const [activeTab, setActiveTab] = useState<'today' | 'explore-and-weekend' | 'saved' | 'add-event'>('today');
  const [selectedCity] = useState('Bhavnagar');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [savedEventIds, setSavedEventIds] = useState<string[]>(['evt-001', 'evt-004']);
  
  // Modals state
  const [activeModalEvent, setActiveModalEvent] = useState<EventItem | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // Filter state
  const [filters] = useState({
    timeBand: 'all',
    maxPrice: null as number | null,
    maxDistance: 8,
    familyFriendly: true,
    acIndoor: false,
    foodOnSite: true,
  });

  // Events list
  const [events] = useState<EventItem[]>([
    {
      id: "evt-001",
      title: "Sur Sangam: Live Acoustic Gujarati Ghazal & Indie Fusion",
      titleGujarati: "સૂર સંગમ: એકુસ્ટિક ગઝલ અને સંગીત સંધ્યા",
      category: "culture",
      categoryName: "Culture & Natak",
      categoryBadge: "Ojas Arts Presents",
      date: "today",
      dateText: "8:00 PM Tonight",
      startTime: "20:00",
      endTime: "22:00",
      timeBand: "evening",
      venue: "Victoria Jubilee Hall",
      address: "High Court Road, Bhavnagar",
      area: "Nilambag",
      distance: "1.2 km",
      price: 299,
      priceText: "₹299 onwards",
      organizer: "Ojas Arts & Heritage Guild",
      interestedCount: 42,
      status: "Editor's Pick Today",
      isFeatured: true,
      image: "https://lh3.googleusercontent.com/aida-public/AB6AXuBKairyZcRpTMjpTnJERNAbkEOFO31vdoPIyG22ybkw4IDUq-zHGAP3Wo1G9gz6Lijm4aBj6pCzozc9Jnhbhfhwi4Ccedu8Te3-tT9R0wfkQfrW79PaT6SnCVVr_ZIHjPWTigDYz0_rNQ8fxp_Do3LJJh1jJtpcD1Dd5jFn4fXNiJ2YniNBKOT6b7E1ZHkvumoysermLwE3gDWff6tt0mKseCODxwmfzCklXzAQjFtVOKs8PyuCbhBY1Q",
      description: "A soulful live Saurashtrian evening uniting classical ghazals with modern contemporary sitar and percussionists.",
      features: { familyFriendly: true, acIndoor: true, foodOnSite: true }
    },
    {
      id: "evt-002",
      title: "Bhavnagar Artisan Khadi & Ceramic Showcase",
      titleGujarati: "ભાવનગર ખાદી અને માટીકળા પ્રદર્શન",
      category: "exhibitions",
      categoryName: "Exhibition • Crafts",
      categoryBadge: "Crafts Exhibition",
      date: "today",
      dateText: "Starting in 35 mins",
      startTime: "16:30",
      endTime: "21:00",
      timeBand: "now",
      venue: "Crescent Circle Crafts Pavilion",
      address: "Crescent Circle, City Centre",
      area: "Crescent",
      distance: "2.1 km",
      price: 0,
      priceText: "Free Entry",
      organizer: "Saurashtra Artisan Guild",
      interestedCount: 18,
      status: "Starting Soon",
      isFeatured: false,
      image: "https://lh3.googleusercontent.com/aida-public/AB6AXuALRQnCb2arjuDTIX6DSqxum3zcPWZJ-A6gKbGGDCiA7X0hulvV_D5Av2unmGccW-7x44O5n62CkMXMbMxf6qrS10LK88XdIgijeJqzQ3ZVRXWuK6vMSLwtKT-5RvbQNLlo6rBtN2qKOS-MrdO3r0vPydn-bA-FK1f_ZvKLAo585ciiwUrkgO9zt4a2JQVaMSz-uO7WkdfNIUWQRhXkjuaqH0O3OcvsHv_xVbZ5NtR-leeZGGoVthuuyQ",
      description: "Vibrant Saurashtra local artisan showcase featuring handcrafted clay pottery and hand-spun organic khadi clothing.",
      features: { familyFriendly: true, acIndoor: false, foodOnSite: true }
    },
    {
      id: "evt-003",
      title: "Sunset Turf Cricket 6-a-Side Knockout",
      titleGujarati: "સનસેટ ટર્ફ ક્રિકેટ ટુર્નામેન્ટ",
      category: "sports",
      categoryName: "Sports • Box Turf",
      categoryBadge: "Box Cricket",
      date: "today",
      dateText: "Starts at 5:30 PM",
      startTime: "17:30",
      endTime: "20:30",
      timeBand: "now",
      venue: "Victoria Sports Arena",
      address: "Waghawadi Road, Bhavnagar",
      area: "Waghawadi",
      distance: "3.5 km",
      price: 150,
      priceText: "₹150 / Player",
      organizer: "Victoria Sports Club",
      interestedCount: 24,
      status: "3 slots open",
      isFeatured: false,
      image: "https://lh3.googleusercontent.com/aida-public/AB6AXuDGVyaFZSCuvhapUFAdNzpoRRXCk1FuWtyWA5BwuR7X8qlN2kiYxgzJIS3HJwLhjYw8S2r6fwb_SVxeDKK_0IT1dSlh2jLL3Iq49aF_4ShrQwbHjfm5H2-AZP37ec51QEkzNyDg5JpL_MEhCpWLCPzztlGkUhJ5zcO1LNeQufQWY_ettrA7fgGgfvSo8aw6ax4Lfr815JnkwQLVfZ-b2_qVWIPiRMzm6kjW-L4AiQDCxk_PvdL2IkRLJg",
      description: "High energy floodlit box turf cricket match under a dramatic dusk sky in Bhavnagar.",
      features: { familyFriendly: true, acIndoor: false, foodOnSite: true }
    },
    {
      id: "evt-004",
      title: "Superhit Gujarati Natak: \"Kahaani Maa Twist Chhe\" (હાસ્ય નાટક)",
      titleGujarati: "કહાની માં ટ્વિસ્ટ છે — હાસ્ય નાટક",
      category: "culture",
      categoryName: "Theater Natak",
      categoryBadge: "Theater Natak",
      date: "today",
      dateText: "8:30 PM Tonight",
      startTime: "20:30",
      endTime: "23:00",
      timeBand: "evening",
      venue: "Yashwantrai Natyagruh",
      address: "Near Water Tank, Waghawadi Road",
      area: "Waghawadi",
      distance: "2.8 km",
      price: 200,
      priceText: "₹200 - ₹500",
      organizer: "Natya Saurabh Troupe",
      interestedCount: 88,
      status: "Almost Full",
      isFeatured: false,
      image: "https://lh3.googleusercontent.com/aida-public/AB6AXuC4iGLcIu8KTmOx1KLNcxVE3pBquAXKyhy47lqLMVqSiuQYOF5iFe4raFv7wZ5MbZpcl7aCWFqhI7gkbRUoopZ-mF8R3qF1682GmKBfU0QjvTVZWHYeCZB_26nuSm22Id2IYKIOTWcB0fBvQOGFYGGtxN9VNhHA7hJd0PWySROVsAYqcpPQz4GMk15kCjpZervNFVndQ9MzqAfJrQ6FVTTJkk08cHQ9VyDiNUuErSfgu5SCgOyJvSfeFg",
      description: "Bhavnagar's biggest weekend theatre laughter riot starring renowned Saurashtrian artists.",
      features: { familyFriendly: true, acIndoor: true, foodOnSite: true }
    },
    {
      id: "evt-005",
      title: "Night Food Street: Bhavnagari Gathiya & Chaat Crawl",
      titleGujarati: "નાઇટ ફૂડ સ્ટ્રીટ: ભાવનગરી ગાંઠિયા સ્પેશિયલ",
      category: "food",
      categoryName: "Food Crawl",
      categoryBadge: "Food Crawl",
      date: "today",
      dateText: "7:00 PM Tonight",
      startTime: "19:00",
      endTime: "22:30",
      timeBand: "evening",
      venue: "Ghogha Gate Street Market",
      address: "Old City Ghogha Gate",
      area: "Ghogha Circle",
      distance: "1.8 km",
      price: 0,
      priceText: "Free to Join",
      organizer: "Bhavnagar Foodies Club",
      interestedCount: 54,
      status: "Crowd Favorite",
      isFeatured: false,
      image: "https://lh3.googleusercontent.com/aida-public/AB6AXuCmDWgl_-uVycx1QKIGVEG2p5_4zJmj2LKvzJmL5Z22xq1H8Jlu26XwF6x1VCAG5ljDQKvA1DIxWsn8ZvkeB5ctbcuA8Nhme3Up1Yq0gDG565dpdkQRN1ja1CIQMad6OsKXhj6cr79Nt_cnbrsDOrFe7pHUHv4herEkQbRM3t5QgeO4MVnY5BGDo1VR6pebi8krb6_Ns9nYXksRHe_wF4umW-Y5LRbACdsVoYF4Vo9CjmliWdiTffjIgQ",
      description: "Traditional Gujarati evening street food in Bhavnagar, freshly fried crisp hot Bhavnagari gathiya with papaya sambharo.",
      features: { familyFriendly: true, acIndoor: false, foodOnSite: true }
    }
  ]);

  const toggleSave = (id: string) => {
    setSavedEventIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const filteredEvents = events.filter((item) => {
    if (selectedCategory !== 'all' && item.category !== selectedCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchVenue = item.venue.toLowerCase().includes(q);
      const matchDesc = item.description.toLowerCase().includes(q);
      if (!matchTitle && !matchVenue && !matchDesc) return false;
    }
    if (filters.timeBand !== 'all' && item.timeBand !== filters.timeBand) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-background text-on-surface flex flex-col">
      {/* Header Bar */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-surface/85 backdrop-blur-xl border-b border-surface-container-high shadow-sm">
        <div className="h-20 max-w-[1440px] mx-auto px-4 md:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 shrink-0">
            <button onClick={() => setActiveTab('today')} className="flex items-center gap-2 text-left">
              <img
                alt="Aaje Su? Logo"
                className="h-8 w-auto object-contain"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuACMH9AjFrfo0rsl_vhZRsVanXCo7K1DiFaIkMNFh0kypibitPgbUjBoNgYOLY0gRXw49TmEr9IyApHOcN3pDv1X0CqQ2fI7QOczpDfI7qPQZWGOSG-g1NGMH1bN5NesJiXcoFbeIQICFL7_WpQxuJFAVUIZnZ8qbkg0mbeMEejJ0fF8Ex9uTSY3DLZtuv0mVCKMKxzSMpPIs4vC0BjKPz7zeS_vlOlagGa1e6wN4cgy1KyEwgIOa0yQw"
              />
              <div className="flex flex-col">
                <span className="font-extrabold text-headline-sm text-primary leading-none">આજે શું?</span>
                <span className="text-[10px] uppercase text-tertiary font-bold tracking-wider">Aaje Su • {selectedCity}</span>
              </div>
            </button>
          </div>

          {/* Search Bar */}
          <div className="flex-1 max-w-xl hidden lg:block">
            <div className="relative flex items-center">
              <span className="material-symbols-outlined absolute left-4 text-primary text-[20px]">search</span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search 'Gathiya', Takhteshwar, live natak, workshops..."
                className="w-full h-11 pl-11 pr-4 rounded-full bg-surface-container-lowest text-sm placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-2 focus:ring-primary shadow-sm border border-surface-container-high"
              />
            </div>
          </div>

          {/* Top Navigation Tabs */}
          <nav className="hidden xl:flex items-center gap-1 p-1 bg-surface-container rounded-full text-xs">
            <button
              onClick={() => setActiveTab('today')}
              className={`px-4 py-1.5 rounded-full font-bold transition-all ${
                activeTab === 'today' ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setActiveTab('explore-and-weekend')}
              className={`px-4 py-1.5 rounded-full font-bold transition-all ${
                activeTab === 'explore-and-weekend' ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Explore & Weekend
            </button>
            <button
              onClick={() => setActiveTab('saved')}
              className={`px-4 py-1.5 rounded-full font-bold transition-all ${
                activeTab === 'saved' ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Saved ({savedEventIds.length})
            </button>
            <button
              onClick={() => setActiveTab('add-event')}
              className={`px-4 py-1.5 rounded-full font-bold transition-all ${
                activeTab === 'add-event' ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Add Event
            </button>
            <a
              href="/admin"
              className="px-4 py-1.5 rounded-full font-bold text-tertiary hover:bg-tertiary-fixed/40 transition-all flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[16px]">admin_panel_settings</span>
              <span>Admin Desk</span>
            </a>
          </nav>

          {/* Action Icons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('saved')}
              className="p-2 rounded-full hover:bg-surface-container-high text-on-surface-variant hover:text-primary transition-colors relative"
              title="Saved Events"
            >
              <span className="material-symbols-outlined text-[22px]">favorite</span>
              {savedEventIds.length > 0 && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-primary ring-2 ring-surface"></span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('add-event')}
              className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary hover:bg-primary-container text-on-primary text-xs font-bold transition-all shadow-md"
            >
              <span className="material-symbols-outlined text-[18px]">add_circle</span>
              <span>Add Listing</span>
            </button>

            <button
              onClick={() => setIsLoginModalOpen(true)}
              className="w-9 h-9 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-sm hover:scale-105 transition-transform"
              title="Login / Account"
            >
              <span className="material-symbols-outlined text-[20px]">person</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="pt-24 pb-16 max-w-[1440px] mx-auto px-4 md:px-6 w-full flex-1">
        {activeTab === 'today' && (
          <div className="flex flex-col gap-6">
            {/* Category Chips Bar */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
              {[
                { id: 'all', label: 'All Happenings' },
                { id: 'culture', label: '🎭 Culture & Natak' },
                { id: 'exhibitions', label: '🛍️ Exhibitions & Mela' },
                { id: 'sports', label: '🏏 Sports & Turfs' },
                { id: 'food', label: '🍜 Food Crawls' },
                { id: 'workshops', label: '🎨 Workshops' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-4 py-2 rounded-full text-xs font-bold shrink-0 transition-all ${
                    selectedCategory === cat.id
                      ? 'bg-inverse-surface text-inverse-on-surface shadow-sm'
                      : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Event Feed Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredEvents.map((event) => {
                const saved = savedEventIds.includes(event.id);
                return (
                  <div
                    key={event.id}
                    className="bg-surface-container-lowest rounded-2xl border border-surface-container-high overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col group cursor-pointer"
                    onClick={() => setActiveModalEvent(event)}
                  >
                    <div className="relative h-48 w-full overflow-hidden bg-surface-container-high">
                      <img
                        src={event.image}
                        alt={event.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute top-3 left-3 flex items-center gap-1.5">
                        <span className="bg-surface-container-lowest/90 backdrop-blur-md text-on-surface text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-sm">
                          {event.categoryName}
                        </span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSave(event.id);
                        }}
                        className="absolute top-3 right-3 w-8 h-8 rounded-full bg-surface-container-lowest/90 backdrop-blur-md text-primary flex items-center justify-center shadow-sm hover:scale-110 transition-transform"
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          {saved ? 'favorite' : 'favorite_border'}
                        </span>
                      </button>
                    </div>

                    <div className="p-4 flex flex-col flex-1 gap-2">
                      <div className="flex items-center justify-between text-xs text-primary font-bold">
                        <span>{event.dateText}</span>
                        <span>{event.priceText}</span>
                      </div>

                      <h3 className="font-bold text-base text-on-surface leading-snug group-hover:text-primary transition-colors">
                        {event.title}
                      </h3>
                      {event.titleGujarati && (
                        <p className="text-xs text-tertiary font-semibold">{event.titleGujarati}</p>
                      )}

                      <p className="text-xs text-on-surface-variant line-clamp-2 mt-1">
                        {event.description}
                      </p>

                      <div className="mt-auto pt-3 border-t border-surface-container-high flex items-center justify-between text-xs text-on-surface-variant">
                        <span className="flex items-center gap-1 truncate font-semibold">
                          <span className="material-symbols-outlined text-[16px] text-primary">location_on</span>
                          {event.venue}
                        </span>
                        <span className="shrink-0 text-primary font-bold">View Details →</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'explore-and-weekend' && (
          <div className="p-8 rounded-2xl bg-surface-container-lowest border border-surface-container-high text-center max-w-2xl mx-auto space-y-4">
            <span className="material-symbols-outlined text-[48px] text-primary">calendar_month</span>
            <h2 className="text-xl font-bold">Bhavnagar Weekend & Calendar View</h2>
            <p className="text-sm text-on-surface-variant">
              Discover upcoming coastal weekend getaways, Victoria Park morning walks, and Natak performances scheduled for Saturday & Sunday.
            </p>
          </div>
        )}

        {activeTab === 'saved' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">Your Saved Happenings ({savedEventIds.length})</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {events.filter((e) => savedEventIds.includes(e.id)).map((event) => (
                <div key={event.id} className="p-4 rounded-2xl bg-surface-container-lowest border border-surface-container-high flex flex-col gap-2">
                  <h3 className="font-bold text-base">{event.title}</h3>
                  <p className="text-xs text-on-surface-variant">{event.venue}</p>
                  <button onClick={() => toggleSave(event.id)} className="text-xs font-bold text-error self-start mt-2">
                    Remove from saved
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'add-event' && (
          <div className="max-w-xl mx-auto p-6 rounded-2xl bg-surface-container-lowest border border-surface-container-high shadow-sm space-y-4">
            <h2 className="text-xl font-bold">Submit a Bhavnagar Listing (આયોજન સબમિટ કરો)</h2>
            <input type="text" placeholder="Event Title (નાટક / મેળાવડો નું નામ)" className="w-full p-3 rounded-xl bg-surface-container-low text-xs border border-surface-container-high focus:outline-none" />
            <input type="text" placeholder="Venue & Area (સ્થળ)" className="w-full p-3 rounded-xl bg-surface-container-low text-xs border border-surface-container-high focus:outline-none" />
            <textarea placeholder="Description & Contact details..." className="w-full p-3 rounded-xl bg-surface-container-low text-xs border border-surface-container-high focus:outline-none" rows={4}></textarea>
            <button onClick={() => alert('Submission received! Sent to Bhavnagar Moderation Desk.')} className="w-full py-3 rounded-full bg-primary text-on-primary font-bold text-sm shadow-md">
              Submit for Verification
            </button>
          </div>
        )}
      </main>

      {/* Stitch Event Details Modal */}
      {activeModalEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-inverse-surface/60 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-2xl my-auto bg-surface-container-lowest rounded-2xl shadow-2xl overflow-hidden border border-surface-container-high">
            <div className="relative h-64 w-full bg-surface-container-high">
              <img src={activeModalEvent.image} alt={activeModalEvent.title} className="w-full h-full object-cover" />
              <button
                onClick={() => setActiveModalEvent(null)}
                className="absolute top-4 right-4 w-9 h-9 rounded-full bg-surface-container-lowest/90 text-on-surface flex items-center justify-center font-bold shadow-md"
              >
                ✕
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-2">
                <span className="bg-primary text-on-primary text-xs font-bold px-3 py-1 rounded-full">
                  {activeModalEvent.categoryBadge}
                </span>
                <span className="text-xs text-primary font-bold">{activeModalEvent.dateText}</span>
              </div>
              <h2 className="text-xl font-bold text-on-surface">{activeModalEvent.title}</h2>
              {activeModalEvent.titleGujarati && (
                <p className="text-sm font-bold text-tertiary">{activeModalEvent.titleGujarati}</p>
              )}
              <p className="text-xs text-on-surface-variant leading-relaxed">{activeModalEvent.description}</p>
              <div className="p-3 rounded-xl bg-surface-container-low text-xs space-y-1">
                <div><strong>Venue:</strong> {activeModalEvent.venue} ({activeModalEvent.address})</div>
                <div><strong>Organiser:</strong> {activeModalEvent.organizer}</div>
                <div><strong>Price:</strong> {activeModalEvent.priceText}</div>
              </div>
              <a
                href={`https://wa.me/?text=Hi!%20Interested%20in%20${encodeURIComponent(activeModalEvent.title)}`}
                target="_blank"
                rel="noreferrer"
                className="w-full py-3 rounded-full bg-[#25D366] text-white font-bold text-center block shadow-md text-sm"
              >
                Contact Organiser on WhatsApp
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Stitch Phone OTP Login Modal */}
      {isLoginModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-inverse-surface/60 backdrop-blur-md">
          <div className="relative w-full max-w-md bg-surface-container-lowest rounded-2xl shadow-2xl p-6 border border-surface-container-high space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-on-surface">Phone OTP Login</h2>
              <button onClick={() => setIsLoginModalOpen(false)} className="text-on-surface-variant font-bold">✕</button>
            </div>
            <div className="p-3 bg-tertiary-fixed/30 rounded-xl text-xs text-on-tertiary-fixed-variant">
              <strong>Sandbox Code:</strong> Enter <span className="font-mono font-bold text-primary">123456</span> to log in.
            </div>
            <input type="tel" defaultValue="98795 43210" className="w-full p-3 rounded-xl bg-surface-container-low text-sm font-bold border border-surface-container-high focus:outline-none" />
            <div className="grid grid-cols-6 gap-2">
              {['1', '2', '3', '4', '5', '6'].map((d, i) => (
                <input key={i} type="text" maxLength={1} defaultValue={d} className="w-full aspect-square text-center font-bold text-primary bg-surface-container-low rounded-xl border border-surface-container-high" />
              ))}
            </div>
            <button onClick={() => { setIsLoginModalOpen(false); alert('Successfully logged in!'); }} className="w-full py-3 rounded-full bg-primary text-on-primary font-bold text-sm shadow-md">
              Verify & Continue
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
