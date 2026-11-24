// Kambuyam Home : application du site (annonces, comptes, réservations, espaces propriétaire et admin).
// Sans configuration Supabase (config.js vide), le site tourne en mode démonstration avec des données d'exemple.
{
'use strict';
const CFG = window.KH_CONFIG || {};
const REAL = !!(CFG.supabaseUrl && CFG.supabaseAnonKey && window.supabase);
let sb = null;   // client Supabase, ou base de démonstration locale (voir demo-backend.js)

// ---------- Petits outils ----------
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fcfa = n => Math.round(n || 0).toLocaleString('fr-FR').replace(/ | /g, ' ') + ' FCFA';
const pad = n => String(n).padStart(2, '0');
const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addD = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const fd = s => s ? new Date(s + 'T12:00').toLocaleDateString('fr-FR', {day: 'numeric', month: 'long', year: 'numeric'}) : '';
const safeUrl = u => /^(https:\/\/[^\s"'<>]+|img\/[\w.-]+|data:image\/jpeg;base64,[A-Za-z0-9+\/=]+)$/.test(u || '') ? u : '';
const phoneOk = t => /^6\d{8}$/.test(t);
const cleanPhone = v => String(v || '').replace(/\D/g, '').replace(/^237/, '');
const store = {get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }};
const CITIES = ['Douala', 'Yaoundé', 'Bafoussam', 'Bamenda', 'Garoua', 'Maroua', 'Ngaoundéré', 'Bertoua', 'Ebolowa', 'Buea', 'Limbé', 'Kribi', 'Kumba', 'Édéa', 'Dschang', 'Nkongsamba', 'Foumban', 'Mbalmayo', 'Sangmélima', 'Bafang'];
const TYPES = ['Appartement meublé', 'Chambre / studio', 'Appartement', 'Maison', 'Terrain'];
const MODES = {nuit: 'Séjourner (à la nuit)', mois: 'Louer (au mois)', vente: 'Acheter'};
const UNIT = {nuit: '/ nuit', mois: '/ mois', vente: ''};
const ST = {pending: 'En attente de validation', published: 'Publiée', rejected: 'Refusée', archived: 'Retirée',
  requested: 'Demande envoyée', confirmed: 'Confirmée', declined: 'Refusée', cancelled: 'Annulée', completed: 'Terminée'};
const ROLE = {client: 'Client', owner: 'Propriétaire', admin: 'Administrateur'};
const OPS = {orange_money: {n: 'Orange Money', c: 'var(--orange)', s: 'OM'}, mtn_momo: {n: 'MTN Mobile Money', c: 'var(--mtn)', s: 'MoMo'}};
const badge = s => `<span class="st ${esc(s)}">${esc(ST[s] || s)}</span>`;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => t.hidden = true, 4000); }
function friendly(e) {
  const m = (e && (e.message || e.error_description || e)) + '';
  const map = [[/no_overlap|plus disponibles/i, 'Ces dates ne sont plus disponibles. Choisissez d\'autres dates.'],
    [/Invalid login/i, 'E-mail ou mot de passe incorrect.'], [/already registered/i, 'Un compte existe déjà avec cet e-mail. Connectez-vous.'],
    [/Email not confirmed/i, 'Confirmez d\'abord votre e-mail : cliquez sur le lien reçu dans votre boîte mail.'],
    [/Password should be/i, 'Le mot de passe doit faire au moins 6 caractères.'], [/rate limit/i, 'Trop de tentatives. Réessayez dans quelques minutes.'],
    [/Failed to fetch|NetworkError/i, 'Connexion internet impossible. Vérifiez votre réseau et réessayez.'],
    [/row-level security|non autoris/i, 'Action non autorisée pour votre compte.']];
  for (const [r, t] of map) if (r.test(m)) return t;
  return 'Une erreur est survenue : ' + m;
}

// ---------- Données de démonstration (utilisées seulement sans Supabase) ----------
const imgs = (p, n, c) => { const a = Array.from({length: n}, (_, i) => `img/${p}-${i + 1}.jpg`); return [a[c], ...a.filter((_, i) => i !== c)]; };
const amST = ['Climatisation', 'Wifi gratuit', 'Écran plat', 'Cuisine équipée', 'Sécurité 24h/24', 'Accueil 24h/24'];
const SOFT = 'Résidence Soft Time', BON = 'Bonamoussadi (Terminus)';
const DEMO = [
  {id: 'apt1', title: 'Appartement #1, Soft Time', type: TYPES[0], city: 'Douala', area: BON, mode: 'nuit', price: 35000, photos: imgs('apt1', 10, 1), partner: SOFT, amenities: amST, featured: true, description: 'Grand appartement meublé haut standing : salon spacieux avec coin repas, chambre lumineuse, cuisine équipée et salle d\'eau.'},
  {id: 'apt2', title: 'Appartement #2, Soft Time', type: TYPES[0], city: 'Douala', area: BON, mode: 'nuit', price: 35000, photos: imgs('apt2', 10, 1), partner: SOFT, amenities: amST, description: 'Appartement meublé avec salon double, salle à manger, chambre climatisée, cuisine et salle d\'eau.'},
  {id: 'apt3', title: 'Appartement #3, Soft Time', type: TYPES[0], city: 'Douala', area: BON, mode: 'nuit', price: 35000, photos: imgs('apt3', 10, 0), partner: SOFT, amenities: amST, featured: true, description: 'Appartement meublé clair avec home cinéma, coin repas, chambre et cuisine équipée.'},
  {id: 'apt4', title: 'Appartement #4, Soft Time', type: TYPES[0], city: 'Douala', area: BON, mode: 'nuit', price: 35000, photos: imgs('apt4', 10, 1), partner: SOFT, amenities: amST, description: 'Appartement meublé avec grand salon, salle à manger, chambre, cuisine et salle d\'eau.'},
  {id: 'apt5', title: 'Appartement #5, Soft Time', type: TYPES[0], city: 'Douala', area: BON, mode: 'nuit', price: 40000, photos: imgs('apt5', 10, 1), partner: SOFT, amenities: amST, description: 'Appartement meublé sur deux niveaux avec escalier intérieur, salon, chambre, cuisine et salle d\'eau.'},
  {id: 'chambre', title: 'Chambre meublée, Soft Time', type: TYPES[1], city: 'Douala', area: BON, mode: 'nuit', price: 20000, photos: imgs('chambre', 6, 2), partner: SOFT, amenities: ['Climatisation', 'Wifi gratuit', 'Écran plat', 'Kitchenette', 'Sécurité 24h/24'], featured: true, description: 'Chambre meublée avec kitchenette (micro-ondes, réfrigérateur), télévision et salle d\'eau privée.'},
  {id: 'bastos', title: 'Appartement 3 chambres à Bastos', type: TYPES[2], city: 'Yaoundé', area: 'Bastos', mode: 'mois', price: 250000, ex: 1, amenities: ['Parking', 'Gardien', 'Forage'], featured: true, description: 'Appartement non meublé de 3 chambres, salon, cuisine et 2 douches dans un immeuble calme.'},
  {id: 'ngoa', title: 'Studio meublé près de l\'université', type: TYPES[1], city: 'Yaoundé', area: 'Ngoa-Ekellé', mode: 'nuit', price: 15000, ex: 1, amenities: ['Wifi', 'Ventilateur', 'Douche privée'], description: 'Studio meublé idéal pour un séjour court, à deux pas de l\'université de Yaoundé I.'},
  {id: 'odza', title: 'Maison 4 chambres à vendre', type: TYPES[3], city: 'Yaoundé', area: 'Odza', mode: 'vente', price: 45000000, ex: 1, amenities: ['Titre foncier', 'Clôturée', 'Garage'], description: 'Maison de 4 chambres sur 400 m², clôturée, avec titre foncier.'},
  {id: 'bonapriso', title: 'Maison 3 chambres à Bonapriso', type: TYPES[3], city: 'Douala', area: 'Bonapriso', mode: 'mois', price: 125000, ex: 1, amenities: ['Cour', 'Gardien', 'Eau et électricité'], description: 'Maison de 3 chambres avec salon, cuisine et cour, dans un quartier résidentiel.'},
  {id: 'logbessou', title: 'Terrain de 500 m² à Logbessou', type: TYPES[4], city: 'Douala', area: 'Logbessou', mode: 'vente', price: 8000000, ex: 1, amenities: ['Titre foncier', 'Accès route'], description: 'Terrain plat de 500 m², titré, accessible en voiture toute l\'année.'},
  {id: 'kribi', title: 'Villa 2 chambres près de la plage', type: TYPES[3], city: 'Kribi', area: 'Mpangou', mode: 'nuit', price: 45000, ex: 1, amenities: ['Plage à 5 min', 'Climatisation', 'Terrasse', 'Gardien'], featured: true, description: 'Villa meublée de 2 chambres avec terrasse, à quelques minutes à pied de la plage.'},
  {id: 'bafoussam', title: 'Appartement 2 chambres à Tamdja', type: TYPES[2], city: 'Bafoussam', area: 'Tamdja', mode: 'mois', price: 60000, ex: 1, amenities: ['Forage', 'Parking'], description: 'Appartement de 2 chambres, salon et cuisine, dans un quartier calme.'},
  {id: 'limbe', title: 'Studio meublé vue sur mer', type: TYPES[1], city: 'Limbé', area: 'Down Beach', mode: 'nuit', price: 18000, ex: 1, amenities: ['Vue mer', 'Wifi', 'Ventilateur'], description: 'Studio meublé lumineux avec vue sur l\'océan, idéal pour un week-end.'},
  {id: 'nkolbisson', title: 'Terrain de 600 m² à Nkolbisson', type: TYPES[4], city: 'Yaoundé', area: 'Nkolbisson', mode: 'vente', price: 12500000, ex: 1, amenities: ['Titre foncier', 'Proche route bitumée'], description: 'Terrain de 600 m² avec titre foncier, proche de la route bitumée.'}
];

