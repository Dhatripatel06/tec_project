# PRD — "Aaje Su?" (What's on today) — City Activity Feed

**Version:** 0.1 (demo scope)
**Pilot city:** Bhavnagar
**Owner:** Dhatri
**Status:** Draft

---

## 1. Problem

If you're free today in a tier-2 city, there is no single place that tells you what's worth doing. The information exists, but it's scattered across:

- Instagram stories of venues, cafés, and organisers (expire in 24h)
- Facebook event pages (mostly stale)
- WhatsApp forwards from society/college/hobby groups
- Posters stuck on walls and chowk hoardings
- BookMyShow (movies only — and it ignores everything local)

Result: people default to "let's just go to a mall / scroll reels." Organisers of small events get 30 people instead of 100. Both sides lose.

Big-city apps (Insider, District, Skillbox) don't cover Bhavnagar because there isn't enough ticketed inventory to be worth their while. That gap is the opportunity.

---

## 2. Product idea in one line

A daily feed of **things actually worth doing today in your city** — events, but also new food places, exhibitions, tournaments, workshops, temple festivals, and evergreen local picks — curated by a human, not scraped by a bot.

The key differentiator: **it's never empty.** On a dead Tuesday it still tells you something good.

---

## 3. Goals and non-goals

### Goals (v1)
- Answer "I'm free today, what's happening?" in under 10 seconds, without signup.
- Cover ≥ 90% of publicly-known Bhavnagar happenings on any given day.
- Be shareable — one tap to send today's list or a single item to a WhatsApp group.
- Give admins a fast way to add a listing in under 60 seconds from a WhatsApp forward or Instagram poster.

### Non-goals (v1)
- Ticketing / payments. We link out to organiser's WhatsApp or number.
- User-generated social feed, comments, chat.
- Multi-city launch. Build multi-city-ready, launch one city.
- Recommendation ML. Human curation is the moat at this scale.

---

## 4. Users

| Persona | Need | What they do in the app |
|---|---|---|
| **Free-evening user** (18–35, student/working) | "Kya karein aaj?" | Opens feed, filters, shares to friends group |
| **Family planner** (28–50) | Weekend plan with kids | Weekend tab, family + outdoor filters |
| **Organiser** (theatre group, turf owner, café, coaching class) | Fill seats | Submits listing via public form or WhatsApp |
| **Admin / curator** (you, initially) | Keep the feed alive daily | Admin panel — add, moderate, schedule, push |

---

## 5. Content taxonomy

Every listing has exactly one **primary category** and optional tags.

| Category | Examples in Bhavnagar |
|---|---|
| 🎭 Culture & Shows | Gujarati natak, kavi sammelan, dance recital |
| 🎤 Nightlife & Social | Open mic, live music at a café, comedy night |
| 🏏 Sports & Fitness | Turf tournament, marathon, cycling group, yoga camp |
| 🎨 Workshops & Classes | Pottery, art, resin, photography walk, coding bootcamp |
| 🍜 Food & Drink | New opening, limited menu, food festival, launch offer |
| 🛍️ Shopping & Exhibitions | Mela, saree/handicraft expo, book fair, property expo |
| 🛕 Religious & Festivals | Temple utsav, aarti timings, Navratri garba grounds |
| 🎬 Movies | Today's showtimes at local multiplexes |
| 🌳 Outdoors & Day-trips | Victoria Park, Gaurishankar lake, Velavadar blackbuck, Nishkalank Mahadev (tide-dependent) |
| 👨‍👩‍👧 Kids & Family | Play areas, science centre shows, kids' workshops |
| 🤝 Community | Blood donation camp, NGO volunteering, free health camp |
| ⭐ Evergreen Picks | Curated "always good" list used as fallback filler |

**Evergreen is a required feature, not a nice-to-have.** The admin marks ~30 listings as evergreen with a rotation weight; the feed auto-fills with these when a day has fewer than 5 live items.

---

## 6. User app — feature list

### 6.1 MVP (the demo)

