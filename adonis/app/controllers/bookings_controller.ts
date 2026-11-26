import type { HttpContext } from '@adonisjs/core/http'
import Booking from '#models/booking'
import Listing from '#models/listing'
import { canMoveBooking, canSeeBooking, COMMISSION, datesTaken, details, Forbidden, nightsBetween } from '#services/rules'
import { bookingStatusValidator, bookingValidator } from '#validators/kambuyam'

const withDetails = () => Booking.query().preload('listing').preload('client').orderBy('created_at', 'desc')

export default class BookingsController {
  /** Réserver un séjour (à la nuit) ou demander une visite (au mois / à vendre). Le prix est calculé ici. */
  async store({ request, response, auth }: HttpContext) {
    const me = auth.getUserOrFail()
    const d = await request.validateUsing(bookingValidator)
    const l = await Listing.find(d.listing_id)
    if (!l || l.status !== 'published') return response.unprocessableEntity({ message: 'Annonce non disponible' })
    const b = new Booking().merge({
      listingId: l.id, clientId: me.id, checkIn: d.check_in, guests: d.guests || 1, contactPhone: d.contact_phone || '',
      message: d.message || '', paymentMethod: d.payment_method || null, paymentStatus: d.payment_method ? 'simulated' : 'unpaid', status: 'requested',
    })
    if (l.mode === 'nuit') {
      const nights = d.check_out ? nightsBetween(d.check_in, d.check_out) : 0
      if (!(nights > 0)) return response.unprocessableEntity({ message: 'Dates invalides' })
      if (await datesTaken(l.id, d.check_in, d.check_out!)) return response.conflict({ message: 'Ces dates ne sont plus disponibles' })
      b.merge({ kind: 'stay', checkOut: d.check_out!, nights, total: l.price * nights })
    } else {
      b.merge({ kind: 'visit', checkOut: null, nights: 0, total: 0 })
    }
    b.commission = Math.round(b.total * COMMISSION)
    await b.save()
    return b
  }

  /** Mes réservations (client). */
  async mine({ auth }: HttpContext) {
    const me = auth.getUserOrFail()
    return (await withDetails().where('client_id', me.id)).map(details)
  }

  /** Demandes reçues sur mes logements (propriétaire). */
  async owner({ auth }: HttpContext) {
    const me = auth.getUserOrFail()
    const rows = await withDetails().whereIn('listing_id', Listing.query().select('id').where('owner_id', me.id))
    return rows.map(details)
  }

  /** Admin : toutes les réservations (300 dernières). */
  async all({ auth }: HttpContext) {
    if (!auth.getUserOrFail().isAdmin) throw new Forbidden()
    return (await withDetails().limit(300)).map(details)
  }

  /** Accepter, refuser, annuler, terminer. */
  async update({ params, request, response, auth }: HttpContext) {
    const me = auth.getUserOrFail()
    const { status } = await request.validateUsing(bookingStatusValidator)
    const b = await Booking.findOrFail(params.id)
    const l = await Listing.findOrFail(b.listingId)
    if (!canSeeBooking(b, l, me) || !canMoveBooking(b, l, me, status)) throw new Forbidden('Changement de statut non autorisé')
    if (status === 'confirmed' && b.kind === 'stay' && (await datesTaken(l.id, b.checkIn, b.checkOut!, b.id)))
      return response.conflict({ message: 'no_overlap' })
    b.status = status
    await b.save()
    return b
  }
}
