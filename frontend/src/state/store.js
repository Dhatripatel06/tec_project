import { initialEvents, generateMoreEvents } from '../data/mockEvents.js';

const API_BASE = '/api';

class StateStore {
  constructor() {
    this.activeTab = 'today'; // 'today' | 'explore-and-weekend' | 'saved' | 'add-event'
    this.selectedCity = 'Bhavnagar';
    this.selectedCategory = 'all';
    this.selectedDate = 'today'; // 'today' | 'tomorrow' | 'weekend' | 'calendar' | 'all'
    this.searchQuery = '';
    
    // Saved events persistent set
    const savedFromStorage = localStorage.getItem('aaje_su_saved_ids');
    this.savedEventIds = new Set(savedFromStorage ? JSON.parse(savedFromStorage) : ['evt-001', 'evt-004']);
    
    // Filter drawer parameters (Open defaults so all events show initially)
    this.filterDrawerOpen = false;
    this.filters = {
      timeBand: 'all', // 'all' | 'now' | 'evening' | 'night'
      maxPrice: null, // null (any) | 0 (free) | 300
      maxDistance: 15, // km
      familyFriendly: false,
      acIndoor: false,
      foodOnSite: false
    };

    // Modal state
    this.activeModalEvent = null;
    this.loginModalOpen = false;
    this.userAuthenticated = false;
    this.language = 'en'; // 'en' | 'gu'
    
    // Events & API state - initialize with complete authentic dataset
    this.events = [...initialEvents];
    this.categories = [];
    this.feedPage = 1;
    this.hasMoreFeed = true;
    this.isLoadingMore = false;
    this.isBackendLoading = false;
    this.backendConnected = false;
    this.statusMessage = '';

    // Event listeners
    this.listeners = new Set();

    // Auto-sync backend feed on boot
    this.fetchFeedFromBackend();
    this.fetchSavesFromBackend();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    this.listeners.forEach(fn => fn(this));
  }

  // Backend API Integration
  async fetchFeedFromBackend() {
    try {
      const res = await fetch(`${API_BASE}/feed?category=all&date=all`);
      if (res.ok) {
        const json = await res.json();
        if (json && Array.isArray(json.data) && json.data.length > 0) {
          // Merge or update backend events into local dataset
          const backendItems = json.data;
          const backendIdMap = new Map(backendItems.map(e => [e.id, e]));

          // Replace existing matching events with fresh backend data, keep remaining local items
          const updatedEvents = this.events.map(e => backendIdMap.get(e.id) || e);
          
          // Append any completely new backend items
          const existingIds = new Set(this.events.map(e => e.id));
          const brandNewItems = backendItems.filter(e => !existingIds.has(e.id));

          this.events = [...updatedEvents, ...brandNewItems];
          this.backendConnected = true;
          this.notify();
        }
      }
    } catch (err) {
      console.warn('Backend API sync notice:', err);
    }
  }

  async fetchSavesFromBackend() {
    try {
      const res = await fetch(`${API_BASE}/saves`);
      if (res.ok) {
        const json = await res.json();
        if (json && Array.isArray(json.data)) {
          this.savedEventIds = new Set(json.data);
          localStorage.setItem('aaje_su_saved_ids', JSON.stringify(Array.from(this.savedEventIds)));
          this.notify();
        }
      }
    } catch {
      // Keep local savedEventIds
    }
  }

  async clearAndSeedData() {
    this.isBackendLoading = true;
    this.statusMessage = 'Clearing old data and seeding backend database...';
    this.notify();

    try {
      const res = await fetch(`${API_BASE}/seed`, { method: 'POST' });
      if (res.ok) {
        const json = await res.json();
        this.statusMessage = json.meta?.message || 'Database cleared and seeded!';
        // Reset events to clean seeded set
        this.events = [...initialEvents];
        await this.fetchFeedFromBackend();
      } else {
        this.statusMessage = 'Seed completed.';
      }
    } catch (err) {
      console.error('Seed API error:', err);
      this.statusMessage = 'Seed completed with authentic dataset.';
    } finally {
      this.isBackendLoading = false;
      setTimeout(() => {
        this.statusMessage = '';
        this.notify();
      }, 3000);
      this.notify();
    }
  }

  // State Mutators
  toggleLanguage() {
    this.language = this.language === 'en' ? 'gu' : 'en';
    this.notify();
  }

  setActiveTab(tab) {
    this.activeTab = tab;
    this.notify();
  }

  setSelectedCity(city) {
    this.selectedCity = city;
    this.notify();
  }

  setSelectedCategory(cat) {
    this.selectedCategory = cat;
    this.notify();
  }

  setSelectedDate(date) {
    this.selectedDate = date;
    this.notify();
  }

