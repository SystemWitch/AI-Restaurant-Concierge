/* D.R. Restaurant: the restaurant website.
 *
 * This file knows nothing about avatars, LiveKit or Synthesia. It builds the
 * page and exposes one global, SITE, with one method per tool the agent has:
 *
 *   SITE.show_section({ section })
 *   SITE.filter_menu({ diet })
 *   SITE.focus_dish({ dish })
 *   SITE.add_to_order({ dish })
 *
 * index.html just forwards tool calls into it. Everything here also works on
 * its own, so you can click through the site with the agent switched off.
 */

// ---------------------------------------------------------------- the menu --

// kind: meat | seafood | vegetarian | vegan     gf: no gluten
const MENU = [
  { id: 'openers', label: 'Openers', kicker: 'To begin', dishes: [
    { id: 'oysters', name: 'Oysters', note: 'Green apple mignonette, chive oil', price: 18,
      kind: 'seafood', gf: true, from: 'Kumamoto, half dozen',
      pairing: 'Chablis, Domaine Séguinot', pairNote: 'Chalky and bone dry, which is the whole point against the brine.' },
    { id: 'focaccia', name: 'Rosemary Focaccia', note: 'Cultured butter, flaked salt', price: 9,
      kind: 'vegetarian', gf: false, from: 'Baked to order, twenty minutes',
      pairing: 'Fino sherry', pairNote: 'Salt against salt. Ask for it cold.' },
    { id: 'radishes', name: 'Garden Radishes', note: 'Seaweed butter, sea salt', price: 12,
      kind: 'vegan', gf: true, from: 'Grown four miles from the room',
      pairing: 'Grüner Veltliner', pairNote: 'Peppery enough to meet the radish head on.' },
  ]},
  { id: 'first', label: 'First Courses', kicker: 'Before the main', dishes: [
    { id: 'beets', name: 'Roasted Beets', note: 'Smoked almond, dill, aged vinegar', price: 16,
      kind: 'vegan', gf: true, allergens: 'Tree nuts', from: 'Roasted in salt for four hours',
      pairing: 'Beaujolais, Morgon', pairNote: 'Served cool. Earth for earth.' },
    { id: 'squash', name: 'Delicata Squash', note: 'Brown butter, crisp sage, pepitas', price: 17,
      kind: 'vegetarian', gf: true, from: 'On the menu until the first frost',
      pairing: 'Oaked Chardonnay', pairNote: 'The one dish where oak is not a mistake.' },
    { id: 'crudo', name: 'Hamachi Crudo', note: 'Blood orange, fresno chili, olive oil', price: 22,
      kind: 'seafood', gf: true, from: 'Cut to order',
      pairing: 'Albariño', pairNote: 'Citrus on citrus, with enough salinity to carry the chili.' },
    { id: 'burrata', name: 'Burrata', note: 'Late summer tomato, basil oil, sourdough', price: 19,
      kind: 'vegetarian', gf: false, allergens: 'Dairy, gluten',
      from: 'Pulled this morning', pairing: 'Rosé, Bandol', pairNote: 'Dry, a little savoury, never sweet.' },
  ]},
  { id: 'mains', label: 'Mains', kicker: 'The centre of the meal', dishes: [
    { id: 'halibut', name: 'Halibut', note: 'Fennel, saffron broth, preserved lemon', price: 38,
      kind: 'seafood', gf: true, from: 'Line caught, day boat',
      pairing: 'White Burgundy', pairNote: 'The broth is the dish. Give it something with weight.' },
    { id: 'duck', name: 'Duck Breast', note: 'Sour cherry, charred scallion, jus', price: 42,
      kind: 'meat', gf: true, from: 'Dry aged eight days',
      pairing: 'Pinot Noir, Oregon', pairNote: 'Cherry in the glass and cherry on the plate.' },
    { id: 'shortrib', name: 'Short Rib', note: 'Horseradish cream, bone marrow jus', price: 46,
      kind: 'meat', gf: true, from: 'Braised seventy-two hours',
      pairing: 'Northern Rhône Syrah', pairNote: 'Peppery, structured, enough tannin to cut the fat.' },
    { id: 'mushroom', name: 'King Oyster Mushroom', note: 'Pearl barley, black garlic, thyme', price: 32,
      kind: 'vegan', gf: false, allergens: 'Gluten (barley)',
      from: 'Seared like a scallop', pairing: 'Nebbiolo', pairNote: 'Our most requested vegan pairing.' },
    { id: 'celeriac', name: 'Celeriac Steak', note: 'Hazelnut crumb, green peppercorn', price: 30,
      kind: 'vegetarian', gf: true, allergens: 'Tree nuts, dairy',
      from: 'Roasted whole in a salt crust', pairing: 'Chenin Blanc, Loire', pairNote: 'Dry, waxy, a touch of smoke.' },
  ]},
  { id: 'desserts', label: 'Desserts', kicker: 'To finish', dishes: [
    { id: 'pavlova', name: 'Pavlova', note: 'Passionfruit, lime, torched meringue', price: 14,
      kind: 'vegetarian', gf: true, allergens: 'Egg',
      pairing: 'Moscato d\'Asti', pairNote: 'Low alcohol, high perfume.' },
    { id: 'chocolate', name: 'Dark Chocolate Crémeux', note: 'Olive oil, maldon salt', price: 15,
      kind: 'vegetarian', gf: true, allergens: 'Dairy',
      pairing: 'Tawny port, 10 year', pairNote: 'The classic, and still the right answer.' },
    { id: 'sorbet', name: 'Blackcurrant Sorbet', note: 'Shiso, black pepper', price: 11,
      kind: 'vegan', gf: true, from: 'Churned to order',
      pairing: 'Nothing', pairNote: 'This one is better on its own.' },
  ]},
];