sb = REAL ? window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseAnonKey) : window.khDemoClient(DEMO);

// ---------- Accès aux données ----------
let me = null;          // {id, email, full_name, phone, role}
let cache = null;       // annonces publiées
const need = r => { if (r.error) throw r.error; return r.data; };
const api = {
  async listings(force) {
    if (cache && !force) return cache;
    cache = need(await sb.from('listings').select('*').eq('status', 'published').order('featured', {ascending: false}).order('created_at'));
    return cache;
  },
  async listing(id) {
    if (REAL && !/^[0-9a-f-]{36}$/.test(id)) return null;
    return need(await sb.from('listings').select('*').eq('id', id).maybeSingle());
  },
  async taken(id) { return need(await sb.rpc('taken_dates', {p_listing: id})) || []; },
  async book(b) {
    const row = {listing_id: b.listing_id, check_in: b.check_in, check_out: b.check_out || null, guests: b.guests || 1,
      contact_phone: b.contact_phone || '', message: b.message || '', payment_method: b.payment_method || null, payment_status: b.payment_method ? 'simulated' : 'unpaid'};
    return need(await sb.from('bookings').insert(row).select().single());
  },
  async myBookings() {
    return need(await sb.from('booking_details').select('*').eq('client_id', me.id).order('created_at', {ascending: false}));
  },
  async ownerListings() { return need(await sb.from('listings').select('*').eq('owner_id', me.id).order('created_at', {ascending: false})); },
  async ownerBookings() { return need(await sb.from('booking_details').select('*').eq('owner_id', me.id).order('created_at', {ascending: false})); },
  async setBooking(id, status) { need(await sb.from('bookings').update({status}).eq('id', id)); },
  async saveListing(data, id) {
    const q = id ? sb.from('listings').update(data).eq('id', id) : sb.from('listings').insert({...data, owner_id: me.id});
    cache = null; return need(await q.select().single());
  },
  async setListing(id, patch) { cache = null; need(await sb.from('listings').update(patch).eq('id', id)); },
  async upload(file, i) {
    const blob = await shrink(file);
    const path = `${me.id}/${Date.now()}-${i}.jpg`;
    need(await sb.storage.from('photos').upload(path, blob, {contentType: 'image/jpeg'}));
    return sb.storage.from('photos').getPublicUrl(path).data.publicUrl;
  },
  async adminListings() { return need(await sb.from('listings').select('*, owner:profiles(full_name, phone)').order('created_at', {ascending: false})); },
  async adminBookings() { return need(await sb.from('booking_details').select('*').order('created_at', {ascending: false}).limit(300)); },
  async users() { return need(await sb.from('profiles').select('*').order('created_at', {ascending: false})); },
  async setRole(id, role) { need(await sb.from('profiles').update({role}).eq('id', id)); },
  async saveProfile(p) { need(await sb.from('profiles').update(p).eq('id', me.id)); Object.assign(me, p); }
};
function shrink(file) {
  return new Promise((ok, ko) => {
    const im = new Image(), u = URL.createObjectURL(file);
    im.onload = () => { const s = Math.min(1, 1400 / Math.max(im.width, im.height)), c = document.createElement('canvas');
      c.width = Math.round(im.width * s); c.height = Math.round(im.height * s); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
      URL.revokeObjectURL(u); c.toBlob(b => b ? ok(b) : ko(new Error('Image illisible')), 'image/jpeg', .8); };
    im.onerror = () => ko(new Error('Image illisible : ' + file.name)); im.src = u;
  });
}

// ---------- Rendu des annonces ----------
const art = l => { const c = {'Terrain': '#9bd36b', 'Maison': '#f0a35e'}[l.type] || '#7fd0dc';
  return `<svg viewBox="0 0 400 300" role="img" aria-label="Photo à venir"><rect width="400" height="300" fill="${c}"/><rect y="210" width="400" height="90" fill="#24b562" opacity=".55"/><circle cx="320" cy="70" r="34" fill="#fff" opacity=".7"/>${l.type === 'Terrain' ? '<path d="M60 230 L340 230 L300 190 L100 190Z" fill="#fff" opacity=".5"/><path d="M110 190 v-40 M290 190 v-40" stroke="#0f3c44" stroke-width="5"/><rect x="110" y="140" width="180" height="10" fill="#0f3c44"/>' : '<path d="M120 140 L200 80 L280 140Z" fill="#c8483c"/><rect x="135" y="140" width="130" height="80" fill="#fff"/><rect x="185" y="175" width="30" height="45" fill="#137c8b"/><rect x="150" y="155" width="24" height="20" fill="#7fd0dc"/><rect x="226" y="155" width="24" height="20" fill="#7fd0dc"/>'}<text x="200" y="275" text-anchor="middle" font-family="Nunito Sans,sans-serif" font-size="18" font-weight="700" fill="#0f3c44">Photo à venir</text></svg>`; };
