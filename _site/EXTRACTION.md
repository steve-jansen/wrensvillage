# Phase 1 Extraction Report — Wren's Village

**Extracted:** 2026-03-01
**Source:** https://www.wrensvillage.com (Square CMS, JavaScript-rendered)
**Method:** Puppeteer headless browser — content extracted from rendered DOM

---

## Site Inventory (Actual vs. Planned)

The live site has **more pages** than originally inventoried in CLAUDE.md. Full page list:

| Page | Live URL | Slug | Notes |
|---|---|---|---|
| Home | `/` | `home` | |
| Our Impact | `/our-impact` | `our-impact` | |
| Our Story | `/our-story` | `our-story` | **Not in original inventory** |
| Support | `/support` | `support` | **Not in original inventory** — hub for wallets, shop, donations |
| Donate | `/product/donate-to-our-cause-/21` | `donate` | Square product ID: **21** |
| Sponsor a Wallet | `/product/sponsor-a-wallet-/28` | `sponsor-a-wallet` | Square product ID: **28** |
| Contact Us | `/contact-us` | `contact-us` | **Not in original inventory** |
| Privacy Policy | `/privacy-policy` | `privacy-policy` | Note: URL is `/privacy-policy`, not `/privacy` |

> **Action required:** Update the site architecture in CLAUDE.md to reflect the correct privacy URL
> (`/privacy-policy`) and add Our Story, Support, and Contact Us pages to the planned structure.

---

## Proposed URL Mapping (Square → Static)

| Current Square URL | New Static URL | Source file |
|---|---|---|
| `/` | `/` | `index.html` |
| `/our-impact` | `/our-impact` | `our-impact.html` |
| `/our-story` | `/our-story` | `our-story.html` |
| `/support` | `/give` | `give/index.html` |
| `/product/donate-to-our-cause-/21` | `/give` | (section of give page) |
| `/product/sponsor-a-wallet-/28` | `/give/wallet` | `give/wallet.html` |
| `/contact-us` | `/contact` | `contact.html` |
| `/privacy-policy` | `/privacy` | `privacy.html` |

---

## Extracted Text Content (Per Page)

### Home (`/`)

**Title:** Supporting Families & Fighting Cancer | Wren's Village

**H1:** Making a difference in the lives of families impacted by childhood cancer

**Key content blocks:**

1. **Hero:** "Making a difference in the lives of families impacted by childhood cancer"
   CTAs: "Support Us" → `/support`, "Learn more" → `/our-story`

2. **Wren's Story section (H2):**
   "On August 6, 2016, 3-year-old Wren was diagnosed with very high-risk, Acute Lymphoblastic Leukemia (ALL). But Wren and her family are fighters. And Wren bravely battled her cancer with chemotherapy and radiation for 2 and half years. In December 2018, she loudly rang the bell, signaling the end of treatment!"
   CTA: "Learn More" → `/our-story`

3. **We Continue To Fight section (H2):**
   "Forty-three children are diagnosed with pediatric cancer every single day; five of those will not survive. Wren's mother, Brandi, quickly realized that there was work to be done... So she founded Wren's Village, a non-profit to support families just like hers, who are facing a cancer diagnosis. Over the past 5 years, Wren's Village has supported families in the Carolinas and beyond through Wren's Wallets, comfort care item donations, Child Life supply drives, American Red Cross blood drives, awareness events and much more."
   CTA: "How Your Donation Helps" → `/our-impact`

4. **Testimonial (H3 blockquote):**
   "I provided a Wren's Wallet to a 3 year-old neuro oncology patient who had just undergone brain surgery… I went to visit this little sweetheart and when I walked in the room, her eyes lit up and she reached for the little wallet and raised it in the air and smiled at me. She is unable to speak but I believe this was her way of thanking me for the gift"
   — *Anonymous*

