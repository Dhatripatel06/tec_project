'use client';

import React, { useState, useEffect } from 'react';

interface SubmissionItem {
  id: string;
  title: string;
  titleGujarati?: string;
  category: string;
  date: string;
  venue: string;
  price: number;
  organizer: string;
  description: string;
  status: string;
  image?: string;
  isUrgent?: boolean;
}

export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState<'review' | 'live' | 'drafts' | 'flagged'>('review');
  const [searchQuery, setSearchQuery] = useState('');
  const [submissions, setSubmissions] = useState<SubmissionItem[]>([
    {
      id: 'sub-001',
      title: 'Sunset Garba & Raas Jam by Ghogha Shore',
      titleGujarati: 'સૂર્યાસ્ત રાસ અને કચ્છી-કાઠિયાવાડી સંગીત મેળાવડો',
      category: 'Culture & Natak',
      date: 'Today, 6:00 PM – 9:00 PM',
      venue: 'Ghogha Beach Promenade, Plot 4',
      price: 0,
      organizer: 'Kinjal Trivedi',
      description: 'Authentic Saurashtrian sunset Garba gather by Ghogha beach promenade.',
      status: 'NEEDS_REVIEW',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCTKD9ZLiIuJ70L4pJLpIN6NIgYpD1gHYae_1Ce8B6dHW_tn0aM-fJUcZY6z05-zrMxm_YWKurVb6Liwz3kchOT3GHxiaX6TrGGDVtSHc5DZ2Xmr_iFtoCcakNpICax_EqNLY9IeFBh5U7_fVdaZYOkSXhEt9B_YLCXdyQUujnmD2HLnqAxJGt2d6nhElnyoUdH5xTgdRSz2qTRCl3VTRAnFV50HRpdLAgkoxCc8OrSYPsouUi-3ba_Gw',
      isUrgent: true,
    },
    {
      id: 'sub-002',
      title: 'Bhavnagar Startups & Creators Chai Meetup',
      titleGujarati: 'ભાવનગર સ્ટાર્ટઅપ અને ક્રિએટર્સ ચાઇ મિટઅપ',
      category: 'Social & Meetups',
      date: 'Tomorrow, 7:30 AM – 9:30 AM',
      venue: 'Tea Post, Near Victoria Park Circle',
      price: 100,
      organizer: 'Kavit Patel',
      description: 'Casual Sunday morning adda for freelancers, web developers and D2C brand builders.',
      status: 'NEEDS_REVIEW',
      image: '',
      isUrgent: false,
    },
    {
      id: 'sub-003',
      title: 'Saurashtra Handloom & Khadi Utsav 2025',
      titleGujarati: 'સૌરાષ્ટ્ર હસ્તકળા અને ખાદી ઉત્સવ',
      category: 'Exhibitions & Shopping',
      date: 'Nov 15–18, 10:00 AM – 9:00 PM',
      venue: 'Yashwantrai Natyagruh Ground, Bhavnagar',
      price: 0,
      organizer: 'Khadi Gramodyog Board',
      description: 'Over 40 artisanal stalls from Surendranagar, Kutch and Bhavnagar rural clusters.',
      status: 'NEEDS_REVIEW',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBXyNYB_xePgvREtHKMqyDF7LMif_mQsgKIQKXxHwES5TbrFzLf5CXt8YHks-RvEUsM2-QljEojq0CdcJrpl3XIXB4Z7gSrUNc-Hn1wclVtHiSJE1kLquOSARcIUnOmLFXEw31c05zBGBw27Kl1GuINe4FWQsKN2BI0rczRpL1ZmzP213zS_hHn4Xbb4tltoo3PxQgJ-sAJqEGuANtpkYJCx_rvibr3DJTfFQwS5PsH1IGkbBYiOQn-Bg',
      isUrgent: false,
    },
  ]);

  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastSent, setBroadcastSent] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>(['sub-001']);

  const handleApprove = (id: string) => {
    setSubmissions((prev) => prev.filter((item) => item.id !== id));
  };

  const handleReject = (id: string) => {
    setSubmissions((prev) => prev.filter((item) => item.id !== id));
  };

  const handleBroadcast = () => {
    if (!broadcastMessage.trim()) return;
    setBroadcastSent(true);
    setTimeout(() => {
      setBroadcastSent(false);
      setBroadcastMessage('');
    }, 3000);
  };

  return (
    <div className="flex min-h-screen bg-background text-on-surface">
      {/* Left Sidebar Navigation */}
      <aside className="fixed left-0 top-0 h-full w-72 bg-surface-container-low z-50 flex flex-col justify-between shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <div className="flex flex-col">
          {/* Logo & Header */}
          <div className="h-16 px-4 flex items-center justify-between border-b border-surface-container-high">
            <div className="flex items-center gap-2">
              <img
                alt="Aaje Su? Logo"
                className="h-8 w-auto object-contain"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuACMH9AjFrfo0rsl_vhZRsVanXCo7K1DiFaIkMNFh0kypibitPgbUjBoNgYOLY0gRXw49TmEr9IyApHOcN3pDv1X0CqQ2fI7QOczpDfI7qPQZWGOSG-g1NGMH1bN5NesJiXcoFbeIQICFL7_WpQxuJFAVUIZnZ8qbkg0mbeMEejJ0fF8Ex9uTSY3DLZtuv0mVCKMKxzSMpPIs4vC0BjKPz7zeS_vlOlagGa1e6wN4cgy1KyEwgIOa0yQw"
              />
              <div className="flex flex-col">
                <span className="font-bold text-lg text-on-surface leading-none">Aaje Su?</span>
                <span className="text-[10px] text-tertiary uppercase tracking-wider font-bold mt-0.5">
                  Admin Ops
                </span>
              </div>
            </div>
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-on-primary">
              <span className="material-symbols-outlined text-[18px]">person</span>
            </div>
          </div>

          {/* City Hub Switcher */}
          <div className="p-3">
            <div className="bg-surface-container-lowest rounded-xl p-3 shadow-sm border border-surface-container-high">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-primary text-[18px]">
                    location_city
                  </span>
                  <span className="text-xs font-semibold text-on-surface">City Hub</span>
                </div>
                <span className="text-[10px] bg-primary-fixed text-on-primary-fixed-variant px-2 py-0.5 rounded-full font-bold">
                  Bhavnagar Active
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1 text-xs">
                <button className="bg-primary text-on-primary py-1 px-1 rounded-lg text-center font-bold">
                  Bhavnagar
                </button>
                <button className="hover:bg-surface-container-high text-on-surface-variant py-1 px-1 rounded-lg text-center transition-colors">
                  Rajkot <span className="text-[9px] opacity-70">β</span>
                </button>
                <button className="hover:bg-surface-container-high text-on-surface-variant py-1 px-1 rounded-lg text-center transition-colors">
                  Jamnagar
                </button>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-1 px-3 py-2 text-sm font-medium">
            <a
              href="#moderation"
              className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-primary-container text-on-primary-container font-bold"
            >
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[20px]">verified</span>
                <span>Moderation Queue</span>
              </div>
              <span className="bg-primary text-on-primary text-xs px-2 py-0.5 rounded-full font-bold">
                {submissions.length} Pending
              </span>
            </a>
            <a
              href="#listings"
              className="flex items-center justify-between px-3 py-2.5 rounded-xl text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[20px]">local_activity</span>
                <span>Live Listings</span>
              </div>
              <span className="bg-surface-container-highest text-on-surface text-xs px-2 py-0.5 rounded-full font-bold">
                38 Active
              </span>
            </a>
            <a
              href="#venues"
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">storefront</span>
              <span>Organisers & Venues</span>
            </a>
            <a
              href="#analytics"
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">analytics</span>
              <span>City Pulse & Analytics</span>
            </a>
            <a
              href="#evergreen"
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">explore</span>
              <span>Evergreen Guides</span>
            </a>
          </nav>
        </div>

        {/* Curator Profile Footer */}
        <div className="p-3 border-t border-surface-container-high flex flex-col gap-2">
          <a
            href="/"
            target="_blank"
            className="w-full flex items-center justify-center gap-2 py-2 bg-surface-container-lowest text-on-surface hover:bg-surface-container-high rounded-xl border border-surface-container-high text-xs font-semibold transition-colors"
          >
            <span className="material-symbols-outlined text-primary text-[18px]">open_in_new</span>
            <span>View Consumer Feed</span>
          </a>
          <div className="flex items-center gap-2.5 p-2 rounded-xl bg-surface-container-lowest border border-surface-container-high">
            <div className="w-8 h-8 rounded-full bg-secondary-container text-on-secondary-fixed flex items-center justify-center font-bold text-xs">
              HJ
            </div>
            <div className="flex flex-col flex-1 min-w-0">
              <span className="text-xs font-bold text-on-surface truncate">Mitesh Kukdeja</span>
              <span className="text-[10px] text-on-surface-variant truncate">Lead City Curator</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main View Area */}
      <div className="pl-72 flex flex-col min-h-screen w-full">
        {/* Top Header */}
        <header className="fixed top-0 left-72 right-0 h-16 bg-surface/90 backdrop-blur-md z-40 border-b border-surface-container-high flex items-center justify-between px-6">
          <div className="flex items-center gap-3 flex-1 max-w-xl">
            <div className="relative w-full">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-primary text-[20px]">
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search submissions, organizers, phone, venue..."
                className="w-full pl-10 pr-4 py-1.5 bg-surface-container-lowest text-on-surface placeholder:text-on-surface-variant rounded-full text-xs border border-surface-container-high focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden xl:flex items-center gap-2 bg-surface-container-lowest px-3 py-1.5 rounded-full border border-surface-container-high text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="font-semibold text-on-surface">Bhavnagar Feed Live — 38 items</span>
            </div>
            <button className="flex items-center gap-1.5 bg-primary hover:bg-primary-container text-on-primary text-xs font-bold px-4 py-2 rounded-full transition-colors">
              <span className="material-symbols-outlined text-[18px]">add_circle</span>
              <span>Create Official Event</span>
            </button>
          </div>
        </header>

        {/* Dashboard Main Content */}
        <main className="pt-20 px-6 pb-12 flex flex-col gap-6">
          {/* Header Context Ribbon */}
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-4 rounded-2xl bg-surface-container-low border border-surface-container-high">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-on-primary">
                <span className="material-symbols-outlined text-[22px]">verified_user</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-on-surface">Bhavnagar Moderation Desk</h1>
                  <span className="bg-primary-fixed text-on-primary-fixed-variant text-[10px] font-bold px-2 py-0.5 rounded-full">
                    Live Desk • Active
                  </span>
                </div>
                <p className="text-xs text-on-surface-variant">
                  Reviewing community submissions & local city listings for Bhavnagar (સૌરાષ્ટ્ર હબ)
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="px-3 py-1 rounded-full bg-surface-container-lowest text-xs font-semibold shadow-sm">
                Target SLA: &lt; 15 mins
              </div>
              <button className="px-3 py-1 rounded-full bg-primary text-on-primary text-xs font-bold transition-all shadow-sm">
                Refresh Feed
              </button>
            </div>
          </div>

          {/* 4 Top KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-surface-container-lowest border border-surface-container-high shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
                  Pending Verification
                </span>
                <span className="p-1.5 rounded-full bg-primary-fixed text-on-primary-fixed">
                  <span className="material-symbols-outlined text-[18px]">hourglass_top</span>
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-on-surface">{submissions.length}</span>
                <span className="text-[10px] text-primary font-bold bg-primary-fixed/40 px-2 py-0.5 rounded-full">
                  Fast-Track Active
                </span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-surface-container-lowest border border-surface-container-high shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
                  Live Events Today
                </span>
                <span className="p-1.5 rounded-full bg-surface-container-high text-on-surface">
                  <span className="material-symbols-outlined text-[18px]">local_activity</span>
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-on-surface">38</span>
                <span className="text-[10px] text-tertiary font-bold bg-tertiary-fixed/60 px-2 py-0.5 rounded-full">
                  Bhavnagar Hub
                </span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-surface-container-lowest border border-surface-container-high shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
                  RSVPs & Outbound
                </span>
                <span className="p-1.5 rounded-full bg-surface-container-high text-primary">
                  <span className="material-symbols-outlined text-[18px]">touch_app</span>
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-on-surface">1,420</span>
                <span className="text-[10px] text-primary font-bold bg-primary-fixed/40 px-2 py-0.5 rounded-full">
                  +18% Today
                </span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-surface-container-lowest border border-surface-container-high shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
                  Spam / Rejected
                </span>
                <span className="p-1.5 rounded-full bg-error-container text-on-error-container">
                  <span className="material-symbols-outlined text-[18px]">block</span>
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-on-surface">3</span>
                <span className="text-[10px] text-error font-bold bg-error-container/60 px-2 py-0.5 rounded-full">
                  Auto-Flagged
                </span>
              </div>
            </div>
          </div>

          {/* Operational Work Desk Split */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Moderation Submissions (8 cols) */}
            <div className="lg:col-span-8 flex flex-col gap-4">
              {/* Filter Tabs */}
              <div className="flex items-center justify-between bg-surface-container-low p-1.5 rounded-2xl border border-surface-container-high">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setActiveTab('review')}
                    className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      activeTab === 'review'
                        ? 'bg-inverse-surface text-inverse-on-surface shadow-sm'
                        : 'text-on-surface-variant hover:bg-surface-container-high'
                    }`}
                  >
                    Needs Review ({submissions.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('live')}
                    className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      activeTab === 'live'
                        ? 'bg-inverse-surface text-inverse-on-surface shadow-sm'
                        : 'text-on-surface-variant hover:bg-surface-container-high'
                    }`}
                  >
                    Approved & Live (38)
                  </button>
                </div>
              </div>

              {/* Submissions List */}
              {submissions.map((item) => (
                <div
                  key={item.id}
                  className="p-5 rounded-2xl bg-surface-container-lowest border border-surface-container-high shadow-sm flex flex-col gap-4 relative overflow-hidden"
                >
                  {item.isUrgent && (
                    <div className="bg-primary-fixed/40 -mx-5 -mt-5 px-5 py-2 flex items-center justify-between border-b border-primary-fixed">
                      <div className="flex items-center gap-2 text-primary font-bold text-xs">
                        <span className="material-symbols-outlined text-[16px] animate-pulse">
                          alarm
                        </span>
                        <span>Starts in &lt; 4 hrs • High Local Interest</span>
                      </div>
                      <span className="text-[10px] bg-primary text-on-primary px-2 py-0.5 rounded-full font-bold">
                        Priority
                      </span>
                    </div>
                  )}

                  <div className="flex flex-col md:flex-row gap-4 items-start">
                    {item.image ? (
                      <div className="w-full md:w-40 h-44 rounded-xl overflow-hidden bg-surface-container-high shrink-0 relative">
                        <img
                          src={item.image}
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-full md:w-40 h-44 rounded-xl overflow-hidden bg-surface-container-high shrink-0 flex flex-col items-center justify-center p-3 text-center border border-dashed border-outline-variant">
                        <span className="material-symbols-outlined text-[32px] text-tertiary opacity-60">
                          image_not_supported
                        </span>
                        <span className="text-[10px] text-on-surface-variant mt-1">
                          No poster uploaded
                        </span>
                      </div>
                    )}

                    <div className="flex flex-col flex-1 gap-1.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="bg-surface-container-high text-on-surface text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                          {item.category}
                        </span>
                        <span className="bg-secondary-fixed text-on-secondary-fixed text-[10px] font-bold px-2 py-0.5 rounded-full">
                          {item.price === 0 ? 'Free Entry' : `₹${item.price}`}
                        </span>
                      </div>

                      <h2 className="text-base font-bold text-on-surface leading-snug">
                        {item.title}
                      </h2>
                      {item.titleGujarati && (
                        <p className="text-xs text-tertiary font-semibold">{item.titleGujarati}</p>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-surface-container-low p-2.5 rounded-xl border border-surface-container-high mt-1">
                        <div>
                          <span className="text-on-surface-variant block text-[10px]">Timing</span>
                          <span className="font-bold text-on-surface">{item.date}</span>
                        </div>
                        <div>
                          <span className="text-on-surface-variant block text-[10px]">Venue</span>
                          <span className="font-bold text-on-surface truncate block">{item.venue}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mt-1 text-xs">
                        <span className="font-bold text-on-surface">{item.organizer}</span>
                        <span className="text-on-surface-variant">• Verified Contributor</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-surface-container-high">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleApprove(item.id)}
                        className="px-4 py-1.5 rounded-full bg-primary hover:bg-primary-container text-on-primary text-xs font-bold transition-colors shadow-sm flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[16px]">publish</span>
                        <span>Approve & Push Live</span>
                      </button>
                    </div>
                    <button
                      onClick={() => handleReject(item.id)}
                      className="px-3 py-1.5 rounded-full text-error hover:bg-error-container text-xs font-semibold transition-colors"
                    >
                      Reject Submission
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Right Column: City Ops Widgets (4 cols) */}
            <div className="lg:col-span-4 flex flex-col gap-4">
              {/* Category Feed Quality Widget */}
              <div className="p-4 rounded-2xl bg-surface-container-lowest border border-surface-container-high shadow-sm flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-[20px]">
                      balance
                    </span>
                    <h3 className="font-bold text-sm text-on-surface">Feed Quality Health</h3>
                  </div>
                  <span className="text-[10px] bg-surface-container-high px-2 py-0.5 rounded-full font-bold">
                    Bhavnagar
                  </span>
                </div>

                <div className="space-y-2.5 text-xs pt-1">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span>Street Food & Addas</span>
                      <span className="font-bold">8 live</span>
                    </div>
                    <div className="w-full h-1.5 bg-surface-container rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full w-[85%]"></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between mb-1">
                      <span>Culture & Natak</span>
                      <span className="font-bold">5 live</span>
                    </div>
                    <div className="w-full h-1.5 bg-surface-container rounded-full overflow-hidden">
                      <div className="h-full bg-tertiary rounded-full w-[65%]"></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between mb-1 text-error">
                      <span>Kids & Family</span>
                      <span className="font-bold">1 live (Low)</span>
                    </div>
                    <div className="w-full h-1.5 bg-surface-container rounded-full overflow-hidden">
                      <div className="h-full bg-error rounded-full w-[15%]"></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Neighborhood Distribution */}
              <div className="p-4 rounded-2xl bg-surface-container-lowest border border-surface-container-high shadow-sm flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-[20px]">
                      explore
                    </span>
                    <h3 className="font-bold text-sm text-on-surface">Neighborhood Clusters</h3>
                  </div>
                  <span className="text-xs font-bold">38 Total</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-primary-fixed/30 border border-primary-fixed/50">
                    <span className="text-lg font-bold text-primary block leading-none">14</span>
                    <span className="font-bold block mt-1">Waghawadi</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-surface-container-high">
                    <span className="text-lg font-bold block leading-none">8</span>
                    <span className="font-bold block mt-1">Nilambag</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-surface-container-high">
                    <span className="text-lg font-bold block leading-none">7</span>
                    <span className="font-bold block mt-1">Ghogha Circle</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-surface-container-high">
                    <span className="text-lg font-bold block leading-none">5</span>
                    <span className="font-bold block mt-1">Kaliyabid</span>
                  </div>
                </div>
              </div>

              {/* Hyperlocal WhatsApp Broadcast Tool */}
              <div className="p-4 rounded-2xl bg-surface-container-lowest border border-surface-container-high shadow-sm flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-[20px]">
                      campaign
                    </span>
                    <h3 className="font-bold text-sm text-on-surface">Hyperlocal Broadcast</h3>
                  </div>
                  <span className="text-[10px] bg-surface-container-high px-2 py-0.5 rounded-full font-bold">
                    3,420 Subscribed
                  </span>
                </div>

                <textarea
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  placeholder="e.g. Coastal winds picking up at Ghogha Beach. Evening Raas session shifted..."
                  className="w-full p-3 rounded-xl bg-surface-container-low text-xs border border-surface-container-high focus:outline-none resize-none"
                  rows={3}
                />

                <button
                  onClick={handleBroadcast}
                  className="w-full py-2.5 rounded-full bg-inverse-surface text-inverse-on-surface text-xs font-bold hover:bg-black transition-colors flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-[16px] text-primary-fixed">
                    send_to_mobile
                  </span>
                  <span>{broadcastSent ? 'Broadcast Sent!' : 'Broadcast to Bhavnagar'}</span>
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