const photos = l => (l.photos || []).map(safeUrl).filter(Boolean);
const pic = l => { const p = photos(l)[0]; return p ? `<img src="${esc(p)}" alt="" loading="lazy">` : art(l); };
const card = l => `<a class="card" href="#annonce-${esc(l.id)}"><div class="ph">${pic(l)}<span class="tag">${esc(l.city)}</span>${l.ex ? '<span class="tag p" style="background:#6b7f83">exemple</span>' : l.partner ? '<span class="tag p">Partenaire</span>' : ''}</div><div class="tx"><h3>${esc(l.title)}</h3><span class="loc">${esc(l.type)} · ${esc(l.area)}</span><span class="price">${fcfa(l.price)} <small>${UNIT[l.mode] || ''}</small></span></div></a>`;
const loading = '<div class="empty"><div class="spin"></div>Chargement…</div>';
if (!REAL) $('#proto').insertAdjacentHTML('beforeend', ' <a href="#connexion">Essayer les espaces client, propriétaire et admin</a>');
const fail = e => `<div class="empty"><h3>Oups</h3><p>${esc(friendly(e))}</p></div>`;

$$('.cities').forEach(s => s.innerHTML = '<option value="">Toutes</option>' + CITIES.map(c => `<option>${c}</option>`).join(''));
$$('.types').forEach(s => s.innerHTML = '<option value="">Tous</option>' + TYPES.map(t => `<option>${t}</option>`).join(''));
$$('.modes').forEach(s => s.innerHTML = '<option value="">Tout</option>' + Object.entries(MODES).map(([k, v]) => `<option value="${k}">${v}</option>`).join(''));

async function renderFeat() {
  try { const l = await api.listings(); const f = l.filter(x => x.featured); $('#feat').innerHTML = (f.length ? f : l).slice(0, 8).map(card).join('') || '<div class="empty">Les premières annonces arrivent bientôt.</div>'; }
  catch (e) { $('#feat').innerHTML = fail(e); }
}
let partnerOnly = false;
async function renderList() {
  const c = $('#f-city').value, t = $('#f-type').value, m = $('#f-mode').value, mx = +$('#f-max').value || 0, so = $('#f-sort').value;
  let all; try { all = await api.listings(); } catch (e) { $('#list').innerHTML = fail(e); return; }
  let r = all.filter(l => (!c || l.city === c) && (!t || l.type === t) && (!m || l.mode === m) && (!mx || l.price <= mx) && (!partnerOnly || l.partner === SOFT));
  if (so) r = [...r].sort((a, b) => so === 'asc' ? a.price - b.price : b.price - a.price);
  $('#count').textContent = r.length + (r.length > 1 ? ' annonces' : ' annonce') + (partnerOnly ? ' de Résidence Soft Time' : '');
  $('#list').innerHTML = r.length ? r.map(card).join('') : '<div class="empty"><h3>Aucune annonce ne correspond</h3><p>Essayez une autre ville ou un budget plus large.</p></div>';
}
$$('.filters select,.filters input').forEach(e => e.addEventListener('input', () => { partnerOnly = false; renderList(); }));
$('#flt').addEventListener('submit', e => { e.preventDefault(); partnerOnly = false; renderList(); $('#count').scrollIntoView({behavior: 'smooth', block: 'start'}); });
$('#flt').addEventListener('reset', () => setTimeout(() => { partnerOnly = false; renderList(); }, 0));
function goSearch(c, t, m, mx, partner) { $('#f-city').value = c; $('#f-type').value = t; $('#f-mode').value = m; $('#f-max').value = mx; partnerOnly = !!partner; if (location.hash === '#annonces') renderList(); else location.hash = 'annonces'; }
$('#hs').addEventListener('submit', e => { e.preventDefault(); goSearch($('#hs-city').value, $('#hs-type').value, $('#hs-mode').value, $('#hs-max').value); });
$$('.chip').forEach(b => b.addEventListener('click', () => { const [c, m] = b.dataset.q.split('|'); goSearch(c, '', m, ''); }));
$('#partner-btn').addEventListener('click', () => goSearch('', '', '', '', true));

// ---------- Fiche annonce ----------
let cur = null, taken = [];
const overlaps = (a, b) => taken.some(t => a < t.check_out && b > t.check_in);
async function renderDetail(id) {
  const box = $('#detail'); box.innerHTML = loading;
  let l; try { l = await api.listing(id); taken = l && l.mode === 'nuit' ? await api.taken(l.id) : []; } catch (e) { box.innerHTML = fail(e); return; }
  if (!l) { box.innerHTML = '<div class="empty"><h3>Annonce introuvable</h3><a href="#annonces">Retour aux annonces</a></div>'; return; }
  cur = l; const ph = photos(l), today = new Date(), mine = me && me.id === l.owner_id;
  const side = l.status && l.status !== 'published' ? `<p>${badge(l.status)}</p><p class="note">Cette annonce n'est pas visible du public tant qu'elle n'est pas validée.</p>`
   : mine ? `<p>C'est votre annonce.</p><a class="btn" href="#modifier-${esc(l.id)}">Modifier</a>`
   : l.mode === 'nuit' ? `<h3><span class="price">${fcfa(l.price)}</span> <small class="note">/ nuit</small></h3>
    <div class="row2"><div><label for="d-in">Arrivée</label><input type="date" id="d-in" value="${iso(addD(today, 1))}" min="${iso(today)}"></div><div><label for="d-out">Départ</label><input type="date" id="d-out" value="${iso(addD(today, 3))}" min="${iso(addD(today, 1))}"></div></div>
    <label for="d-g">Voyageurs</label><select id="d-g">${[1, 2, 3, 4, 5, 6].map(n => `<option>${n}</option>`).join('')}</select>
    <table class="sum" id="d-sum"></table><button class="btn" style="width:100%" id="d-book">Réserver</button>
    ${taken.length ? `<p class="note">Déjà réservé : ${taken.map(t => `${fd(t.check_in)} → ${fd(t.check_out)}`).map(esc).join(' ; ')}</p>` : ''}
    <p class="note">Le propriétaire confirme votre demande. Commission Kambuyam de 3 % prélevée sur sa part, sans frais pour vous.</p>`
   : `<h3><span class="price">${fcfa(l.price)}</span> <small class="note">${UNIT[l.mode]}</small></h3>
    <p>${l.mode === 'vente' ? 'Bien à vendre : planifiez une visite avec le vendeur.' : 'Location longue durée : planifiez une visite avant de signer le bail.'}</p>
    <label for="d-vis">Date de visite souhaitée</label><input type="date" id="d-vis" value="${iso(addD(today, 2))}" min="${iso(today)}" style="margin-bottom:12px">
    <button class="btn" style="width:100%" id="d-visit">Demander une visite</button><p class="note">Gratuit. Le propriétaire vous rappelle rapidement.</p>`;
  box.innerHTML = `<p><a href="#annonces">← Toutes les annonces</a></p><h1>${esc(l.title)}</h1><p class="loc">${esc(l.type)} · ${esc(l.area)}, ${esc(l.city)}${l.partner ? ' · proposé par <b>' + esc(l.partner) + '</b>' : ''}${l.ex ? ' · <b>annonce d\'exemple</b>' : ''}</p>
  <div class="detail"><div>
    ${ph.length ? `<div class="gal" id="gal" tabindex="0">${ph.map((p, i) => `<img src="${esc(p)}" alt="Photo ${i + 1}" ${i ? 'loading="lazy"' : ''}>`).join('')}</div>
    <div class="galnav"><button id="gp" aria-label="Photo précédente">‹</button><button id="gn" aria-label="Photo suivante">›</button><span class="note" id="gc">1 / ${ph.length}</span><div class="thumbs">${ph.map((p, i) => `<img src="${esc(p)}" alt="" data-i="${i}" loading="lazy">`).join('')}</div></div>` : `<div class="card" style="margin-bottom:18px"><div class="ph">${art(l)}</div></div>`}
    <h2>Le logement</h2><p style="white-space:pre-line">${esc(l.description || '')}</p>
    ${(l.amenities || []).length ? `<h3>Équipements</h3><ul class="amen">${l.amenities.map(a => `<li>${esc(a)}</li>`).join('')}</ul>` : ''}
    ${l.partner === SOFT ? '<p class="note">Photos issues du site de la Résidence Soft Time. Prix indicatif à confirmer.</p>' : ''}
  </div><aside class="box">${side}</aside></div>`;
  if (ph.length) { const g = $('#gal'), go = i => g.scrollTo({left: Math.max(0, Math.min(ph.length - 1, i)) * g.clientWidth, behavior: 'smooth'}), idx = () => Math.round(g.scrollLeft / g.clientWidth);
    $('#gp').onclick = () => go(idx() - 1); $('#gn').onclick = () => go(idx() + 1);
    g.addEventListener('keydown', e => { if (e.key === 'ArrowLeft') go(idx() - 1); if (e.key === 'ArrowRight') go(idx() + 1); });
    g.addEventListener('scroll', () => $('#gc').textContent = (idx() + 1) + ' / ' + ph.length);
    $$('.thumbs img').forEach(t => t.onclick = () => go(+t.dataset.i)); }
  if ($('#d-book')) { const upd = () => { const n = nights(), bad = n > 0 && overlaps($('#d-in').value, $('#d-out').value);
      $('#d-sum').innerHTML = n <= 0 ? '<tr><td class="err">La date de départ doit être après l\'arrivée.</td></tr>' : bad ? '<tr><td class="err">Ces dates chevauchent une réservation existante.</td></tr>'
        : `<tr><td>${fcfa(l.price)} × ${n} nuit${n > 1 ? 's' : ''}</td><td>${fcfa(l.price * n)}</td></tr><tr><td>Frais de service</td><td>0 FCFA</td></tr><tr class="t"><td>Total</td><td>${fcfa(l.price * n)}</td></tr>`;
      $('#d-book').disabled = n <= 0 || bad; };
    ['#d-in', '#d-out'].forEach(s => $(s).addEventListener('input', upd)); upd(); $('#d-book').onclick = openPay; }
  if ($('#d-visit')) $('#d-visit').onclick = openVisit;
}
const nights = () => Math.round((new Date($('#d-out').value) - new Date($('#d-in').value)) / 864e5);