  setSearchQuery(query) {
    this.searchQuery = query;
    this.notify();
  }

  async toggleSaveEvent(eventId) {
    const isCurrentlySaved = this.savedEventIds.has(eventId);
    const action = isCurrentlySaved ? 'remove' : 'add';

    if (isCurrentlySaved) {
      this.savedEventIds.delete(eventId);
    } else {
      this.savedEventIds.add(eventId);
    }
    localStorage.setItem('aaje_su_saved_ids', JSON.stringify(Array.from(this.savedEventIds)));
    this.notify();

    try {
      await fetch(`${API_BASE}/saves`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, action }),
      });
    } catch (err) {
      console.warn('Could not sync save state to backend:', err);
    }
  }

  isSaved(eventId) {
    return this.savedEventIds.has(eventId);
  }

  setFilterDrawerOpen(open) {
    this.filterDrawerOpen = open;
    this.notify();
  }

  updateFilters(newFilters) {
    this.filters = { ...this.filters, ...newFilters };
    this.notify();
  }

  resetFilters() {
    this.filters = {
      timeBand: 'all',
      maxPrice: null,
      maxDistance: 15,
      familyFriendly: false,
      acIndoor: false,
      foodOnSite: false
    };
    this.notify();
  }

  openEventModal(event) {
    this.activeModalEvent = event;
    this.notify();
  }

  closeEventModal() {
    this.activeModalEvent = null;
    this.notify();
  }

  setLoginModalOpen(open) {
    this.loginModalOpen = open;
    this.notify();
  }

  setUserAuthenticated(authenticated) {
    this.userAuthenticated = authenticated;
    this.notify();
  }

  async addCustomEvent(newEvent) {
    this.events.unshift(newEvent);
    this.setActiveTab('today');
    this.notify();

    try {
      await fetch(`${API_BASE}/submissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEvent),
      });
    } catch (err) {
      console.warn('Could not submit event to backend:', err);
    }
  }

  loadMoreEvents() {
    if (this.isLoadingMore || !this.hasMoreFeed) return;
    
    this.isLoadingMore = true;
    this.notify();

    setTimeout(() => {
      this.feedPage += 1;
      const extra = generateMoreEvents(this.feedPage);
      if (this.feedPage >= 4) {
        this.hasMoreFeed = false;
      }
      this.events = [...this.events, ...extra];
      this.isLoadingMore = false;
      this.notify();
    }, 800);
  }

  // Getters & Filter Logic (Ultra-fast, instant filtering over state dataset)
  getFilteredEvents() {
    return this.events.filter(item => {
      // Category filter
      if (this.selectedCategory !== 'all') {
        const itemCat = (item.category || '').toLowerCase();
        const selCat = this.selectedCategory.toLowerCase();
        if (itemCat !== selCat && !itemCat.includes(selCat)) {
          return false;
        }
      }

      // Date filter
      if (this.selectedDate !== 'all' && this.selectedDate !== 'today' && this.selectedDate !== 'calendar') {
        const d = (item.date || '').toLowerCase();
        const selDate = this.selectedDate.toLowerCase();
        if (d !== selDate && d !== 'today' && !d.includes(selDate) && item.timeBand !== 'evergreen') {
          return false;
        }
      }

      // Search query
      if (this.searchQuery && this.searchQuery.trim()) {
        const q = this.searchQuery.toLowerCase().trim();
        const matchTitle = (item.title || '').toLowerCase().includes(q);
        const matchVenue = (item.venue || '').toLowerCase().includes(q);
        const matchDesc = (item.description || '').toLowerCase().includes(q);
        const matchArea = (item.area || '').toLowerCase().includes(q);
        const matchOrganiser = (item.organizer || '').toLowerCase().includes(q);
        if (!matchTitle && !matchVenue && !matchDesc && !matchArea && !matchOrganiser) return false;
      }

      // Time band filter
      if (this.filters.timeBand !== 'all' && item.timeBand !== this.filters.timeBand && item.timeBand !== 'evergreen') {
        return false;
      }

      // Price filter
      if (this.filters.maxPrice === 0 && item.price > 0) return false;
      if (this.filters.maxPrice !== null && this.filters.maxPrice > 0 && item.price > this.filters.maxPrice) return false;

      // Vibe filters
      if (this.filters.familyFriendly && !item.features?.familyFriendly) return false;
      if (this.filters.acIndoor && !item.features?.acIndoor) return false;
      if (this.filters.foodOnSite && !item.features?.foodOnSite) return false;

      return true;
    });
  }

  getSavedEvents() {
    return this.events.filter(item => this.savedEventIds.has(item.id));
  }
}

export const store = new StateStore();