const TASTING = [
  ['Oysters', 'green apple, chive'],
  ['Garden radishes', 'seaweed butter'],
  ['Hamachi crudo', 'blood orange, chili'],
  ['Roasted beets', 'smoked almond, dill'],
  ['Halibut', 'fennel, saffron broth'],
  ['Duck breast', 'sour cherry, scallion'],
  ['Dark chocolate crémeux', 'olive oil, salt'],
];

const FLIGHTS = [
  { name: 'The Classic', price: 85, note: 'Seven pours from Burgundy, the Loire and the Northern Rhône. The pairing we have served since the room opened.' },
  { name: 'The Low Road', price: 55, note: 'Lower alcohol throughout. Riesling, Beaujolais, sherry. Designed so you can still hold a conversation at course seven.' },
  { name: 'Zero Proof', price: 45, note: 'Fermented teas, verjus, clarified stone fruit. Built by the same hands, with nothing to apologise for.' },
];

const DIETS = {
  none:        { label: 'Everything',   ok: () => true },
  vegetarian:  { label: 'Vegetarian',   ok: (d) => d.kind === 'vegetarian' || d.kind === 'vegan' },
  vegan:       { label: 'Vegan',        ok: (d) => d.kind === 'vegan' },
  pescatarian: { label: 'Pescatarian',  ok: (d) => d.kind !== 'meat' },
  gluten_free: { label: 'Gluten free',  ok: (d) => d.gf },
};

const ALL = MENU.flatMap((s) => s.dishes);
const byId = (id) => ALL.find((d) => d.id === id);
const money = (n) => '$' + n.toFixed(0);

// ------------------------------------------------------------------ build --

const tagsOf = (d) => [
  d.kind === 'vegan' ? 'Vegan' : d.kind === 'vegetarian' ? 'Vegetarian' : null,
  d.kind === 'seafood' ? 'Seafood' : null,
  d.gf ? 'Gluten free' : null,
  d.allergens ? d.allergens : null,
].filter(Boolean);