**F1 — Today Feed**
- Default city auto-detected, changeable.
- Grouped by time band: `Happening now` → `This afternoon` → `This evening` → `Tonight` → `All day`.
- Card shows: emoji/category chip, title, time, venue, distance, price badge (`Free` / `₹200` / `Entry free`), one-line hook, thumbnail.
- Pinned "Editor's pick of the day" at top.

**F2 — Date tabs**
- `Today` | `Tomorrow` | `This Weekend` | `Calendar view` (month grid with dot indicators).

**F3 — Filters & sort**
- Category multi-select, Free only, Indoor/Outdoor, Family-friendly, Distance radius, Time of day.
- Sort: Recommended (admin rank) / Starting soon / Nearest.

**F4 — Listing detail**
- Full description, poster image, date+time, venue with map pin + "Open in Google Maps", price, organiser name, capacity/registration status.
- CTAs: `Call`, `WhatsApp organiser`, `Register link`, `Add to calendar`, `Share`.

**F5 — Share card generator** *(highest-leverage growth feature)*
- Generates a clean poster image of a single listing, or of the whole "Today in Bhavnagar" list, sized for WhatsApp status and group forwards, watermarked with the app name + link.
- This is how the product spreads in Gujarat. Prioritise it in the demo.

**F6 — Save / Interested**
- Heart to save. `My saves` list. Interested count shown publicly ("18 interested") once above a threshold — social proof without a social graph.

**F7 — Submit a listing (public)**
- Open form: title, category, date/time, venue, price, contact, poster upload.
- Optional: paste an Instagram post link or forward text and let the form pre-fill (see A5).
- Goes to admin moderation queue, never live directly.

**F8 — Notifications**
- Daily digest at 8:00 AM: "5 things to do in Bhavnagar today."
- Evening nudge at 5:30 PM for tonight's items.
- Category-subscribed alerts (e.g. only Sports).
- All opt-in, frequency capped at 2/day.

**F9 — Auth**
- Browsing needs no login. Phone OTP only for saving, submitting, or notifications.

**F10 — Language toggle**
- English / ગુજરાતી. Store both title fields; fall back to English if translation missing.

**F11 — Offline / empty states**
- Cached last feed. Never show a blank screen — always fall back to Evergreen Picks.

### 6.2 Phase 2

- **Surprise me** — one random good plan, shake or tap.
- **Plan with friends** — share a listing to a group, see who's in.
- **Personalised feed** based on saved categories.
- **Business dashboard** — self-serve for cafés/organisers to post and see views.
- **Ticketing / RSVP** with a small booking fee (only once volume exists).
- **Reviews & photos** after the event.
- **Weather-aware feed** — hide outdoor items when it's raining.
- **Multi-city** — Rajkot, Jamnagar, Junagadh, Morbi, Anand.
- **Weekly "Best of the week" newsletter** on WhatsApp.
- **Reels/short-video preview** on listing cards.

---

## 7. Admin panel — feature list

This is the actual product engine. If adding a listing takes more than a minute, the feed dies in week three.

### 7.1 Roles & access
- **Super Admin** — everything, multi-city, user management, billing.
- **City Curator** — full CRUD + moderation for assigned city only.
- **Content Intern** — can create drafts, cannot publish.
- **Partner (business)** — can create/edit only their own listings, always moderated.

### 7.2 Core modules

**A1 — Dashboard (home)**
- Coverage health: item count for today / tomorrow / each of next 7 days, red-flagged when a day has < 5 items.
- Pending moderation count, flagged reports, expiring-soon listings.
- Today's traffic: views, unique users, top listing, share count.

**A2 — Listings manager**
- Table with search, filters (status, category, date range, city, source, submitter).
- Statuses: `Draft` → `Pending` → `Published` → `Expired` / `Rejected` / `Cancelled`.
- Bulk actions: publish, expire, re-category, delete.
- Inline quick-edit of time and status without opening the record.

**A3 — Listing editor**
- Fields: title (EN/GU), description, category, tags, start/end datetime, recurrence rule, venue (linked entity or ad-hoc), price type + amount, organiser (linked), contact number, WhatsApp, external link, poster image + gallery, capacity, is_free, is_family_friendly, is_indoor, rank_weight, is_evergreen, is_featured.
- **Recurrence support** — daily / weekly / specific weekdays / date range, with per-occurrence override and cancel (essential: garba, weekly open mics, exhibitions running 5 days).
- Auto-expiry at end time; expired items drop out of the feed automatically.
- Live preview of how the card will look in the app.