5. **Table & Twine partnership section (H2):**
   "Support Wren's Village AND get chef-prepared meals delivered to your door!"
   "Enjoy a delicious meal prepared with fresh, seasonal ingredients that is ready in 20 minutes or less – a fine-dining experience from the comfort of your home. For all orders placed via the link below with the code **Wren10**, Table & Twine will donate 15% of the total to Wren's Village."
   CTA: "Order Today" → https://tableandtwine.com/pages/charlotte

6. **Bottom CTA (H2):** "Join Wren in Helping Families Who Are Battling Pediatric Cancer!"
   CTA: "Support Wren's Village" → `/support`

**Footer:**
"© 2023 | Privacy Policy
Wren's Village is an exempt organization as described in Section 501(c)(3) of the Internal Revenue Code, EIN **83-1475837**."
Email: wrensvillage@icloud.com
Facebook: https://www.facebook.com/wrensvillage
Instagram: https://www.instagram.com/wrensvillage

---

### Our Impact (`/our-impact`)

**Title:** Support for Families Fighting Childhood Cancer | Wren's Village

**H1:** (none — page uses H2 for primary heading)
**Primary H2:** Our Impact

**Key stats (displayed as large callouts):**
- Over $87.5K In Donations
- 250+ Wallets Provided
- 1000+ Units of Blood Donated
- Wren's Bloodmobile

**Content sections:**

1. **Intro:** "There are 43 children diagnosed with cancer every day, and 5 of those 43 will not survive. Investments in research through financial donations from Wren's Village drive advancements in pediatric cancer treatment, while our family support endeavors make a difference in the lives of those impacted by childhood cancer."

2. **Taking Care of Families (H2):**
   - Issue: 1 in 3 families with a child in active cancer treatment are unable to afford basic needs
   - Action: Wren's Wallets filled with $250 in gift cards (gas, medicine, food, fun, hope)
   - Impact: 350+ families supported, stuffed by Wren herself

3. **Blood Donations from Our Village (H2):**
   - Issue: Critical blood shortage when Wren needed transfusions
   - Action: First #AllinForWren blood drive in 2016 — over 200 donors
   - Impact: 1000th unit donated at the 8th annual drive on September 8, 2023; 60% of first-drive donors now donate annually

4. **Wren's Bloodmobile (H3):**
   "The newest bloodmobile added to our local Red Cross fleet was fundraised and paid for in Wren's and pediatric cancer warriors' honor. With four private donor rooms, state-of-the-art equipment and enhanced air filtration systems..."
   Wren's quote: "Let's roll up our sleeves, restock the hospital shelves, and make a profound impact on the lives of kids just like me, locally and across the country."

5. **Funding Pediatric Cancer Research (H2):**
   - Issue: Less than 4% of national cancer research funding goes to pediatric cancer
   - Action: 2016 — neighbors hiked 12 miles for Harlan's Heroes/CureSearch (genesis of "Wren's Village" name); 2021 — Brandi raised $355,000 in 10 weeks for LLS (runner-up Charlotte region, Top 10 nationally); named $100k grants for Mikey and Lily, $50k each for Jennings Palmer and Wren Jansen
   - Also supported: Keep Pounding / Levine Children's Hospital 5K, Red Cross of the Greater Carolinas, Isabella Santos Foundation, Camp Care, Claire's Army
   - Registered with: Guidestar, Benevity, YourCause, Network for Good

6. **Success Stories (H3):**
   - Over $87,500 in wallet sponsorships → 350+ families
   - 1000+ units of blood donated
   - Over $500,000 donated to pediatric cancer research since 2016

7. **Board Members (H3):** Brandi Jansen, Jenny Nemecek, Lea Woodward, Patricia James, Gigi Roland, Emily Davis, Laura Sawyer

---

### Our Story (`/our-story`)

**Title:** Our Story: Wren's Story | Wren's Village

**Key content:**

1. **Wren's Story (H2):** Full personal narrative of Wren's diagnosis (August 6, 2016, age 3, very high-risk ALL), 2½ years of chemotherapy/radiation, 17 blood transfusions, "unicorn juice" nurse story, bell ringing December 2018.