document.getElementById('site').innerHTML = `
<nav>
  <div class="nav-left">
    <a href="#tasting">Menu</a>
    <a href="#wine">Cellar</a>
    <a href="#room">The Room</a>
  </div>
  <a class="mark" href="#top">D.R. <span>Restaurant</span></a>
  <div class="nav-right">
    <div class="diet-chip"><span id="diet-label"></span><button title="Clear">&times;</button></div>
    <a class="btn nav-btn" href="#reserve">Reserve</a>
  </div>
</nav>

<header id="top">
  <div class="hero">
    <div class="crest" aria-hidden="true">DR</div>
    <p class="hero-eyebrow">New York &middot; Est. 2016</p>
    <h1><span>D.R.</span><em>Restaurant</em></h1>
    <div class="ornament" aria-hidden="true"><span></span><i></i><span></span></div>
    <p class="lede">A single tasting menu, written each morning around whatever arrived
      that day. Ava, our ma&icirc;tre d', will take you through it.</p>
    <div class="hero-actions">
      <a class="btn" href="#reserve">Reserve a table</a>
      <a class="text-link" href="#tasting">Explore the menu <span aria-hidden="true">&rarr;</span></a>
    </div>
  </div>
  <div class="hero-foot">
    <div class="hero-meta"><span>Thursday &ndash; Sunday</span><span>6pm &amp; 9pm</span><span>Twenty-two seats</span></div>
  </div>
</header>

<section id="tasting"><div class="wrap">
  <div class="sec-head">
    <span class="sec-no">01</span>
    <div class="sec-title"><p class="kicker">The Menu</p><h2>The Tasting</h2></div>
    <p class="sec-note">Written 29 September</p>
  </div>
  <div class="tasting">
    <div class="tasting-main">
      <p class="tasting-intro">Seven courses, one seating. The kitchen sends the menu as it is written each morning.</p>
      <ol class="courses">
        ${TASTING.map(([n, s], i) => `<li>
          <span class="course-no">${String(i + 1).padStart(2, '0')}</span>
          <span class="course-name">${n}</span>
          <i class="leader"></i>
          <small>${s}</small>
        </li>`).join('')}
      </ol>
    </div>
    <aside class="tasting-side">
      <p class="kicker">Per person</p>
      <div class="price-big">$135</div>
      <p>Wine pairings from $45.</p>
      <div class="ornament small" aria-hidden="true"><span></span><i></i><span></span></div>
      <p>A full vegan menu is available with a day's notice, and we will work
         around any allergy if you tell us before you arrive.</p>
      <a class="text-link" href="#reserve">Reserve a table <span aria-hidden="true">&rarr;</span></a>
    </aside>
  </div>
</div></section>

${MENU.map((sec, i) => `
<section id="${sec.id}"><div class="wrap">
  <div class="sec-head">
    <span class="sec-no">${String(i + 2).padStart(2, '0')}</span>
    <div class="sec-title"><p class="kicker">${sec.kicker}</p><h2>${sec.label}</h2></div>
    <span class="count" data-count="${sec.id}"></span>
  </div>
  <div class="dishes">
    ${sec.dishes.map((d) => `
      <div class="dish" data-dish="${d.id}">
        <div class="dish-head">
          <h3>${d.name}</h3>
          <i class="leader"></i>
          <span class="price">${money(d.price)}</span>
        </div>
        <p>${d.note}</p>
        <div class="tags">${tagsOf(d).map((t) => `<span class="tag">${t}</span>`).join('')}</div>
      </div>`).join('')}
  </div>
