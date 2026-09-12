import { initialEvents, generateMoreEvents } from '../data/mockEvents.js';

class StateStore {
  constructor() {
    this.activeTab = 'today';
    this.selectedCity = 'Bhavnagar';
    this.selectedCategory = 'all';
    this.selectedDate = 'today';
    this.searchQuery = '';
    
    // Saved events persistent set
    const savedFromStorage = localStorage.getItem('aaje_su_saved_ids');
    this.savedEventIds = new Set(savedFromStorage ? JSON.parse(savedFromStorage) : ['evt-001', 'evt-004']);
    
    // Filter drawer parameters
    this.filterDrawerOpen = false;
    this.filters = {
      timeBand: 'all', // 'all' | 'now' | 'evening' | 'night'
      maxPrice: null, // null (any) | 0 (free) | 300
      maxDistance: 8, // km
      familyFriendly: true,
      acIndoor: false,
      foodOnSite: true
    };

    // Modal state
    this.activeModalEvent = null;
    
    // Events state
    this.events = [...initialEvents];
    this.feedPage = 1;
    this.hasMoreFeed = true;
    this.isLoadingMore = false;

    // Event listeners
    this.listeners = new Set();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    this.listeners.forEach(fn => fn(this));
  }

  // State Mutators
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

  toggleSaveEvent(eventId) {
    if (this.savedEventIds.has(eventId)) {
      this.savedEventIds.delete(eventId);
    } else {
      this.savedEventIds.add(eventId);
    }
    localStorage.setItem('aaje_su_saved_ids', JSON.stringify(Array.from(this.savedEventIds)));
    this.notify();
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
      maxDistance: 8,
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

  addCustomEvent(newEvent) {
    this.events.unshift(newEvent);
    this.setActiveTab('today');
    this.notify();
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

  // Getters & Filter Logic
  getFilteredEvents() {
    return this.events.filter(item => {
      // Category filter
      if (this.selectedCategory !== 'all' && item.category !== this.selectedCategory) {
        return false;
      }
      // Date filter
      if (this.selectedDate !== 'today' && item.date !== this.selectedDate && item.date !== 'today') {
        return false;
      }
      // Search query
      if (this.searchQuery.trim()) {
        const q = this.searchQuery.toLowerCase();
        const matchTitle = item.title.toLowerCase().includes(q);
        const matchVenue = item.venue.toLowerCase().includes(q);
        const matchDesc = item.description.toLowerCase().includes(q);
        if (!matchTitle && !matchVenue && !matchDesc) return false;
      }
      // Time band filter
      if (this.filters.timeBand !== 'all' && item.timeBand !== this.filters.timeBand && item.timeBand !== 'evergreen') {
        return false;
      }
      // Price filter
      if (this.filters.maxPrice === 0 && item.price > 0) return false;
      if (this.filters.maxPrice === 300 && item.price > 300) return false;

      // Vibe filters
      if (this.filters.familyFriendly && !item.features?.familyFriendly) return false;
      if (this.filters.acIndoor && !item.features?.acIndoor) return false;

      return true;
    });
  }

  getSavedEvents() {
    return this.events.filter(item => this.savedEventIds.has(item.id));
  }
}

export const store = new StateStore();