2. **All in for Wren (H2):** Description of community support; Brandi's observations of families making impossible choices in hospital hallways; founding of Wren's Village.

3. **Our Mission (H3):**
   - Wren's Wallets: $250 in gift cards
   - Funding pediatric cancer research (< 4% national funding)
   - Sparking awareness through outreach, education, blood drives

4. **Three Ways to Support (H3):**
   - Support Families → Sponsor a Wallet
   - Fund A Cure → Make a Donation
   - Blood Drives → Donate blood in honor of Wren

5. **Testimonial:** (Same as home page testimonial re: hospital nurse and wallet recipient)

---

### Support (`/support`) — maps to `/give`

**Title:** Supporting Families Fighting Childhood Cancer | Wren's Village

**Key content:**

1. **How You Can Help (H3):** "Discover the many ways you can provide support and ease the unexpected financial burden that pediatric cancer can have on a family."

2. **Wren's Wallets (H2):** Description of $250 wallet program, CTA: "Sponsor a Wallet" → `/product/sponsor-a-wallet-/28`

3. **Shop For The Cause (H3):** Merchandise items (see Merchandise section below)

4. **Donate (H2):** "We are dedicated to never stopping our fight for a cure to end childhood cancer. Any donation amount helps!" CTA: "Give Now" → (Square donation product)