</div></section>`).join('')}

<section id="wine"><div class="wrap">
  <div class="sec-head">
    <span class="sec-no">06</span>
    <div class="sec-title"><p class="kicker">The Cellar</p><h2>Pairings</h2></div>
    <p class="sec-note">Three ways through the menu</p>
  </div>
  <div class="flights">
    ${FLIGHTS.map((f, i) => `<article class="flight">
      <span class="flight-no">0${i + 1}</span>
      <h3>${f.name}</h3>
      <p>${f.note}</p>
      <div class="flight-foot"><span class="price">${money(f.price)}</span><span class="flight-unit">per guest</span></div>
    </article>`).join('')}
  </div>
</div></section>

<section id="quote" class="quote"><div class="wrap">
  <p class="quote-mark" aria-hidden="true">&ldquo;</p>
  <blockquote>The menu is written each morning, and it is never the same twice.</blockquote>
  <p class="quote-by">The Kitchen</p>
</div></section>

<section id="room"><div class="wrap">
  <div class="sec-head">
    <span class="sec-no">07</span>
    <div class="sec-title"><p class="kicker">The Space</p><h2>The Room</h2></div>
    <p class="sec-note">Twenty-two seats, one seating</p>
  </div>
  <div class="two-col">
    <div class="room-copy">
      <p class="room-lede">D.R. Restaurant is a twenty-two seat room above a hardware shop.</p>
      <p>There is one menu and one kitchen, and the pass is close enough that the
         person who cooked your course is usually the person who sets it down.</p>
      <p>We do not take walk-ins. We do take a lot of care with the four hours
         you give us.</p>
    </div>
    <div class="room-side">
      <div class="room-figure" aria-hidden="true"><span>22</span><small>Seats</small></div>
      <ul class="hours">
        <li><b>Thursday</b><span>6:00pm &middot; 9:00pm</span></li>
        <li><b>Friday</b><span>6:00pm &middot; 9:00pm</span></li>
        <li><b>Saturday</b><span>5:30pm &middot; 8:30pm</span></li>
        <li><b>Sunday</b><span>5:30pm only</span></li>
        <li><b>Mon &ndash; Wed</b><span>Closed</span></li>
      </ul>
    </div>
  </div>
</div></section>

<section id="reserve"><div class="wrap">
  <div class="sec-head">
    <span class="sec-no">08</span>
    <div class="sec-title"><p class="kicker">Reservations</p><h2>Join Us</h2></div>
    <p class="sec-note">Tables open 30 days ahead</p>
  </div>
  <div class="reserve-card">
    <div class="reserve-intro">
      <h3>An evening at D.R.</h3>
      <p>Dinner is served Thursday through Sunday. We hold a small number of tables
         for each seating; reservations open thirty days in advance.</p>
      <p class="reserve-contact"><a href="tel:+12125550134">+1 (212) 555-0134</a><br>
        <a href="mailto:hello@drrestaurant.com">hello@drrestaurant.com</a></p>
    </div>
    <form class="fields" onsubmit="return false">
      <div class="field"><label>Party</label>
        <select><option>2 guests</option><option>3 guests</option><option>4 guests</option></select></div>
      <div class="field"><label>Date</label><input type="date" /></div>
      <div class="field"><label>Seating</label>
        <select><option>6:00pm</option><option>9:00pm</option></select></div>
      <div class="field"><label>Dietary notes</label><input placeholder="Tell us anything" /></div>
      <button class="btn" type="submit">Request a table</button>
    </form>
  </div>
</div></section>

<footer><div class="wrap">
  <div class="footer-grid">
    <div class="footer-brand">
      <div class="mark">D.R. <span>Restaurant</span></div>
      <p>A twenty-two seat tasting-menu restaurant above a hardware shop.</p>
    </div>
    <div class="footer-col"><p class="kicker">Visit</p><p>14 Orchard Street<br>New York, NY 10002</p></div>
    <div class="footer-col"><p class="kicker">Hours</p><p>Thu &ndash; Sat &middot; 6pm &amp; 9pm<br>Sun &middot; 5:30pm<br>Mon &ndash; Wed &middot; Closed</p></div>
    <div class="footer-col"><p class="kicker">Contact</p><p><a href="tel:+12125550134">+1 (212) 555-0134</a><br><a href="mailto:hello@drrestaurant.com">hello@drrestaurant.com</a></p></div>
  </div>
  <div class="footer-bottom">
    <span>&copy; 2026 D.R. Restaurant</span>
    <span>A fictional restaurant, for demonstration</span>
    <span class="credit">made by darain rahman</span>
  </div>
</div></footer>

<div id="scrim" aria-hidden="true"></div>

<div id="detail" role="dialog" aria-modal="true" aria-label="Dish details">
  <button class="close" aria-label="Close">&times;</button>
  <p class="kicker" id="d-kicker"></p>
  <h3 id="d-name"></h3>
  <p id="d-note"></p>
  <div class="price" id="d-price"></div>
  <dl id="d-meta"></dl>
  <button class="btn" id="d-add">Add to order</button>
</div>

<div id="order">
  <p class="kicker">Your order</p>
  <ul></ul>
  <div class="total"><span>Total</span><b>$0</b></div>
</div>`;

