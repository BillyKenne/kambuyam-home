import type { HttpContext } from '@adonisjs/core/http'
import Listing from '#models/listing'
import Booking from '#models/booking'
import { canSeeListing, Forbidden, takenStays } from '#services/rules'
import { createListingValidator, updateListingValidator } from '#validators/kambuyam'

const columns = (d: Record<string, any>) => {
  const map: Record<string, string> = { max_guests: 'maxGuests' }
  return Object.fromEntries(Object.entries(d).filter(([, v]) => v !== undefined).map(([k, v]) => [map[k] || k, v]))
}

export default class ListingsController {
  /** Annonces publiées (les « à la une » d'abord). */
  async index() {
    return Listing.query().where('status', 'published').orderBy('featured', 'desc').orderBy('created_at', 'asc')
  }

  /** Une annonce (null si introuvable ou pas encore publiée). */
  async show({ params, auth }: HttpContext) {
    await auth.check()
    const l = await Listing.find(params.id)
    return l && canSeeListing(l, auth.user) ? l : null
  }

  /** Dates déjà prises, sans dire qui a réservé. */
  async taken({ params }: HttpContext) {
    const stays = await takenStays(params.id)
    return stays.map((b) => ({ check_in: b.checkIn, check_out: b.checkOut }))
  }

  /** Logements occupés entre deux dates (pour la recherche). */
  async busy({ request }: HttpContext) {
    const din = String(request.input('in', '')), dout = String(request.input('out', ''))
    if (!/^\d{4}-\d{2}-\d{2}$/.test(din) || !/^\d{4}-\d{2}-\d{2}$/.test(dout)) return []
    const rows = await Booking.query().where('kind', 'stay').whereIn('status', ['confirmed', 'completed'])
      .where('check_in', '<', dout).where('check_out', '>', din).distinct('listing_id')
    return rows.map((b) => b.listingId)
  }

  /** Espace propriétaire : mes annonces. */
  async mine({ auth }: HttpContext) {
    const me = auth.getUserOrFail()
    return Listing.query().where('owner_id', me.id).orderBy('created_at', 'desc')
  }

  /** Admin : toutes les annonces, avec le nom et le téléphone du propriétaire. */
  async all({ auth }: HttpContext) {
    if (!auth.getUserOrFail().isAdmin) throw new Forbidden()
    const rows = await Listing.query().preload('owner').orderBy('created_at', 'desc')
    return rows.map((l) => ({ ...l.serialize(), owner: { full_name: l.owner?.fullName, phone: l.owner?.phone } }))
  }

  /** Nouvelle annonce : en attente de validation, sauf si c'est l'admin qui publie. */
  async store({ request, auth }: HttpContext) {
    const me = auth.getUserOrFail()
    if (!me.canPublish) throw new Forbidden()
    const data = columns(await request.validateUsing(createListingValidator))
    if (!me.isAdmin) Object.assign(data, { featured: false, status: 'pending' })
    else data.status = data.status || 'published'
    return Listing.create({ ...data, ownerId: me.id })
  }

  /** Modifier une annonce. Pour un non-admin, toute modification repasse « en attente » (sauf retrait). */
  async update({ params, request, auth }: HttpContext) {
    const me = auth.getUserOrFail()
    const l = await Listing.findOrFail(params.id)
    if (l.ownerId !== me.id && !me.isAdmin) throw new Forbidden()
    const data = columns(await request.validateUsing(updateListingValidator))
    if (!me.isAdmin) {
      delete data.featured
      data.status = data.status === 'archived' ? 'archived' : 'pending'
    }
    l.merge(data)
    await l.save()
    return l
  }
}