// ---------- Réservation et paiement (simulé) ----------
const dlg = $('#dlg'), body = $('#dlgb');
const shell = (step, title, html) => `<button class="x" aria-label="Fermer" data-close>×</button><h2>${title}</h2>${step >= 0 ? `<div class="steps">${[0, 1, 2].map(i => `<i class="${i <= step ? 'on' : ''}"></i>`).join('')}</div>` : ''}${html}`;
dlg.addEventListener('click', e => { if (e.target === dlg || e.target.closest('[data-close]')) dlg.close(); });
function needLogin(what) {
  body.innerHTML = shell(-1, 'Connectez-vous', `<p>Pour ${what}, connectez-vous ou créez un compte gratuit. Cela prend une minute.</p><a class="btn" style="width:100%" href="#connexion" data-close data-back>Se connecter ou créer un compte</a>`);
  body.querySelector('[data-back]').addEventListener('click', () => sessionStorage.setItem('kh-back', location.hash), {capture: true});
  dlg.showModal();
}
let bk = {};
function openPay() {
  if (!me) return needLogin('réserver');
  bk = {l: cur, in: $('#d-in').value, out: $('#d-out').value, g: +$('#d-g').value, n: nights()}; bk.total = bk.l.price * bk.n;
  stepInfo(); dlg.showModal();
}
function stepInfo() {
  body.innerHTML = shell(0, 'Réservation', `<p class="note">${esc(bk.l.title)} · du ${fd(bk.in)} au ${fd(bk.out)} · ${bk.n} nuit${bk.n > 1 ? 's' : ''} · <b>${fcfa(bk.total)}</b></p>
  <form id="s1" class="stack"><div><label for="b-name">Nom complet</label><input id="b-name" required autocomplete="name" value="${esc(me ? me.full_name : bk.name || '')}"></div>
  <div><label for="b-ph">Téléphone pour vous joindre</label><input id="b-ph" type="tel" required inputmode="tel" placeholder="6XX XX XX XX" value="${esc(me ? me.phone : bk.ph || '')}"></div>
  <div><label for="b-msg">Message au propriétaire (optionnel)</label><textarea id="b-msg" maxlength="500" placeholder="Heure d'arrivée, questions…">${esc(bk.msg || '')}</textarea></div>
  <p class="err" id="b-e1"></p><button class="btn" style="width:100%">Continuer vers le paiement</button></form>`);
  $('#s1').onsubmit = e => { e.preventDefault(); const ph = cleanPhone($('#b-ph').value); if (!phoneOk(ph)) return $('#b-e1').textContent = 'Numéro camerounais à 9 chiffres commençant par 6.';
    bk.name = $('#b-name').value.trim(); bk.ph = ph; bk.msg = $('#b-msg').value.trim(); stepPay(); };
}
function guessOp(p) { if (/^6(5[5-9]|9\d|8[6-9])/.test(p)) return 'orange_money'; if (/^6(5[0-4]|7\d|8[0-3])/.test(p)) return 'mtn_momo'; return ''; }
function stepPay() {
  body.innerHTML = shell(1, 'Paiement', `<p>Total à payer : <b>${fcfa(bk.total)}</b></p>
  <div class="ops">${Object.entries(OPS).map(([k, o]) => `<button type="button" class="op" data-op="${k}" aria-pressed="${bk.op === k}"><span class="dot" style="background:${o.c}">${o.s}</span>${o.n}</button>`).join('')}</div>
  <form id="s2"><label for="b-tel">Numéro mobile money</label><div style="display:flex;gap:8px"><input value="+237" disabled style="width:80px;flex:none"><input id="b-tel" type="tel" inputmode="numeric" placeholder="6XX XX XX XX" value="${esc(bk.tel || bk.ph || '')}"></div>
  <p class="err" id="b-err"></p><button class="btn" style="width:100%">Payer ${fcfa(bk.total)}</button>
  <p class="note">Paiement simulé : aucun débit réel. Le vrai paiement mobile money arrive à l'étape suivante du projet.</p></form>`);
  $$('.op').forEach(b => b.onclick = () => { bk.op = b.dataset.op; $$('.op').forEach(x => x.setAttribute('aria-pressed', x === b)); });
  $('#s2').onsubmit = e => { e.preventDefault(); const t = cleanPhone($('#b-tel').value);
    if (!bk.op) return $('#b-err').textContent = 'Choisissez Orange Money ou MTN Mobile Money.';
    if (!phoneOk(t)) return $('#b-err').textContent = 'Entrez un numéro camerounais à 9 chiffres commençant par 6.';
    const g = guessOp(t); if (g && g !== bk.op) return $('#b-err').textContent = `Ce numéro semble être un numéro ${OPS[g].n}. Changez d'opérateur ou de numéro.`;
    bk.tel = t; stepWait(); };
}
function stepWait() {
  body.innerHTML = shell(2, 'Paiement', `<div class="wait"><div class="spin"></div><h3>Validez le paiement sur votre téléphone</h3><p>Une demande de ${fcfa(bk.total)} a été envoyée au +237 ${bk.tel.replace(/(\d)(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5')} (${OPS[bk.op].n}).</p><p class="note">Simulation : confirmation automatique dans quelques secondes.</p></div>`);
  setTimeout(async () => {
    if (!dlg.open) return;
    try {
      const r = await api.book({listing_id: bk.l.id, check_in: bk.in, check_out: bk.out, guests: bk.g, contact_phone: bk.ph, message: bk.msg, payment_method: bk.op,
        listing_title: bk.l.title, total: bk.total, nights: bk.n});
      body.innerHTML = shell(-1, 'Demande envoyée', `<div class="wait"><div class="ok">✓</div><p>Référence <b>${esc(r.reference)}</b><br>${esc(bk.l.title)}<br>du ${fd(bk.in)} au ${fd(bk.out)} · ${fcfa(r.total ?? bk.total)}</p><p>Le propriétaire va confirmer votre réservation. Vous la retrouvez dans « Mes réservations ».</p><a class="btn" href="#compte" data-close>Voir mes réservations</a></div>`);
    } catch (e) { body.innerHTML = shell(-1, 'Réservation impossible', `<p class="err">${esc(friendly(e))}</p><button class="btn" data-close>Fermer</button>`); }
  }, 3000);
}
function openVisit() {
  if (!me) return needLogin('demander une visite');
  const v = $('#d-vis').value;
  body.innerHTML = shell(-1, 'Demander une visite', `<p class="note">${esc(cur.title)} · ${fd(v)}</p><form id="vf" class="stack"><div><label for="v-n">Nom</label><input id="v-n" required value="${esc(me ? me.full_name : '')}"></div><div><label for="v-t">Téléphone</label><input id="v-t" type="tel" required placeholder="6XX XX XX XX" value="${esc(me ? me.phone : '')}"></div><div><label for="v-m">Message (optionnel)</label><textarea id="v-m" maxlength="500"></textarea></div><p class="err" id="v-e"></p><button class="btn" style="width:100%">Envoyer la demande</button></form>`);
  dlg.showModal();
  $('#vf').onsubmit = async e => { e.preventDefault(); const t = cleanPhone($('#v-t').value); if (!phoneOk(t)) return $('#v-e').textContent = 'Numéro à 9 chiffres commençant par 6.';
    try { await api.book({listing_id: cur.id, check_in: v, contact_phone: t, message: $('#v-m').value.trim(), listing_title: cur.title, total: 0, kind: 'visit'});
      body.innerHTML = shell(-1, 'Demande envoyée', `<div class="wait"><div class="ok">✓</div><p>Le propriétaire vous rappelle pour confirmer la visite du ${fd(v)}.</p><button class="btn" data-close>Fermer</button></div>`);
    } catch (err) { $('#v-e').textContent = friendly(err); } };
}

