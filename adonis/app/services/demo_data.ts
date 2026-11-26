// Données de démonstration : comptes de test et annonces (Résidence Soft Time + exemples).
// Utilisées au premier démarrage et par le bouton « Remettre à zéro » du mode démonstration.
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import Listing from '#models/listing'
import User from '#models/user'

export const DEMO_PASSWORD = 'demo123'
export const TYPES = ['Appartement meublé', 'Chambre / studio', 'Appartement', 'Maison', 'Terrain'];

type Demo = Record<string, any>
const imgs = (p: string, n: number, c: number) => { const a = Array.from({length: n}, (_, i) => `img/${p}-${i + 1}.jpg`); return [a[c], ...a.filter((_, i) => i !== c)]; };
const amST = ['Climatisation', 'Wifi gratuit', 'Écran plat', 'Cuisine équipée', 'Sécurité 24h/24', 'Accueil 24h/24'];
const SOFT = 'Résidence Soft Time', BON = 'Bonamoussadi (Terminus)';
const DEMO: Demo[] = [
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

// Capacité [voyageurs, chambres] (Soft Time : indicatif, à confirmer).
const CAP: Record<string, [number, number]> = {apt1: [2, 1], apt2: [2, 1], apt3: [2, 1], apt4: [2, 1], apt5: [3, 1], chambre: [2, 0], bastos: [6, 3], ngoa: [1, 0], odza: [8, 4], bonapriso: [6, 3], kribi: [4, 2], bafoussam: [4, 2], limbe: [2, 0]};
DEMO.forEach(l => { if (CAP[l.id]) [l.max_guests, l.bedrooms] = CAP[l.id]; });
['bastos', 'kribi', 'odza'].forEach(id => DEMO.find((l) => l.id === id)!.amenities.push('Groupe électrogène'));

/** Vide la base et remet les comptes et annonces de démonstration. */
export async function resetDemo() {
  await db.from('bookings').delete()
  await db.from('listings').delete()
  await db.from('users').delete()
  const mk = (email: string, fullName: string, phone: string, role: 'admin' | 'owner' | 'client') =>
    User.create({ email, password: DEMO_PASSWORD, fullName, phone, role })
  const admin = await mk('admin@demo.cm', 'Équipe Kambuyam', '699000000', 'admin')
  const owner = await mk('proprio@demo.cm', 'Paul Propriétaire', '677000000', 'owner')
  await mk('client@demo.cm', 'Awa Cliente', '655000000', 'client')
  const start = DateTime.now().minus({ minutes: 100 })
  for (const [i, l] of DEMO.entries()) {
    await Listing.create({
      id: l.id, title: l.title, type: l.type, city: l.city, area: l.area, mode: l.mode, price: l.price,
      description: l.description || '', amenities: l.amenities || [], photos: l.photos || [],
      partner: l.partner || null, ex: !!l.ex, featured: !!l.featured, maxGuests: l.max_guests ?? null, bedrooms: l.bedrooms ?? null,
      ownerId: l.partner ? admin.id : owner.id, status: 'published', createdAt: start.plus({ minutes: i }),
    })
  }
}

/** Au démarrage : remplit la base si elle est vide. */
export async function seedIfEmpty() {
  const row = await db.from('users').count('* as n').first()
  if (!row || Number(row.n) === 0) await resetDemo()
}
