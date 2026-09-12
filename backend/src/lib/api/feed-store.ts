export interface FeedEventResponseItem {
  id: string;
  listingId: string;
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

const SEED_EVENTS: FeedEventResponseItem[] = [
  {
    id: "evt-001",
    listingId: "lst-001",
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
    description: "A soulful live Saurashtrian evening uniting classical ghazals with modern contemporary sitar and percussionists. Featuring classical works by Mareez, Kalapi, and new Gujarati acoustic songwriting. Free cutting chai and local sing-along fellowship post-performance.",
    features: { familyFriendly: true, acIndoor: true, foodOnSite: true }
  },
  {
    id: "evt-002",
    listingId: "lst-002",
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
    description: "Vibrant Saurashtra local artisan showcase featuring handcrafted clay pottery, hand-spun organic khadi clothing on wooden display stalls in Bhavnagar city pavilion, naturally lit in golden late afternoon sun.",
    features: { familyFriendly: true, acIndoor: false, foodOnSite: true }
  },
  {
    id: "evt-003",
    listingId: "lst-003",
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
    description: "High energy floodlit box turf cricket match under a dramatic dusk sky in Bhavnagar with passionate young local players batting and bowling on vibrant green turf.",
    features: { familyFriendly: true, acIndoor: false, foodOnSite: true }
  },
  {
    id: "evt-004",
    listingId: "lst-004",
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
    description: "Bhavnagar's biggest weekend theatre laughter riot starring renowned Saurashtrian artists. Two hours of pure family comedy and Gujarati wit. Row D & F selling fast.",
    features: { familyFriendly: true, acIndoor: true, foodOnSite: true }
  },
  {
    id: "evt-005",
    listingId: "lst-005",
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
    description: "Traditional Gujarati evening street food in Bhavnagar, freshly fried crisp hot Bhavnagari gathiya with sliced papaya sambharo and fried green chillies on banana leaf plate. Walk with 20+ locals across 5 legendary food stalls.",
    features: { familyFriendly: true, acIndoor: false, foodOnSite: true }
  }
];

export const LIVE_EVENTS: FeedEventResponseItem[] = [...SEED_EVENTS];

export function addLiveEvent(event: FeedEventResponseItem) {
  LIVE_EVENTS.unshift(event);
}