// ---------- Connexion / inscription ----------
let authMode = 'login';
function renderAuth() {
  const box = $('#auth');
  if (me && authMode !== 'reset') { location.hash = 'compte'; return; }
  const tabs = authMode === 'reset' ? '' : `<div class="tabs" role="tablist"><button role="tab" data-m="login" aria-selected="${authMode === 'login'}">Se connecter</button><button role="tab" data-m="signup" aria-selected="${authMode === 'signup' || authMode === 'owner'}">Créer un compte</button></div>`;
  const f = authMode === 'login' ? `<form id="af" class="stack"><div><label for="a-mail">E-mail</label><input id="a-mail" type="email" required autocomplete="email"></div>
      <div><label for="a-pw">Mot de passe</label><input id="a-pw" type="password" required autocomplete="current-password"></div>
      <p class="err" id="a-e"></p><button class="btn" style="width:100%">Se connecter</button><p><a href="#connexion" id="a-forgot">Mot de passe oublié ?</a></p></form>`
    : authMode === 'forgot' ? `<form id="af" class="stack"><p>Entrez votre e-mail : vous recevrez un lien pour choisir un nouveau mot de passe.</p><div><label for="a-mail">E-mail</label><input id="a-mail" type="email" required autocomplete="email"></div><p class="err" id="a-e"></p><button class="btn" style="width:100%">Envoyer le lien</button></form>`
    : authMode === 'reset' ? `<form id="af" class="stack"><h2>Nouveau mot de passe</h2><div><label for="a-pw">Nouveau mot de passe</label><input id="a-pw" type="password" required minlength="6" autocomplete="new-password"></div><p class="err" id="a-e"></p><button class="btn" style="width:100%">Enregistrer</button></form>`
    : `<form id="af" class="stack"><div class="roles"><label><input type="radio" name="role" value="client" ${authMode !== 'owner' ? 'checked' : ''}> Je cherche un logement</label><label><input type="radio" name="role" value="owner" ${authMode === 'owner' ? 'checked' : ''}> Je propose des biens</label></div>
      <div><label for="a-name">Nom complet</label><input id="a-name" required autocomplete="name"></div>
      <div><label for="a-ph">Téléphone</label><input id="a-ph" type="tel" required inputmode="tel" placeholder="6XX XX XX XX" autocomplete="tel-national"></div>
      <div><label for="a-mail">E-mail</label><input id="a-mail" type="email" required autocomplete="email"></div>
      <div><label for="a-pw">Mot de passe (6 caractères minimum)</label><input id="a-pw" type="password" required minlength="6" autocomplete="new-password"></div>
      <p class="err" id="a-e"></p><button class="btn" style="width:100%">Créer mon compte</button></form>`;
  const demo = REAL || authMode === 'reset' ? '' : `<div class="auth" style="margin-bottom:16px;background:var(--soft)"><h3>Version de démonstration</h3><p class="note" style="margin-top:0">Essayez chaque espace en un clic. Les données restent dans votre navigateur.</p>
    <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn sm" data-demo="client@demo.cm">Client</button><button class="btn sm" data-demo="proprio@demo.cm">Propriétaire</button><button class="btn sm" data-demo="admin@demo.cm">Admin</button><button class="btn sm ghost" id="demo-reset">Réinitialiser la démo</button></div></div>`;
  box.innerHTML = `<div style="max-width:440px;margin:0 auto">${demo}<div class="auth">${tabs}${f}</div></div>`;
  $$('[data-demo]').forEach(b => b.onclick = () => sb.auth.signInWithPassword({email: b.dataset.demo, password: 'demo123'}));
  if ($('#demo-reset')) $('#demo-reset').onclick = () => { sb.reset(); cache = null; toast('Démonstration remise à zéro.'); };
  $$('.tabs button').forEach(b => b.onclick = () => { authMode = b.dataset.m; renderAuth(); });
  if ($('#a-forgot')) $('#a-forgot').onclick = e => { e.preventDefault(); authMode = 'forgot'; renderAuth(); };
  $('#af').onsubmit = async e => {
    e.preventDefault(); const err = $('#a-e'), btn = e.target.querySelector('button.btn'); err.textContent = ''; btn.disabled = true;
    try {
      if (authMode === 'login') { need(await sb.auth.signInWithPassword({email: $('#a-mail').value.trim(), password: $('#a-pw').value})); }
      else if (authMode === 'forgot') { need(await sb.auth.resetPasswordForEmail($('#a-mail').value.trim(), {redirectTo: location.origin + location.pathname}));
        box.innerHTML = '<div class="auth"><h2>E-mail envoyé</h2><p>Ouvrez le lien reçu par e-mail pour choisir un nouveau mot de passe.</p></div>'; authMode = 'login'; }
      else if (authMode === 'reset') { need(await sb.auth.updateUser({password: $('#a-pw').value})); authMode = 'login'; toast('Mot de passe modifié.'); location.hash = 'compte'; }
      else { const ph = cleanPhone($('#a-ph').value); if (!phoneOk(ph)) throw new Error('Téléphone : 9 chiffres commençant par 6.');
        const role = e.target.querySelector('input[name=role]:checked').value;
        const r = need(await sb.auth.signUp({email: $('#a-mail').value.trim(), password: $('#a-pw').value, options: {emailRedirectTo: location.origin + location.pathname, data: {full_name: $('#a-name').value.trim(), phone: ph, role}}}));
        if (!r.session) box.innerHTML = '<div class="auth"><div class="ok">✓</div><h2>Compte créé</h2><p>Nous vous avons envoyé un e-mail. Cliquez sur le lien qu\'il contient pour activer votre compte, puis connectez-vous.</p></div>';
        authMode = 'login'; }
    } catch (x) { err.textContent = /Téléphone/.test(x.message) ? x.message : friendly(x); }
    btn.disabled = false;
  };
}
async function loadMe(session) {
  if (!session) { me = null; return; }
  const {data} = await sb.from('profiles').select('*').eq('id', session.user.id).maybeSingle();
  me = {id: session.user.id, email: session.user.email, full_name: '', phone: '', role: 'client', ...(data || {})};
}
function renderNav() {
  $('#nav-login').hidden = !!me; $('#nav-me').hidden = !me;
  if (me) $('#nav-me').textContent = (me.full_name || me.email).split(' ')[0];
  $('#nav-owner').hidden = !(me && (me.role === 'owner' || me.role === 'admin'));
  $('#nav-admin').hidden = !(me && me.role === 'admin');
  $('#nav-res').hidden = !!me;
}