**A4 — Moderation queue**
- Side-by-side: submitted content vs edit form. Approve / Approve-with-edits / Reject with reason (reason is sent to submitter over WhatsApp/SMS).
- Duplicate detection — warns on similar title + same date + same venue.
- Submitter trust score; trusted organisers can be marked auto-publish.

**A5 — Quick-add / AI paste parser** *(biggest time saver)*
- Paste a raw WhatsApp forward or Instagram caption into a box → parsed into structured fields (title, date, time, venue, price, contact) → curator corrects and publishes.
- Also accepts a poster image → OCR → same flow.
- Target: WhatsApp forward to published listing in under 30 seconds.

**A6 — Venue & organiser directory**
- Reusable entities with address, lat/lng, contact, logo, category, past listings.
- Avoids retyping "Gandhi Smriti Hall" fifty times and makes venue pages possible later.

**A7 — Featured & ranking control**
- Drag-to-order the top of today's feed.
- Pin an "Editor's pick" per day.
- Paid boost slots with start/end dates and a slot calendar so two paid boosts don't collide.

**A8 — Notification composer**
- Compose title/body/deep-link, pick segment (all / city / category subscribers / saved-this-listing), send now or schedule.
- Auto-digest template that assembles the 8 AM message from the day's top 5 listings — one click to review and send.
- Delivery + open-rate report per campaign.

**A9 — Evergreen pool manager**
- Curate the fallback list, set rotation weights, see which fillers are being served and how often.

**A10 — Analytics**
- Per listing: impressions, detail views, CTR, saves, shares, contact clicks. Exportable — this is the sales sheet you show a café owner.
- Per category and per day-of-week performance.
- Funnel: feed view → detail → contact click.
- Source attribution for listings (self-added, user-submitted, partner, scraped).

**A11 — Reports & flags**
- User-reported issues (wrong timing, event cancelled, spam) with a resolve workflow.

**A12 — Banners & promos**
- Home banner slots with schedule, target city, click tracking.

**A13 — City management**
- Add city, set boundaries/centre, assign curators, toggle live/coming-soon, city-level content settings.

**A14 — Users**
- List, search, block. Notification opt-in stats. No PII beyond phone number.

**A15 — Audit log**
- Who changed what and when. Non-negotiable once more than one person has access.

**A16 — Daily poster export**
- Generate the "Today in Bhavnagar" image from published listings for posting to the app's own Instagram/WhatsApp status. Turns admin work into marketing output.

---

## 8. Data model (core tables)

```
cities        id, name, name_gu, slug, lat, lng, is_live
venues        id, city_id, name, address, lat, lng, phone, maps_url
organisers    id, city_id, name, phone, whatsapp, instagram, trust_level
categories    id, name, name_gu, emoji, sort_order
listings      id, city_id, category_id, venue_id, organiser_id,
              title, title_gu, description, description_gu,
              start_at, end_at, recurrence_rule, timezone,
              price_type(free|paid|donation), price_min, price_max,
              is_indoor, is_family_friendly, is_evergreen, is_featured,
              rank_weight, capacity, external_url, contact_phone,
              cover_image, gallery[], status, source, submitted_by,
              created_by, published_at, created_at, updated_at
occurrences   id, listing_id, start_at, end_at, is_cancelled   -- expanded recurrences
saves         id, user_id, listing_id, created_at
views         id, listing_id, user_id?, type(impression|detail|contact), created_at
submissions   id, raw_text, parsed_json, image_url, status, reviewed_by, reason
users         id, phone, name?, city_id, lang, notif_prefs, created_at
notifications id, title, body, deep_link, segment, scheduled_at, sent_at, stats
audit_logs    id, actor_id, entity, entity_id, action, diff, created_at
```

Store all times in UTC, render in IST. Query the feed off `occurrences`, not `listings` — otherwise recurring events will break the day view.

---

## 9. Content supply strategy (the real risk)

The app is easy. Filling it every single day is the hard part. Plan for it explicitly:

1. **Manual seeding, weeks 1–8.** One person spends 30 min/day on Instagram, following ~150 local handles: cafés, turf grounds, theatre groups, colleges, hobby classes, malls, temples, municipal corporation, event photographers.
2. **WhatsApp intake number.** Publish a number; organisers forward posters; the paste-parser turns them into listings. Lowest-friction channel for this audience by far.
3. **Anchor partnerships.** 10–15 venues who agree to send their schedule weekly — a multiplex, 2 turfs, 3 cafés, the main auditorium, 2 art studios, a coaching hub.
4. **Public submission form** in the app.
5. **Evergreen pool** so no day is ever empty while 1–4 ramp up.

Success criterion before spending on marketing: **28 consecutive days with ≥ 5 quality items.** If you can't hit that manually, the product doesn't work and no amount of app polish fixes it.

---

## 10. Tech stack (recommended)

**Demo (2 weeks):**
- Next.js (App Router) web app + PWA — installable, shareable by link, no store review. Best for showing clients.
- Admin panel as a separate route group in the same Next.js project.
- Supabase — Postgres, auth (phone OTP), storage for images, row-level security for partner roles.
- Tailwind + shadcn/ui for the admin, custom design for the consumer feed.
- Share-card generation via `@vercel/og` / satori.
- Deploy on Vercel.

**Phase 2:**
- Flutter app for Play Store/App Store, same Supabase backend.
- FCM for push.
- Claude/Gemini API for the paste-parser and OCR in A5.

---

## 11. Screens to build for the demo

**Consumer (6):** Today feed · Filters sheet · Listing detail · Weekend/calendar view · Saved · Submit listing form
**Admin (7):** Login · Dashboard · Listings table · Listing editor · Moderation queue · Quick-add parser · Analytics

That's a credible, demoable product. Everything else is Phase 2.

---

## 12. Success metrics

| Metric | 90-day target |
|---|---|
| Listings published per day | ≥ 6 |
| Days with zero real (non-evergreen) items | 0 |
| MAU (Bhavnagar) | 3,000 |
| D7 retention | 20% |
| Feed → detail CTR | 25% |
| Shares per day | 50 |
| Organiser-submitted share of listings | 40% by day 90 |

---

## 13. Monetisation (later, not in demo)

- Featured/boosted listing — ₹300–1,000 per listing.
- Venue subscription — ₹1,500/month for unlimited listings + analytics.
- Home banner — weekly slot.
- Booking fee once ticketing exists.
- White-label the whole thing to other tier-2 cities — arguably the biggest business here, and the reason to build multi-city into the schema from day one.

Realistically, ad revenue in one tier-2 city is thin. Treat Bhavnagar as the proof, and city-by-city licensing or expansion as the actual model.

---

## 14. Risks

| Risk | Mitigation |
|---|---|
| Content dries up after launch enthusiasm | Evergreen pool + anchor partnerships + WhatsApp intake |
| Stale/cancelled events destroy trust | Auto-expiry, user "report cancelled" button, verify-before-publish for paid events |
| Nobody discovers the app | Share-card virality + daily Instagram poster + college/society WhatsApp seeding |
| Chicken-and-egg with organisers | Free listings forever; charge only for boosts |
| One-person curation burnout | Quick-add parser, intern role, trusted auto-publish |
| Seasonality (Navratri spike, monsoon dip) | Lean into festival calendars; expand categories in lean months |

---

## 15. Suggested build order (10 working days)

| Day | Work |
|---|---|
| 1 | Schema + Supabase setup + auth + roles |
| 2–3 | Admin: listings CRUD, editor, image upload |
| 4 | Admin: dashboard, moderation queue |
| 5–6 | Consumer: today feed, time bands, filters |
| 7 | Consumer: detail page, share card generator |
| 8 | Submit form + recurrence handling + evergreen fallback |
| 9 | Analytics, notifications scaffold, Gujarati toggle |
| 10 | Seed 40 real Bhavnagar listings, polish, deploy |

Seed with real data on day 10. A demo of this idea with fake listings convinces nobody; a demo showing what's actually happening in Bhavnagar this Saturday sells itself.