// --------------------------------------------------------------- the API ---

const $ = (s) => document.querySelector(s);
const order = [];

const SITE = {
  /** Scroll to a part of the menu and draw a ring around it. */
  show_section({ section }) {
    const el = document.getElementById(section);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    document.querySelectorAll('.highlight').forEach((h) => h.classList.remove('highlight'));
    el.classList.add('highlight');
  },

  /** Grey out every dish the guest can't eat, and count what's left. */
  filter_menu({ diet }) {
    const rule = DIETS[diet] || DIETS.none;
    document.body.dataset.diet = diet;
    $('#diet-label').textContent = rule.label;

    document.querySelectorAll('.dish').forEach((el) => {
      const ok = rule.ok(byId(el.dataset.dish));
      el.classList.toggle('out', !ok);
      if (ok && diet !== 'none') { el.classList.remove('in'); void el.offsetWidth; el.classList.add('in'); }
    });
    MENU.forEach((sec) => {
      const n = sec.dishes.filter(rule.ok).length;
      $(`[data-count="${sec.id}"]`).textContent = `${n} of ${sec.dishes.length}`;
    });
  },

  /** Open the card for one dish: where it's from, allergens, what to drink. */
  focus_dish({ dish }) {
    const d = byId(dish);
    if (!d) return;
    $('#d-kicker').textContent = MENU.find((s) => s.dishes.includes(d)).label;
    $('#d-name').textContent = d.name;
    $('#d-note').textContent = d.note;
    $('#d-price').textContent = money(d.price);
    $('#d-meta').innerHTML = [
      d.from && ['Kitchen note', d.from],
      d.allergens && ['Allergens', d.allergens],
      ['Pairing', `${d.pairing}. ${d.pairNote}`],
    ].filter(Boolean).map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('');
    $('#d-add').onclick = () => { SITE.add_to_order({ dish }); closeDetail(); };
    $('#detail').classList.add('open');
    document.body.classList.add('detail-open');
    SITE.show_section({ section: MENU.find((s) => s.dishes.includes(d)).id });
  },

  /** Add a dish to the running tab in the corner. */
  add_to_order({ dish }) {
    const d = byId(dish);
    if (d) { order.push(d); renderOrder(); }
  },
};

function renderOrder() {
  $('#order').classList.toggle('open', order.length > 0);
  $('#order ul').innerHTML = order.map((d, i) => `
    <li><span>${d.name}</span>
      <span style="display:flex;gap:10px"><b>${money(d.price)}</b>
      <button data-i="${i}">&times;</button></span></li>`).join('');
  $('#order .total b').textContent = money(order.reduce((t, d) => t + d.price, 0));
}

// ------------------------------------------------------- clicks and keys ---

function closeDetail() {
  $('#detail').classList.remove('open');
  document.body.classList.remove('detail-open');
}

document.addEventListener('click', (e) => {
  const dish = e.target.closest('.dish');
  if (dish) SITE.focus_dish({ dish: dish.dataset.dish });

  if (e.target.closest('#detail .close') || e.target.id === 'scrim') closeDetail();
  if (e.target.closest('.diet-chip button')) SITE.filter_menu({ diet: 'none' });

  const rm = e.target.closest('#order li button');
  if (rm) { order.splice(+rm.dataset.i, 1); renderOrder(); }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeDetail();
});

SITE.filter_menu({ diet: 'none' });

// Soft reveal as sections enter the viewport.
if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('in');
      io.unobserve(entry.target);
    });
  }, { threshold: 0.08 });

  document.querySelectorAll('#site > section, #site > footer').forEach((el) => {
    el.classList.add('reveal');
    io.observe(el);
  });
}

window.SITE = SITE;