// ---------- Mon compte (client) ----------
async function renderCompte() {
  const box = $('#compte');
  if (!me) return goLogin();
  box.innerHTML = loading;
  let rs; try { rs = await api.myBookings(); } catch (e) { box.innerHTML = fail(e); return; }
  const prof = `<div class="auth" style="margin:0;max-width:none"><h2>Mon profil</h2><form id="pf" class="form"><div><label for="p-n">Nom complet</label><input id="p-n" value="${esc(me.full_name)}" required></div><div><label for="p-t">Téléphone</label><input id="p-t" type="tel" value="${esc(me.phone)}" required></div>
    <div class="full note">E-mail : ${esc(me.email)} · Compte ${esc(ROLE[me.role] || me.role)}</div><div class="full" style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn">Enregistrer</button><button class="btn ghost" type="button" id="logout">Se déconnecter</button>${me.role === 'client' ? '<button class="btn ghost" type="button" id="become">Je veux aussi proposer des biens</button>' : ''}</div><p class="err full" id="p-e"></p></form></div>`;
  box.innerHTML = `<div class="dash"><div><h1>Mes réservations</h1><div class="rows" id="myres">${rs.length ? rs.map(r => `<div class="item noimg"><div><b>${esc(r.listing_title || r.title || '')}</b><br><span class="note">${esc(r.reference)} · ${r.kind === 'visit' ? 'Visite le ' + fd(r.check_in) : fd(r.check_in) + ' → ' + fd(r.check_out) + ' · ' + fcfa(r.total)}</span><br>${badge(r.status || 'requested')}</div>
    <div class="act">${r.listing_id ? `<a class="btn sm ghost" href="#annonce-${esc(r.listing_id)}">Voir</a>` : ''}${['requested', 'confirmed'].includes(r.status) ? `<button class="btn sm red" data-cancel="${esc(r.id)}">Annuler</button>` : ''}</div></div>`).join('')
    : '<div class="empty"><h3>Aucune réservation pour le moment</h3><p><a href="#annonces">Trouvez un logement</a> et réservez en quelques minutes.</p></div>'}</div></div>${prof}</div>`;
  $$('[data-cancel]').forEach(b => b.onclick = async () => { if (b.dataset.sure !== '1') { b.dataset.sure = '1'; b.textContent = 'Confirmer l\'annulation'; return; }
    try { await api.setBooking(b.dataset.cancel, 'cancelled'); toast('Réservation annulée.'); renderCompte(); } catch (e) { toast(friendly(e)); } });
  $('#pf').onsubmit = async e => { e.preventDefault(); const ph = cleanPhone($('#p-t').value); if (!phoneOk(ph)) return $('#p-e').textContent = 'Téléphone : 9 chiffres commençant par 6.';
    try { await api.saveProfile({full_name: $('#p-n').value.trim(), phone: ph}); renderNav(); toast('Profil enregistré.'); } catch (x) { $('#p-e').textContent = friendly(x); } };
  $('#logout').onclick = async () => { await sb.auth.signOut(); location.hash = 'accueil'; };
  if ($('#become')) $('#become').onclick = async () => { try { await api.saveProfile({role: 'owner'}); renderNav(); location.hash = 'espace'; } catch (x) { toast(friendly(x)); } };
}
function goLogin() { sessionStorage.setItem('kh-back', location.hash); authMode = 'login'; location.hash = 'connexion'; }

// ---------- Espace propriétaire ----------
async function renderEspace() {
  const box = $('#espace');
  if (!me) return goLogin();
  if (me.role === 'client') { box.innerHTML = '<div class="empty"><h3>Vous proposez des biens ?</h3><p>Activez l\'espace propriétaire pour publier vos annonces.</p><button class="btn" id="become2">Activer mon espace propriétaire</button></div>';
    $('#become2').onclick = async () => { try { await api.saveProfile({role: 'owner'}); renderNav(); renderEspace(); } catch (x) { toast(friendly(x)); } }; return; }
  box.innerHTML = loading;
  let ls, bs; try { [ls, bs] = await Promise.all([api.ownerListings(), api.ownerBookings()]); } catch (e) { box.innerHTML = fail(e); return; }
  const wait = bs.filter(b => b.status === 'requested'), earned = bs.filter(b => ['confirmed', 'completed'].includes(b.status)).reduce((s, b) => s + b.total - b.commission, 0);
  box.innerHTML = `<div class="dash"><div style="display:flex;flex-wrap:wrap;gap:12px;justify-content:space-between;align-items:center"><h1 style="margin:0">Espace propriétaire</h1><a class="btn green" href="#nouvelle-annonce">+ Nouvelle annonce</a></div>
  <div class="kpis"><div><b>${ls.filter(l => l.status === 'published').length}</b><span>annonces en ligne</span></div><div><b>${wait.length}</b><span>demandes à traiter</span></div><div><b>${bs.filter(b => b.status === 'confirmed').length}</b><span>réservations confirmées</span></div><div><b>${fcfa(earned)}</b><span>revenus confirmés (après 3 %)</span></div></div>
  <div><h2>Demandes et réservations</h2><div class="rows">${bs.length ? bs.map(bookingRow(true)).join('') : '<div class="empty">Aucune demande pour le moment.</div>'}</div></div>
  <div><h2>Mes annonces</h2><div class="rows">${ls.length ? ls.map(l => `<div class="item"><div class="ph">${pic(l)}</div><div><b>${esc(l.title)}</b><br><span class="note">${esc(l.city)} · ${esc(l.area)} · ${fcfa(l.price)} ${UNIT[l.mode]}</span><br>${badge(l.status)}</div>
    <div class="act"><a class="btn sm ghost" href="#annonce-${esc(l.id)}">Voir</a><a class="btn sm" href="#modifier-${esc(l.id)}">Modifier</a>${l.status !== 'archived' ? `<button class="btn sm grey" data-arch="${esc(l.id)}">Retirer</button>` : ''}</div></div>`).join('') : '<div class="empty"><h3>Pas encore d\'annonce</h3><p>Publiez votre premier bien : il sera visible après validation par notre équipe.</p></div>'}</div></div></div>`;
  bindBookingActions(renderEspace);
  $$('[data-arch]').forEach(b => b.onclick = async () => { try { await api.setListing(b.dataset.arch, {status: 'archived'}); toast('Annonce retirée du site.'); renderEspace(); } catch (e) { toast(friendly(e)); } });
}
const bookingRow = owner => b => `<div class="item noimg"><div><b>${esc(b.listing_title)}</b> · ${badge(b.status)}<br>
  <span class="note">${esc(b.reference)} · ${b.kind === 'visit' ? 'Visite le ' + fd(b.check_in) : `${fd(b.check_in)} → ${fd(b.check_out)} · ${b.nights} nuit${b.nights > 1 ? 's' : ''} · ${b.guests} pers. · ${fcfa(b.total)}${owner ? ' (vous recevez ' + fcfa(b.total - b.commission) + ')' : ' · commission ' + fcfa(b.commission)}`}</span><br>
  <span>${esc(b.client_name || 'Client')} · ${esc(b.contact_phone || b.client_phone || '')}</span>${b.payment_status === 'simulated' ? ' <span class="note">· paiement simulé</span>' : ''}${b.message ? `<br><span class="note">« ${esc(b.message)} »</span>` : ''}</div>
  <div class="act">${b.status === 'requested' ? `<button class="btn sm green" data-bs="confirmed" data-id="${esc(b.id)}">Confirmer</button><button class="btn sm red" data-bs="declined" data-id="${esc(b.id)}">Refuser</button>`
   : b.status === 'confirmed' ? `<button class="btn sm" data-bs="completed" data-id="${esc(b.id)}">Terminée</button><button class="btn sm grey" data-bs="cancelled" data-id="${esc(b.id)}">Annuler</button>` : ''}</div></div>`;
