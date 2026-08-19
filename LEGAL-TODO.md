# Open legal items

As of 2026-07-20. This file collects legal items that **cannot be resolved in
code** and must be confirmed by ATB / a legal review before the app is publicly
promoted.

## Open

- [ ] **DWA-M 590 – reproduction rights.** The app reproduces table values and
  the calculation methodology from the DWA-M 590 code of practice. DWA codes of
  practice are copyrighted publications. To clarify: is there a permission from
  the DWA to reproduce the tables/values (not merely to cite them)? Contact:
  DWA e.V. (https://www.dwa.de). Technical support from ATB does not
  automatically replace the reproduction license.
  Note that this covers **two** things: the tables, and the annex climate map,
  which ships as a polygon layer (`app/public/data/Klimaraeume.fgb`) — the KWBv
  class the app shows is read straight from it.
  Raised at the 2026-08-19 meeting (`app/doc/feedback/`, item B): **postponed —
  the DWA will discuss it internally.** No answer yet, so the question stands.

- [ ] **Who may use the app?** Not settled: freely available to anyone with the
  link (as today), or restricted to subscribers of the code of practice. This is
  the DWA's call rather than a technical one, but the consequences are technical
  and large — the app currently keeps everything in the browser, with no accounts
  and no server holding user data. Any restriction introduces sign-in, user
  administration and a different data-protection position, and is far cheaper to
  plan for than to retrofit.
  Raised at the 2026-08-19 meeting (item A): **postponed — the DWA will discuss
  it internally.**

  Both A and B therefore remain blockers for **public promotion**, and both now
  sit with the DWA rather than with us. The app stays freely reachable in the
  meantime (test phase, not publicly advertised), which is the status quo the
  meeting left in place — not a decision that it should stay that way.

- [ ] **Confirm supervisory authority.** The privacy policy names the LDA
  Brandenburg (seat in Potsdam) as the competent supervisory authority. Have
  ATB / the data protection officer confirm that this applies to ATB as the
  controller. See `PRIVACY.supervisoryAuthority` in
  `app/src/constants/contact.ts`.

- [ ] **Overall legal review.** Have the imprint, privacy policy, and
  disclaimer reviewed by a qualified legal party before public promotion.

- [ ] **`sw.js` is served with a ten-year HTTP cache** (found 2026-08-19). Not a
  legal item, but it needs a change on the web server rather than in the app.

  What was measured, from the HTTP response itself:

  ```
  GET https://dwa.runlevel3.de/sw.js
  cache-control: max-age=315360000
  cache-control: public
  ```

  `sw.js` is how a client learns that anything changed at all. A browser allowed
  to cache it never re-fetches it, so it can never move off the version it first
  installed: reloading does nothing, and the update banner keeps correctly
  reporting an old running version. Observed on a phone sitting on **0.1.52**
  across several reloads while the server was serving **0.1.54**. The deployed
  files were fine — `sw.js` and `index.html` both referenced the same current
  build.

  `index.html` sends **no** `Cache-Control` at all, which leaves it to browser
  heuristics. Same fix applies.

  **Cause, confirmed 2026-08-19:** a `snippets/cache-expire.conf` whose regex
  `location ~* .(…|js|…)$ { expires max; add_header Cache-Control public; }`
  matches `sw.js` along with the app bundles. nginx runs in a Docker container,
  so this is the container's copy of that snippet, not the tesla host's.

  Nothing in the app can fix it. The serving nginx needs:

  ```nginx
  # The SPA fallback, and therefore the start_url. `try_files … /index.html`
  # rewrites INTERNALLY, which does not re-run location matching — so a
  # `location = /index.html` block alone would only catch the literal path and
  # miss `/` and every deep link. The headers have to sit here.
  # Safe: `location /` is the lowest-priority prefix, so hashed files under
  # /assets/ still match the cache-expire.conf regex and keep their long cache.
  location / {
      index index.html;
      try_files $uri $uri/ /index.html;

      include snippets/hsts-header.conf;   # add_header does not inherit
      add_header Vary X-Requested-With;    # ditto
      add_header Cache-Control "no-cache" always;
      expires -1;
  }

  # Unhashed entry points — never let the HTTP cache hold these.
  location = /sw.js {
      include snippets/hsts-header.conf;
      add_header Vary X-Requested-With;
      add_header Cache-Control "no-cache" always;
      expires -1;
  }

  # Update detection reads this; it must always come from the network.
  # .json is not in cache-expire.conf's extension list today — pin it so a
  # later edit to that list cannot silently break updates.
  location = /data/version.json {
      include snippets/hsts-header.conf;
      add_header Vary X-Requested-With;
      add_header Cache-Control "no-cache" always;
      expires -1;
  }

  # WASM glue (polylookup.js) is unhashed and would otherwise be cached
  # for ten years against a rebuilt .wasm.
  location ^~ /pkg/ {
      include snippets/hsts-header.conf;
      add_header Vary X-Requested-With;
      add_header Cache-Control "no-cache" always;
      expires -1;
  }
  ```

  Four things that decide whether this actually works:

  - **`location =` outranks a regex `location`,** whatever the include order, so
    the exact-match form sidesteps the question of where the block sits relative
    to `cache-expire.conf`. `^~` likewise stops regex evaluation for a prefix.
  - **`try_files` rewrites internally and does NOT re-run location matching.**
    `/` and every SPA deep link are served as index.html from `location /`, so
    headers put only on `location = /index.html` never reach them — including the
    manifest's `start_url` (`/`), which is what an installed PWA requests. This
    was the trap in the first draft of this config.
  - **`always` is required on `add_header`.** Without it the header is dropped on
    `304 Not Modified` — precisely the revalidating case that matters here.
  - **`add_header` does not inherit:** a block containing any `add_header` loses
    every inherited one. Server-level `Vary` and the HSTS snippet therefore have
    to be repeated inside each block that sets a header. Measured on the live
    site before the change: `/index.html` sent HSTS + Vary, while
    `assets/index-*.js` sent neither, because `cache-expire.conf` sets headers.

  Keep the long cache for `assets/**` — those filenames contain a content hash
  and change every build, so they can never go stale. `workbox-*.js` is hashed
  too and can stay cached.

  `scripts/deploy.sh` checks the live `Cache-Control` on `sw.js` after every
  deploy and warns until this is fixed; that check reads the response header, so
  it stays valid regardless of where the config turns out to be.

- [ ] **OSM tile usage.** The app loads map tiles directly from
  `tile.openstreetmap.org`. The OSMF tile usage policy forbids "heavy use".
  Switch to an own/paid tile service as usage grows.
  https://operations.osmfoundation.org/policies/tiles/

- [ ] **Usage figures for the Gelbdruck release** (requested 2026-08-19, not yet
  decided). During the Gelbdruck release the code of practice goes to a selected
  group of users, and we would like to know **how many of them actually took up
  the app** — for that test window only, not permanently.

  *The constraint that shapes every option:* the privacy policy currently states
  under „Kein Tracking" that the app uses no analysis tools, and under „Ihre
  Rechte" that no personal data reaches the operators at all. Anything added to
  the **app** contradicts those sentences and needs the policy changed and the
  ATB data protection officer involved. Anything read from the **web server**,
  which already logs requests and already processes IP addresses, does not — it
  is existing processing, not new collection.

  *There is also no clean definition of a "download".* The web version is a PWA:
  visiting it, installing it and re-opening it look similar from outside, and a
  cached load may not reach the server at all. An honest answer is two numbers,
  not one.

  Recommended, cheapest first:

  1. **Web-server log analysis** on `tesla.runlevel3.de` (GoAccess or AWStats).
     No app change, no new data, nothing to remove afterwards. Report *distinct
     IPs fetching the app shell* over the test window; hits on
     `manifest.webmanifest` / `sw.js` give a weak extra signal for installs.
     Caveats to state whenever the number is quoted: shared and dynamic IPs
     distort it in both directions, and a tester who returns daily is one user,
     not many.

     **Checked on the server 2026-08-19 — this needs work before it can be
     used:**
     - nginx serves the site (files are deployed to
       `/var/www/vhosts/dwa.runlevel3.de/`), but **no vhost config names
       `dwa.runlevel3.de`** — it is not in `sites-enabled/`, and no file under
       `/etc/nginx/` mentions the host. It is evidently served by a catch-all
       (`server_name _;`) that was not tracked down. Other vhosts each write to
       `/var/www/logs/<host>/access.log`; **there is no such directory for this
       host**, so per-site figures cannot be extracted today. Giving the vhost
       its own `access_log` is the prerequisite, and it is a small change.
     - Log rotation is `weekly` with `rotate 52` — **logs are kept for a year.**
       That is far longer than a Gelbdruck test needs. Shorten it for this host,
       or anonymise the IP in the log format (nginx `map` on `$remote_addr` to
       drop the last octet), and **name the retention period in the privacy
       policy** — server logs containing IPs are personal data under the GDPR
       even though nobody looks at them today.
  2. **Play Console statistics** for the Android build. Already exists, costs
     nothing, and genuinely counts installs — but only Android, while the testers
     will mostly use the web version. A complement, never the whole answer.

  Deliberately *not* recommended for this purpose: a counting endpoint fired on
  first launch (contradicts „Kein Tracking" as written, needs consent and DPO
  sign-off for a single number), or self-hosted Matomo (far more apparatus than
  the question warrants). Per-tester access codes would answer it exactly, but
  they depend on the still-open question of who may use the app at all (see
  above) — revisit only if access gets restricted anyway.

  **Decide before the Gelbdruck release starts**, since the count only exists if
  the logging is in place from day one.

## Done

- [x] **Source and licence per dataset** in the ?-dialog (`DATA_SOURCES` in
  `app/src/constants/contact.ts`, rendered by `AboutPage.tsx`). CC BY 4.0 for both
  DWD rasters, ODbL for the map tiles, and the BGR's prescribed citation for the
  soil map. Two errors surfaced while doing this: the nFKWe data is **BÜK250
  V6.0**, not "BÜK 200/1000" as the app and README claimed, and the BGR terms
  require a verbatim citation string that was missing entirely.

- [x] Third-party license texts bundled (`THIRD-PARTY-LICENSES.txt`), linked in
  the ?-dialog.
- [x] Imprint section (§ 5 DDG) in the ?-dialog, link to the full ATB provider
  identification.
- [x] Disclaimer for calculation results.
- [x] Privacy: data protection officer, right to complain/supervisory
  authority, link to the full ATB privacy policy.
- [x] Operator/controller contact shows the ATB address.
