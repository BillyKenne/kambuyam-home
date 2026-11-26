// Règles de Kambuyam Home : qui voit quoi, qui peut changer quoi.
// (Mêmes règles que la version Supabase et que le mode démonstration.)
import Booking, { type BookingStatus } from '#models/booking'
import Listing from '#models/listing'
import User from '#models/user'

export const COMMISSION = 0.03

export class Forbidden extends Error {
  status = 403
  constructor(message = 'Action non autorisée') {
    super(message)
  }
}

export const canSeeListing = (l: Listing, me?: User | null) =>
  l.status === 'published' || (!!me && (l.ownerId === me.id || me.isAdmin))

export const canSeeBooking = (b: Booking, l: Listing | null, me: User) =>
  b.clientId === me.id || (!!l && l.ownerId === me.id) || me.isAdmin

const overlap = (a1: string, b1: string, a2: string, b2: string) => a1 < b2 && b1 > a2

/** Séjours confirmés ou terminés d'un logement (dates prises). */
export function takenStays(listingId: string) {
  return Booking.query().where('listing_id', listingId).where('kind', 'stay').whereIn('status', ['confirmed', 'completed'])
}

export async function datesTaken(listingId: string, checkIn: string, checkOut: string, exceptId?: string) {
  const stays = await takenStays(listingId)
  return stays.some((b) => b.id !== exceptId && overlap(checkIn, checkOut, b.checkIn, b.checkOut || checkIn))
}

/** Changement de statut d'une réservation : propriétaire, client ou admin. */
export function canMoveBooking(b: Booking, l: Listing, me: User, to: BookingStatus) {
  if (me.isAdmin) return true
  const owner = l.ownerId === me.id
  return (
    (owner && b.status === 'requested' && ['confirmed', 'declined'].includes(to)) ||
    (owner && b.status === 'confirmed' && ['completed', 'cancelled'].includes(to)) ||
    (b.clientId === me.id && ['requested', 'confirmed'].includes(b.status) && to === 'cancelled')
  )
}

export function nightsBetween(checkIn: string, checkOut: string) {
  return Math.round((Date.parse(checkOut + 'T12:00:00Z') - Date.parse(checkIn + 'T12:00:00Z')) / 864e5)
}

/** Réservation + infos du logement et du client, comme la vue « booking_details ». */
export function details(b: Booking) {
  const l = b.listing, c = b.client
  const { listing: _l, client: _c, ...row } = b.serialize()
  return {
    ...row,
    listing_title: l?.title, city: l?.city, area: l?.area, owner_id: l?.ownerId, mode: l?.mode,
    client_name: c?.fullName, client_phone: c?.phone,
  }
}