5. **More Ways To Help (H2):**
   - Facebook/Instagram fundraisers (no-fee, go directly to Wren's Village)
   - Care package collection: shower caddies, comfort items, character bandaids, Play-Doh, Legos, craft items, puzzles, stickers, pajamas
   - Brandi speaks at team building events, employer philanthropy campaigns, community groups
   - "Round up" campaigns, spirit nights, gym donation classes, auction items
   - Key statistics displayed: 5 (children who don't survive daily), 17 (Wren's blood transfusions), 43 (diagnosed daily)

6. **Our Sponsors And Friends (H3):** (sponsor logos displayed — no text names extracted)

---

### Donate (`/product/donate-to-our-cause-/21`)

**Title:** Donate to our Cause! | Wren's Village
**Square Product ID:** 21

**Price range:** $1.00 – $50.00
**Preset tiers:** $1, $5, $15, $25, $50 (custom amount also available)

**Description:**
"We are dedicated to never stop fighting for a cure to end childhood cancer. Consider the following donation amounts.
5 — Number of children that do not survive every day
17 — Number of Blood Transfusions Wren has had.
43 — Number of children diagnosed every day.
Any amount helps!"

---

### Sponsor a Wallet (`/product/sponsor-a-wallet-/28`)

**Title:** Wren's Wallet | Wren's Village
**Square Product ID:** 28

**Price:** $250.00 (fixed)

**Description:**
"When you choose to sponsor a wallet, you will be giving directly to families battling pediatric cancer at Levine Children's Hospital or you may direct a wallet to a special child you'd like to support (see below).

Each wallet contains gift cards to alleviate some of the burden of a hospital admission (gas cards, Chick-Fil-A, Panera, Starbucks, Uber/UberEats/Lyft, Walgreens/CVS, Target etc.) and is valued at $250.

If you wish to sponsor a wallet in honor or memory of someone or a special event, please add their name and an address for us to send a recognition card to in the notes at check-out. If you would like to direct the wallet to a specific child, please indicate at checkout and email wrensvillage@gmail.com with details and we will coordinate with you to send to your special warrior."

---

### Contact Us (`/contact-us`)

**Title:** Contact Us: Non-Profit Support | Wren's Village

**Content:**
"Get In Touch — Reach out to us - we'd love to hear from you!"

**Address:**
Wren's Village
2764 Pleasant Road
Suite A-402
Fort Mill, SC 29708-7214

> **Note:** The Privacy Policy page lists a different address (1750 HWY 160 West, Suite 101-263, Fort Mill SC 29708). The contact page address is likely current. Verify with the organization before publishing.

---

### Privacy Policy (`/privacy-policy`)

**Title:** Privacy Policy | Wren's Village

Full policy text extracted — covers: data collection (email, phone), use of contact info, SSL security, cookies, retargeting (Google/Bing/Facebook), CAN-SPAM compliance, links to other sites, user agreement.

**Last Updated:** 10/6/2023

Full text available in: `_site/content/privacy-policy.txt`

---

## Fonts Identified

Square CMS loads several fonts. For the static site, only the non-proprietary ones should be considered:

| Font | Type | Recommendation |
|---|---|---|
| **Larsseit** | Square's proprietary custom font | Replace — not freely available. Closest Google Font: **DM Sans** or **Plus Jakarta Sans** |
| **Quicksand** | Google Font (free) | Can self-host or use Google Fonts CDN |
| **Inter** | Open source (free) | Excellent choice for body text; already used in many projects |
| Square Sans Text VF | Square proprietary | Not for reuse — appears only in Square-injected UI elements |
| Roboto / Helvetica / Arial / system-ui | System/standard | Pico CSS fallback stack — no action needed |

**Recommendation:** Use **Inter** (body text, already loaded on the site) + **Quicksand** (headings, for the warm/friendly brand feel). Both are available via Google Fonts CDN or self-hosted via `fontsource`.

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500&family=Quicksand:wght@600;700&display=swap" rel="stylesheet">
```

---

## Image Inventory

25 unique images downloaded to `_site/assets/images/`. Inventory:

| Filename | Type | Used On | Notes |
|---|---|---|---|
| `Wren1_1689855463.png` | Photo | Home, Our Story | Wren — primary portrait |
| `Wren2_1689855830.jpg` | Photo | Home | Wren — secondary photo |
| `Wren3_1690461473.jpg` | Photo | Our Story | Wren — additional photo |
| `BannerPlaceholder1_1689855152.png` | Photo | Home | Hero/banner image |
| `IMG_7112_1696249099.jpeg` | Photo | Our Impact | Family/program photo |
| `IMG_7378_1696249327.jpeg` | Photo | Our Impact | Family/program photo |
| `IMG_6153_1697471136.jpeg` | Photo | Our Story/Support | Program/event photo |
| `2023-07-27_08-43-40_1690461825.png` | Photo | Our Impact | Blood drive / event |
| `Support1_1696249817.png` | Photo | Our Impact | Support program |
| `Support1-1_1696249880.png` | Photo | Our Impact | Support program (variant) |
| `Support3_1696249896.png` | Photo | Our Impact | Support program |
| `savings_1690461974.png` | Icon | Our Impact | Savings/wallet icon |
| `wallet_1690462003.png` | Icon | Our Impact | Wallet icon |
| `blood-drop_1690461653.png` | Icon | Our Impact | Blood drop icon |
| `motorhome_1690462037.png` | Icon | Our Impact | Bloodmobile icon |
| `PEV7FZK45N2Z23GR5TZCOG7X.png` | Unknown | Support | Possibly sponsor/partner logo |
| `YJQW6J3KNMGXQCM4H45LIQO2.jpeg` | Unknown | Support | Possibly sponsor/partner logo |
| `cashapp.svg` | Payment icon | Donate/Wallet | Square payment method UI |
| `applepay.svg` | Payment icon | Donate/Wallet | Square payment method UI |
| `googlepay.svg` | Payment icon | Donate/Wallet | Square payment method UI |
| `visa.svg` | Payment icon | Donate/Wallet | Square payment method UI |
| `mastercard.svg` | Payment icon | Donate/Wallet | Square payment method UI |
| `americanexpress.svg` | Payment icon | Donate/Wallet | Square payment method UI |
| `discover.svg` | Payment icon | Donate/Wallet | Square payment method UI |
| `jcb.svg` | Payment icon | Donate/Wallet | Square payment method UI |

> **Note:** The payment method SVG icons (cashapp, applepay, etc.) are Square-injected UI elements. They will not be needed on the static site — Square Payment Links provide their own checkout UI.

> **Action needed:** The logo (nav `Wren's Village` text appears to be text, not an image) and any hero/Open Graph image (1200×630px) need to be created or confirmed. The site may use a text logo rather than an image logo — verify in screenshots.

---

## Payment Flows & Square Product IDs

| Product | Square URL | Square Product ID | Price | Notes |
|---|---|---|---|---|
| Donation | `/product/donate-to-our-cause-/21` | **21** | $1–$50 (tiered) | Tiers: $1, $5, $15, $25, $50 |
| Wallet Sponsorship | `/product/sponsor-a-wallet-/28` | **28** | $250 (fixed) | Custom notes field at checkout for "in honor of" |
| Donation (alt) | `/shop/donation/3` | **3** | Unknown | Secondary donation link referenced in nav; may be same product |

### Merchandise (on `/support` page)

| Item | Price | Stock |
|---|---|---|
| Wren's Village Logo Sticker Sheet | $5.00 | Available |
| This girl is on FIRE — Youth Long Sleeve | $15.00 | Available |
| Wren's Village Women's Racer Back Tank | $18.00 | Low stock |
| This girl — Unisex Short Sleeve | $15.00 | Low stock |
| Hope for Wren Unicorn Tee | $10.00 | Low stock |
| Wren's Village Youth Girl's Dri-Fit Tank | $18.00 | Low stock |

> **Action required (human):** Decide whether to carry merchandise forward to the static site. If yes, create Square Payment Links for each SKU. If merchandise is low-stock / being phased out, this may not be worth migrating.

### Phase 2 Actions (Square Dashboard — requires human access)

The following require login to the Square Dashboard and cannot be automated:

- [ ] Create Square Payment Link for general donations (flexible amount, tiers $1/$5/$15/$25/$50)
- [ ] Create Square Payment Link for Wallet Sponsorship ($250 fixed, with "In honor of" custom field and address field for recognition card)
- [ ] Decide on merchandise: create payment links per SKU, or delist
- [ ] Export transaction/donor history before canceling CMS subscription
- [ ] Export any email subscriber list from Square

---

## Organization Details (for JSON-LD / footer)

| Field | Value |
|---|---|
| Legal name | Wren's Village |
| EIN | 83-1475837 |
| Tax status | 501(c)(3) |
| Primary email | wrensvillage@icloud.com (site footer) / wrensvillage@gmail.com (wallet coordination) |
| Mailing address | 2764 Pleasant Road, Suite A-402, Fort Mill, SC 29708-7214 |
| Facebook | https://www.facebook.com/wrensvillage |
| Instagram | https://www.instagram.com/wrensvillage |
| Privacy policy last updated | October 6, 2023 |

---

## Phase 1 Checklist Status

- [x] Screenshot every page of the current site → `_site/screenshots/`
- [x] Extract all text content (headings, paragraphs, CTAs) → `_site/content/*.txt` + `*.json`
- [x] Download all images, logos, and media files → `_site/assets/images/` (25 files)
- [x] Identify and document all fonts used → Inter, Larsseit (replace with DM Sans), Quicksand
- [x] Note all payment/donation flows and their Square product IDs → IDs 21, 28, 3; plus 6 merch SKUs
- [ ] **Export analytics data or subscriber lists from Square** — requires human Square Dashboard access

## Items Requiring Human Action Before Phase 3

1. **Square Dashboard:** Export analytics, transaction history, and email subscriber list
2. **Square Dashboard:** Create Payment Links for donations, wallet sponsorship, and (optionally) merchandise
3. **Address discrepancy:** Privacy Policy shows one Fort Mill address; Contact Us shows another — confirm current address with the organization
4. **Logo file:** Confirm whether the site uses an image logo or text-only. If image, locate/export from Square or brand assets.
5. **Additional photography:** Screenshots are in `_site/screenshots/` for reference — review against extracted images to confirm all visual assets are captured.