function bindBookingActions(again) {
  $$('[data-bs]').forEach(b => b.onclick = async () => { b.disabled = true;
    try { await api.setBooking(b.dataset.id, b.dataset.bs); toast('Réservation ' + ST[b.dataset.bs].toLowerCase() + '.'); again(); } catch (e) { toast(friendly(e)); b.disabled = false; } });
}

// ---------- Formulaire d'annonce (créer / modifier) ----------
async function renderForm(id) {
  const box = $('#lform');
  if (!me) return goLogin();
  let l = {city: 'Douala', type: TYPES[0], mode: 'nuit', photos: [], amenities: []};
  if (id) { box.innerHTML = loading; try { l = await api.listing(id); } catch (e) { box.innerHTML = fail(e); return; }
    if (!l || (l.owner_id !== me.id && me.role !== 'admin')) { box.innerHTML = '<div class="empty">Annonce introuvable.</div>'; return; } }
  let keep = photos(l);
  box.innerHTML = `<p><a href="#espace">← Espace propriétaire</a></p><h1>${id ? 'Modifier l\'annonce' : 'Nouvelle annonce'}</h1>${id && l.status === 'published' && me.role !== 'admin' ? '<p class="note">Après modification, l\'annonce repasse en validation avant de réapparaître sur le site.</p>' : ''}
  <form class="form" id="lf">
    <div class="full"><label for="l-title">Titre de l'annonce</label><input id="l-title" required minlength="3" maxlength="100" placeholder="Ex. Studio meublé à Bastos" value="${esc(l.title || '')}"></div>
    <div><label for="l-city">Ville</label><select id="l-city">${CITIES.map(c => `<option ${c === l.city ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
    <div><label for="l-area">Quartier</label><input id="l-area" required maxlength="60" placeholder="Ex. Bonapriso" value="${esc(l.area || '')}"></div>
    <div><label for="l-type">Type de bien</label><select id="l-type">${TYPES.map(t => `<option ${t === l.type ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
    <div><label for="l-mode">Proposé</label><select id="l-mode">${[['nuit', 'À la nuit (séjour)'], ['mois', 'Au mois (location)'], ['vente', 'À la vente']].map(([k, v]) => `<option value="${k}" ${k === l.mode ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
    <div><label for="l-price">Prix (FCFA)</label><input id="l-price" type="number" min="500" step="500" required inputmode="numeric" value="${esc(l.price || '')}"></div>
    <div><label for="l-am">Équipements (séparés par des virgules)</label><input id="l-am" maxlength="300" placeholder="Climatisation, Wifi, Parking" value="${esc((l.amenities || []).join(', '))}"></div>
    <div class="full"><label for="l-desc">Description</label><textarea id="l-desc" maxlength="2000" placeholder="Pièces, équipements, accès, règles de la maison…">${esc(l.description || '')}</textarea></div>
    <div class="full"><label for="l-ph">Photos (8 maximum, la première sert de couverture)</label><input id="l-ph" type="file" accept="image/*" multiple><div class="prev" id="l-prev"></div></div>
    <div class="full"><p class="err" id="l-e"></p><button class="btn green" id="l-save">${id ? 'Enregistrer' : 'Envoyer pour validation'}</button></div>
  </form>`;
  let files = [];
  const prev = () => { $('#l-prev').innerHTML = keep.map((u, i) => `<span style="position:relative"><img src="${esc(u)}" alt=""><button type="button" class="x" data-rm="${i}" aria-label="Retirer la photo" style="position:absolute;top:-6px;right:-6px;width:26px;height:26px;border-radius:50%;border:0;background:#d64545;color:#fff;cursor:pointer">×</button></span>`).join('') + files.map(f => `<span class="note">${esc(f.name)}</span>`).join(' ');
    $$('[data-rm]').forEach(b => b.onclick = () => { keep.splice(+b.dataset.rm, 1); prev(); }); };
  prev();
  $('#l-ph').onchange = e => { files = [...e.target.files].slice(0, Math.max(0, 8 - keep.length)); prev(); };
  $('#lf').onsubmit = async e => {
    e.preventDefault(); const btn = $('#l-save'), err = $('#l-e'); err.textContent = ''; btn.disabled = true; btn.textContent = 'Envoi en cours…';
    try {
      const up = []; for (let i = 0; i < files.length; i++) { btn.textContent = `Envoi des photos ${i + 1}/${files.length}…`; up.push(await api.upload(files[i], i)); }
      const data = {title: $('#l-title').value.trim(), city: $('#l-city').value, area: $('#l-area').value.trim(), type: $('#l-type').value, mode: $('#l-mode').value,
        price: Math.round(+$('#l-price').value), description: $('#l-desc').value.trim(), amenities: $('#l-am').value.split(',').map(s => s.trim()).filter(Boolean).slice(0, 20), photos: [...keep, ...up].slice(0, 8)};
      await api.saveListing(data, id);
      toast(me.role === 'admin' ? 'Annonce enregistrée.' : 'Annonce envoyée : elle sera visible après validation.'); location.hash = 'espace';
    } catch (x) { err.textContent = friendly(x); btn.disabled = false; btn.textContent = id ? 'Enregistrer' : 'Envoyer pour validation'; }
  };
}

// ---------- Administration ----------
let adminTab = 'pending';
async function renderAdmin() {
  const box = $('#admin');
  if (!me) return goLogin();
  if (me.role !== 'admin') { box.innerHTML = '<div class="empty">Accès réservé à l\'équipe Kambuyam.</div>'; return; }
  box.innerHTML = loading;
  let ls, bs, us; try { [ls, bs, us] = await Promise.all([api.adminListings(), api.adminBookings(), api.users()]); } catch (e) { box.innerHTML = fail(e); return; }
  const conf = bs.filter(b => ['confirmed', 'completed'].includes(b.status)), pend = ls.filter(l => l.status === 'pending');
  const tabs = [['pending', `À valider (${pend.length})`], ['listings', 'Annonces'], ['bookings', 'Réservations'], ['users', 'Utilisateurs']];
  const lrow = l => `<div class="item"><div class="ph">${pic(l)}</div><div><b>${esc(l.title)}</b> ${badge(l.status)}${l.featured ? ' <span class="st">À la une</span>' : ''}<br><span class="note">${esc(l.type)} · ${esc(l.city)}, ${esc(l.area)} · ${fcfa(l.price)} ${UNIT[l.mode]}</span><br><span class="note">Par ${esc(l.owner ? l.owner.full_name : '')} · ${esc(l.owner ? l.owner.phone : '')}</span></div>
    <div class="act"><a class="btn sm ghost" href="#annonce-${esc(l.id)}">Voir</a>${l.status !== 'published' ? `<button class="btn sm green" data-ls="published" data-id="${esc(l.id)}">Publier</button>` : `<button class="btn sm" data-feat="${l.featured ? 0 : 1}" data-id="${esc(l.id)}">${l.featured ? 'Retirer de la une' : 'Mettre à la une'}</button>`}${l.status === 'pending' ? `<button class="btn sm red" data-ls="rejected" data-id="${esc(l.id)}">Refuser</button>` : ''}${l.status === 'published' ? `<button class="btn sm grey" data-ls="archived" data-id="${esc(l.id)}">Retirer</button>` : ''}</div></div>`;
  const content = adminTab === 'pending' ? (pend.length ? pend.map(lrow).join('') : '<div class="empty">Aucune annonce en attente. 👍</div>')
    : adminTab === 'listings' ? ls.map(lrow).join('')
    : adminTab === 'bookings' ? (bs.length ? bs.map(bookingRow(false)).join('') : '<div class="empty">Aucune réservation.</div>')
    : us.map(u => `<div class="item noimg"><div><b>${esc(u.full_name || '(sans nom)')}</b> · ${esc(u.phone)}<br><span class="note">Inscrit le ${fd(String(u.created_at).slice(0, 10))}</span></div><div class="act"><label class="note" for="r-${esc(u.id)}">Rôle</label><select id="r-${esc(u.id)}" data-role="${esc(u.id)}" style="width:auto">${Object.entries(ROLE).map(([k, v]) => `<option value="${k}" ${k === u.role ? 'selected' : ''}>${v}</option>`).join('')}</select></div></div>`).join('');
  box.innerHTML = `<div class="dash"><h1>Administration</h1>
  <div class="kpis"><div><b>${ls.filter(l => l.status === 'published').length}</b><span>annonces en ligne</span></div><div><b>${pend.length}</b><span>à valider</span></div><div><b>${bs.filter(b => b.status === 'requested').length}</b><span>demandes en attente</span></div><div><b>${conf.length}</b><span>réservations confirmées</span></div><div><b>${fcfa(conf.reduce((s, b) => s + b.commission, 0))}</b><span>commissions (3 %)</span></div><div><b>${us.length}</b><span>utilisateurs</span></div></div>
  <div><div class="seg">${tabs.map(([k, v]) => `<button data-tab="${k}" aria-pressed="${k === adminTab}">${v}</button>`).join('')}</div><div class="rows">${content}</div></div></div>`;
  $$('[data-tab]').forEach(b => b.onclick = () => { adminTab = b.dataset.tab; renderAdmin(); });
  $$('[data-ls]').forEach(b => b.onclick = async () => { try { await api.setListing(b.dataset.id, {status: b.dataset.ls}); toast('Annonce : ' + ST[b.dataset.ls].toLowerCase() + '.'); renderAdmin(); } catch (e) { toast(friendly(e)); } });
  $$('[data-feat]').forEach(b => b.onclick = async () => { try { await api.setListing(b.dataset.id, {featured: b.dataset.feat === '1'}); renderAdmin(); } catch (e) { toast(friendly(e)); } });
  $$('[data-role]').forEach(s => s.onchange = async () => { try { await api.setRole(s.dataset.role, s.value); toast('Rôle mis à jour.'); } catch (e) { toast(friendly(e)); renderAdmin(); } });
  bindBookingActions(renderAdmin);
}

// ---------- Page propriétaires, contact ----------
function renderOwnerCta() {
  $('#owner-cta').innerHTML = !me ? '<p><a class="btn green" href="#connexion" id="cta-owner">Créer mon compte propriétaire</a> <a class="btn ghost" href="#connexion">J\'ai déjà un compte</a></p>'
    : `<p><a class="btn green" href="${me.role === 'client' ? '#espace' : '#nouvelle-annonce'}">${me.role === 'client' ? 'Activer mon espace propriétaire' : 'Publier une annonce'}</a></p>`;
  if ($('#cta-owner')) $('#cta-owner').addEventListener('click', () => authMode = 'owner');
}
function bars() { const r = +$('#c-rent').value || 0, k = r * .03, mx = Math.max(r, 1);
  $('#bars').innerHTML = `<div><span>Agence classique</span><b style="width:${r / mx * 60}%"></b><em>${fcfa(r)}</em></div><div><span>Kambuyam Home</span><b class="g" style="width:${Math.max(k / mx * 60, 1)}%"></b><em>${fcfa(k)}</em></div>`; }
$('#c-rent').addEventListener('input', bars); bars();
$('#ct').addEventListener('submit', e => { e.preventDefault(); e.target.reset(); $('#ct-msg').textContent = 'Merci ! Message enregistré (version de démonstration).'; });

// ---------- Navigation ----------
function route() {
  const h = decodeURIComponent(location.hash.slice(1)) || 'accueil';
  let v = h.startsWith('annonce-') ? 'annonce' : h.startsWith('modifier-') || h === 'nouvelle-annonce' ? 'annonce-form' : h;
  if (!$('#v-' + v)) v = 'accueil';
  $$('.view').forEach(s => s.classList.toggle('on', s.id === 'v-' + v));
  const navKey = {annonce: 'annonces', 'annonce-form': 'espace'}[v] || v;
  $$('#nav a').forEach(a => a.toggleAttribute('aria-current', a.getAttribute('href') === '#' + navKey));
  if (dlg.open) dlg.close();
  window.scrollTo(0, 0);
  ({accueil: renderFeat, annonces: renderList, annonce: () => renderDetail(h.slice(8)), connexion: renderAuth, compte: renderCompte, espace: renderEspace,
    'annonce-form': () => renderForm(h.startsWith('modifier-') ? h.slice(9) : null), admin: renderAdmin, proprietaires: renderOwnerCta}[v] || (() => {}))();
}
addEventListener('hashchange', route);

{
  let first = true;
  sb.auth.onAuthStateChange((ev, session) => {
    setTimeout(async () => {   // hors du callback (recommandé par Supabase)
      await loadMe(session); renderNav();
      if (ev === 'PASSWORD_RECOVERY') { authMode = 'reset'; location.hash = 'connexion'; route(); return; }
      if (ev === 'SIGNED_IN' && location.hash === '#connexion') { const back = sessionStorage.getItem('kh-back'); sessionStorage.removeItem('kh-back'); location.hash = back && back !== '#connexion' ? back.slice(1) : 'compte'; return; }
      if (first || ev === 'SIGNED_OUT') { first = false; route(); }
    }, 0);
  });
}
}
