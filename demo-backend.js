// Kambuyam Home : base de données de démonstration, dans le navigateur.
// Utilisée tant que config.js est vide. Elle imite Supabase (comptes, annonces, réservations)
// et garde les données dans le navigateur du visiteur uniquement (localStorage). Rien n'est envoyé.
window.khDemoClient = function (seedListings) {
  'use strict';
  const KEY = 'kh-demo-db-v2';
  const now = () => new Date().toISOString();
  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36));
  const ADMIN = 'demo-admin', OWNER = 'demo-proprio', CLIENT = 'demo-client';
  function fresh() {
    return {
      users: [
        {id: ADMIN, email: 'admin@demo.cm', password: 'demo123'},
        {id: OWNER, email: 'proprio@demo.cm', password: 'demo123'},
        {id: CLIENT, email: 'client@demo.cm', password: 'demo123'}],
      profiles: [
        {id: ADMIN, full_name: 'Équipe Kambuyam', phone: '699000000', role: 'admin', created_at: now()},
        {id: OWNER, full_name: 'Paul Propriétaire', phone: '677000000', role: 'owner', created_at: now()},
        {id: CLIENT, full_name: 'Awa Cliente', phone: '655000000', role: 'client', created_at: now()}],
      listings: seedListings.map((l, i) => ({amenities: [], photos: [], featured: false, description: '', ...l,
        owner_id: l.partner ? ADMIN : OWNER, status: 'published', created_at: new Date(Date.now() - (100 - i) * 6e4).toISOString()})),
      bookings: [], session: null
    };
  }
  let db; try { db = JSON.parse(localStorage.getItem(KEY)) || fresh(); } catch (e) { db = fresh(); }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { throw new Error('Mémoire du navigateur pleine : retirez des photos de démonstration.'); } };
  const subs = [];
  const emit = ev => subs.forEach(f => f(ev, db.session));
  const meId = () => db.session && db.session.user.id;
  const prof = () => db.profiles.find(p => p.id === meId()) || {};
  const isAdmin = () => prof().role === 'admin';
  const listing = id => db.listings.find(l => l.id === id);
  const overlap = (a1, b1, a2, b2) => a1 < b2 && b1 > a2;
  const taken = id => db.bookings.filter(b => b.listing_id === id && b.kind === 'stay' && ['confirmed', 'completed'].includes(b.status));

  // Ce que chaque compte a le droit de voir (mêmes règles que la vraie base).
  function visible(t, r) {
    const me = meId();
    if (t === 'listings') return r.status === 'published' || r.owner_id === me || isAdmin();
    if (t === 'bookings' || t === 'booking_details') { const l = listing(r.listing_id) || {}; return r.client_id === me || l.owner_id === me || isAdmin(); }
    if (t === 'profiles') return r.id === me || isAdmin() || db.bookings.some(b => b.client_id === r.id && (listing(b.listing_id) || {}).owner_id === me);
    return false;
  }
  function details(b) {
    const l = listing(b.listing_id) || {}, c = db.profiles.find(p => p.id === b.client_id) || {};
    return {...b, listing_title: l.title, city: l.city, area: l.area, owner_id: l.owner_id, mode: l.mode, client_name: c.full_name, client_phone: c.phone};
  }
  function insert(t, row) {
    const me = meId(); if (!me) throw new Error('row-level security');
    if (t === 'listings') {
      if (!['owner', 'admin'].includes(prof().role) || row.owner_id !== me) throw new Error('row-level security');
      const r = {id: uid(), amenities: [], photos: [], description: '', featured: false, ...row, status: isAdmin() ? (row.status || 'published') : 'pending', created_at: now()};
      if (!isAdmin()) r.featured = false;
      db.listings.push(r); return r;
    }
    if (t === 'bookings') {
      const l = listing(row.listing_id);
      if (!l || l.status !== 'published') throw new Error('Annonce non disponible');
      const r = {id: uid(), reference: 'KBY-' + Math.random().toString(36).slice(2, 8).toUpperCase(), guests: 1, contact_phone: '', message: '', ...row,
        client_id: me, status: 'requested', created_at: now(), payment_status: row.payment_status === 'simulated' ? 'simulated' : 'unpaid'};
      if (l.mode === 'nuit') {
        const n = Math.round((new Date(r.check_out) - new Date(r.check_in)) / 864e5);
        if (!(n > 0)) throw new Error('Dates invalides');
        if (taken(l.id).some(b => overlap(r.check_in, r.check_out, b.check_in, b.check_out))) throw new Error('Ces dates ne sont plus disponibles');
        Object.assign(r, {kind: 'stay', nights: n, total: l.price * n});
      } else Object.assign(r, {kind: 'visit', check_out: null, nights: 0, total: 0});
      r.commission = Math.round(r.total * 0.03);
      db.bookings.push(r); return r;
    }
    throw new Error('row-level security');
  }
  function update(t, r, patch) {
    const me = meId(); if (!me) throw new Error('row-level security');
    if (t === 'profiles') {
      if (r.id !== me && !isAdmin()) throw new Error('row-level security');
      if (patch.role && patch.role !== r.role && !isAdmin() && !(r.role === 'client' && patch.role === 'owner')) throw new Error('Changement de rôle non autorisé');
      Object.assign(r, patch); return;
    }
    if (t === 'listings') {
      if (r.owner_id !== me && !isAdmin()) throw new Error('row-level security');
      const p = {...patch};
      if (!isAdmin()) { delete p.featured; p.status = patch.status === 'archived' ? 'archived' : 'pending'; }
      Object.assign(r, p, {updated_at: now()}); return;
    }
    if (t === 'bookings') {
      const l = listing(r.listing_id) || {}, owner = l.owner_id === me, s = patch.status;
      if (!isAdmin()) {
        const ok = (owner && r.status === 'requested' && ['confirmed', 'declined'].includes(s)) || (owner && r.status === 'confirmed' && ['completed', 'cancelled'].includes(s))
          || (r.client_id === me && ['requested', 'confirmed'].includes(r.status) && s === 'cancelled');
        if (!ok) throw new Error('Changement de statut non autorisé');
      }
      if (s === 'confirmed' && r.kind === 'stay' && taken(r.listing_id).some(b => b.id !== r.id && overlap(r.check_in, r.check_out, b.check_in, b.check_out))) throw new Error('no_overlap');
      r.status = s; return;
    }
  }

  function Query(t) { this.t = t; this.filters = []; this.op = 'select'; this.one = 0; this.embedOwner = false; }
  Query.prototype.select = function (cols) { if (this.op === 'select' && cols && /owner:profiles/.test(cols)) this.embedOwner = true; return this; };
  Query.prototype.eq = function (k, v) { this.filters.push(r => r[k] === v); return this; };
  Query.prototype.order = function (k, o) { (this.sorts = this.sorts || []).push([k, !o || o.ascending !== false]); return this; };
  Query.prototype.limit = function () { return this; };
  Query.prototype.insert = function (row) { this.op = 'insert'; this.row = row; return this; };
  Query.prototype.update = function (p) { this.op = 'update'; this.patch = p; return this; };
  Query.prototype.single = function () { this.one = 1; return this; };
  Query.prototype.maybeSingle = function () { this.one = 2; return this; };
  Query.prototype.then = function (ok, ko) { return new Promise(r => setTimeout(r, 120)).then(() => { try { return this.run(); } catch (e) { return {data: null, error: {message: e.message}}; } }).then(ok, ko); };
  Query.prototype.run = function () {
    let rows;
    if (this.op === 'insert') { rows = [insert(this.t, this.row)]; save(); }
    else {
      const base = this.t === 'booking_details' ? db.bookings : db[this.t];
      rows = base.filter(r => visible(this.t, r));
      if (this.t === 'booking_details') rows = rows.map(details);
      rows = rows.filter(r => this.filters.every(f => f(r)));
      if (this.op === 'update') { rows.forEach(r => update(this.t, r, this.patch)); save(); }
      if (this.embedOwner) rows = rows.map(l => ({...l, owner: (({full_name, phone}) => ({full_name, phone}))(db.profiles.find(p => p.id === l.owner_id) || {})}));
      for (const [k, asc] of (this.sorts || []).slice().reverse()) rows = rows.slice().sort((a, b) => (a[k] > b[k] ? 1 : a[k] < b[k] ? -1 : 0) * (asc ? 1 : -1));
      rows = rows.map(r => ({...r}));
    }
    if (this.one) { if (!rows.length && this.one === 1) throw new Error('Aucun résultat'); return {data: rows[0] || null, error: null}; }
    return {data: rows, error: null};
  };
  const ok = data => ({data, error: null}), err = m => ({data: null, error: {message: m}});
  return {
    demo: true,
    reset() { db = fresh(); save(); emit('SIGNED_OUT'); },
    from: t => new Query(t),
    async rpc(fn, args) { return ok(fn === 'taken_dates' ? taken(args.p_listing).map(({check_in, check_out}) => ({check_in, check_out})) : []); },
    storage: {from: () => ({
      async upload(path, blob) { const url = await new Promise(r => { const f = new FileReader(); f.onload = () => r(f.result); f.readAsDataURL(blob); }); (db.files = db.files || {})[path] = url; return ok({path}); },
      getPublicUrl: path => ({data: {publicUrl: (db.files || {})[path] || ''}})
    })},
    auth: {
      onAuthStateChange(f) { subs.push(f); setTimeout(() => f('INITIAL_SESSION', db.session), 0); return {data: {subscription: {unsubscribe() {}}}}; },
      async signUp({email, password, options}) {
        email = String(email).toLowerCase();
        if (db.users.some(u => u.email === email)) return err('User already registered');
        if (String(password).length < 6) return err('Password should be at least 6 characters');
        const id = uid(), md = (options && options.data) || {};
        db.users.push({id, email, password});
        db.profiles.push({id, full_name: md.full_name || '', phone: md.phone || '', role: md.role === 'owner' ? 'owner' : 'client', created_at: now()});
        db.session = {user: {id, email}}; save(); emit('SIGNED_IN'); return ok({session: db.session, user: db.session.user});
      },
      async signInWithPassword({email, password}) {
        const u = db.users.find(x => x.email === String(email).toLowerCase() && x.password === password);
        if (!u) return err('Invalid login credentials');
        db.session = {user: {id: u.id, email: u.email}}; save(); emit('SIGNED_IN'); return ok({session: db.session});
      },
      async signOut() { db.session = null; save(); emit('SIGNED_OUT'); return {error: null}; },
      async resetPasswordForEmail() { return ok({}); },
      async updateUser() { return ok({}); }
    }
  };
};
