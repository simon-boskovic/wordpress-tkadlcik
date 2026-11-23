# Local SEO findings - radostvpohybu.cz (2026-11-23)

**Score: 58/100.** GBP signals 8/25, Reviews 4/20, On-page 17/20, NAP and citations 8/15, Schema 8/10, Links and authority 3/10. This is based on on-site data only (see Limitations).

Business type: hybrid / service-area. A lone instructor runs lessons in a rented school gym, and the registered office (Pod vinohradem, Praha 4 - Branik) is a different address. Vertical: sports / wellness (tai chi, qigong). Proximity (about 55% of ranking variance) is outside our control.

## What works
- The venue address Jeremenkova 1003/66A, 147 00 Praha 4 and the phone +420773287113 (`tel:` link) match across the visible HTML, JSON-LD and llms.txt. The e-mail is consistent too.
- Local schema is solid. The `@graph` holds Organization, SportsActivityLocation `/#praha`, Person, WebSite and WebPage, linked by `@id`.
  - `SportsActivityLocation` is a correct subtype.
  - It has geo at 5 decimals (50.04301, 14.42334), hasMap, priceRange, telephone and url.
  - Organization has legalName, the IČO as an identifier, and `location` pointing to `#praha`.
- The Czech title and description carry "Praha 4" and "ZŠ Jeremenkova". The map is a click-to-load Google embed with a link fallback, and there is a facade photo of the building.
- Zlín is fully removed from the home page (0 occurrences).
- The sitemap and llms.txt exist.

## Findings

### 1. No Google Business Profile found or linked - High
Evidence: https://radostvpohybu.cz/ and /kontakt/ link to no GBP, `g.page` or maps.app short link, and show no review widget. `hasMap` is only a search URL (`maps/search/?api=1&query=...`), not a place URL. I could not confirm through search whether a profile exists (see Limitations).

Is a GBP advisable? Yes, as a service-area / hybrid profile.
- Group lessons at a fixed venue and fixed times can qualify, provided the hours listed are the real class times. Do not list the business as always staffed.
- Do not use the registered office (Pod vinohradem) as the profile address. It is not a customer-facing location.
- Recommended setup:
  - Address: the venue Jeremenkova 1003/66A, if the school allows it. Otherwise hide the address and set the service area to Praha 4, 11 and 12.
  - Primary category: "Tai chi school" (the primary category is the top ranking factor). Add secondary categories such as "Fitness instructor" or "Qigong studio" if available.
  - Name: "Radost v pohybu", with no keyword stuffing.
  - Fill in phone, website, hours (class times), services (Osm kusů brokátu, 13 slov tchaj-ťi, Yang) and real photos.
  - Verify by postcard or video.
  - Post the seminars (28.-29. 11.) as events, and ask students for reviews at a steady pace.

Fix on the site once the profile exists: add its URL to `sameAs` on Organization and `#praha`, replace `hasMap` with the real place URL, and add a "Zobrazit na Google Maps" link and a "Napsat recenzi" link on /kontakt/.

### 2. No review or reputation data on site or in schema - High
Evidence: https://radostvpohybu.cz/ has no aggregateRating, no testimonials and no review links.
Fix: collect Google reviews and show a few genuine testimonials with permission. Add AggregateRating only if it matches visible, real reviews (self-serving ratings on a local business are not eligible for rich results anyway).

### 3. Weak citation and entity footprint - High
Evidence:
- Organization `sameAs` is missing. Only Person has `sameAs`, with two YouTube channels.
- No Facebook, Firmy.cz, Mapy.cz or Seznam link on the site.
- Firmy.cz search for "Radost v pohybu" is JS-rendered and returned only a page title, so I could not confirm a listing.

Fix: create or claim the listings below, all with identical NAP (name, Jeremenkova address, +420 773 287 113, URL). Then add the URLs to Organization `sameAs`.
- Firmy.cz / Mapy.cz (the key Czech source, feeds Seznam)
- Google Business Profile
- Facebook page
- Bing Places and Apple Business Connect
- Czech niche directories (tai chi / qigong associations, course portals)

### 4. The old site dan24.webnode.cz is still live and has old NAP and Zlín text - Medium
Evidence: https://dan24.webnode.cz/ returns HTTP 200 and its HTML still contains Jeremenkova and "Zlíně".
Risk: duplicate NAP and stale Zlín information, a potential citation conflict.
Fix: update it now, or switch it off. Webnode free plans cannot send 301 redirects. If so, reduce it to one page that links to radostvpohybu.cz, or delete the site.

### 5. Organization address differs from the visible address - Medium
Evidence: Organization `address` is Pod vinohradem 68/18 (Praha 4 - Braník), while `location` is `#praha` (Jeremenkova). The visible /kontakt/ page shows only the Jeremenkova address, so the structured and visible addresses differ.
Risk: Google may treat the Organization address as a business location and mix it up with the venue. It also publishes what may be a home address.
Fix: either remove the Organization postal address (keep legalName and IČO), or show it visibly, labelled "sídlo (výuka zde neprobíhá)". The first option is safer if the owner works from home.

### 6. Service area is only "Praha 4" - Medium
Evidence: `areaServed: ["Praha 4"]` is a bare string.
Fix: use typed `AdministrativeArea`/`City` entries (Praha 4, 11, 12, Praha) and mention the neighbourhoods (Braník, Krč, Michle, Modřany) in the copy, without making doorway pages.

### 7. No openingHoursSpecification on `#praha` - Medium
Evidence: no hours in the JSON-LD (class times are only on /kurzy-a-lekce/).
Fix: add `openingHoursSpecification` for the weekly class slots, or leave it out and rely on Event/Course markup. It must match the future GBP hours.

### 8. Map is a text-search embed, not a place embed - Low
Evidence: the embed uses `output=embed` with a text query. Fix: after the GBP exists, use the place embed or a `maps.app` link.

### 9. E-mail on a consumer domain - Info
tkadlcik@centrum.cz is fine, but an address on the domain would add trust. This is a minor entity signal.

## Limitations
- I had no web-search tool. Direct fetches of Google, Bing and DuckDuckGo returned no usable result lists, and Firmy.cz is JS-rendered. Whether a Google Business Profile, Firmy.cz, Facebook or Mapy.cz listing already exists, and what NAP it shows, is therefore **unverified**. Check manually by searching "Radost v pohybu Praha 4" in Google Maps and on Firmy.cz.
- Ratings, review counts, velocity and response rate could not be assessed. No local-pack or DataForSEO data. Yelp/BBB were not checked (not relevant in the Czech Republic).
- The old webnode site was checked only for HTTP status and a keyword grep of its HTML.
