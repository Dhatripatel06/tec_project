export interface SubmissionRecord {
  id: string;
  title: string;
  titleGujarati?: string;
  category: string;
  date: string;
  venue: string;
  price: number;
  contact?: string;
  organizer: string;
  description: string;
  status: string;
  image?: string;
  isUrgent?: boolean;
  createdAt: string;
}

const globalForSubmissions = globalThis as unknown as {
  _pendingSubmissions?: SubmissionRecord[];
  _customZones?: string[];
};

const INITIAL_SUBMISSIONS: SubmissionRecord[] = [
  {
    id: 'sub-001',
    title: 'Sunset Garba & Raas Jam by Ghogha Shore',
    titleGujarati: 'સૂર્યાસ્ત રાસ અને કચ્છી-કાઠિયાવાડી સંગીત મેળાવડો',
    category: 'culture',
    date: 'Today, 6:00 PM – 9:00 PM',
    venue: 'Ghogha Beach Promenade, Plot 4',
    price: 0,
    organizer: 'Kinjal Trivedi',
    description: 'Authentic Saurashtrian sunset Garba gather by Ghogha beach promenade.',
    status: 'NEEDS_REVIEW',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCTKD9ZLiIuJ70L4pJLpIN6NIgYpD1gHYae_1Ce8B6dHW_tn0aM-fJUcZY6z05-zrMxm_YWKurVb6Liwz3kchOT3GHxiaX6TrGGDVtSHc5DZ2Xmr_iFtoCcakNpICax_EqNLY9IeFBh5U7_fVdaZYOkSXhEt9B_YLCXdyQUujnmD2HLnqAxJGt2d6nhElnyoUdH5xTgdRSz2qTRCl3VTRAnFV50HRpdLAgkoxCcOrSYPsouUi-3ba_Gw',
    isUrgent: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'sub-002',
    title: 'Bhavnagar Startups & Creators Chai Meetup',
    titleGujarati: 'ભાવનગર સ્ટાર્ટઅપ અને ક્રિએટર્સ ચાઇ મિટઅપ',
    category: 'social',
    date: 'Tomorrow, 7:30 AM – 9:30 AM',
    venue: 'Tea Post, Near Victoria Park Circle',
    price: 100,
    organizer: 'Kavit Patel',
    description: 'Casual Sunday morning adda for freelancers, web developers and D2C brand builders.',
    status: 'NEEDS_REVIEW',
    image: '',
    isUrgent: false,
    createdAt: new Date().toISOString(),
  },
];

const INITIAL_ZONES: string[] = [
  'Waghawadi',
  'Nilambag',
  'Ghogha Circle',
  'Kaliyabid',
  'Crescent',
  'Subhashnagar',
];

export const PENDING_SUBMISSIONS: SubmissionRecord[] =
  globalForSubmissions._pendingSubmissions ||
  (globalForSubmissions._pendingSubmissions = INITIAL_SUBMISSIONS);

export const CUSTOM_ZONES: string[] =
  globalForSubmissions._customZones ||
  (globalForSubmissions._customZones = INITIAL_ZONES);

export function addZone(zoneName: string) {
  if (zoneName && typeof zoneName === 'string') {
    const trimmed = zoneName.trim();
    if (trimmed && !CUSTOM_ZONES.includes(trimmed)) {
      CUSTOM_ZONES.push(trimmed);
    }
  }
}
