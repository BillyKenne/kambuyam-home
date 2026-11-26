import vine from '@vinejs/vine'
import { TYPES } from '#services/demo_data'

const phone = () => vine.string().trim().regex(/^6\d{8}$/)
const date = () => vine.string().regex(/^\d{4}-\d{2}-\d{2}$/)
// Photos : images du site (img/…), photos envoyées (uploads/…) ou adresses https.
const photo = vine.string().regex(/^(https:\/\/[^\s"'<>]+|img\/[\w.-]+|uploads\/[\w.-]+)$/)

export const signupValidator = vine.compile(
  vine.object({
    email: vine.string().trim().toLowerCase().email().maxLength(254),
    password: vine.string().minLength(6).maxLength(200),
    full_name: vine.string().trim().minLength(2).maxLength(120),
    phone: phone(),
    role: vine.enum(['client', 'owner']).optional(),
  })
)

export const loginValidator = vine.compile(
  vine.object({ email: vine.string().trim().toLowerCase(), password: vine.string() })
)

export const profileValidator = vine.compile(
  vine.object({
    full_name: vine.string().trim().minLength(2).maxLength(120).optional(),
    phone: phone().optional(),
    role: vine.enum(['client', 'owner', 'admin']).optional(),
  })
)

const listingFields = {
  title: vine.string().trim().minLength(3).maxLength(100),
  type: vine.enum(TYPES),
  city: vine.string().trim().minLength(2).maxLength(60),
  area: vine.string().trim().maxLength(120),
  mode: vine.enum(['nuit', 'mois', 'vente'] as const),
  price: vine.number().withoutDecimals().min(1).max(10_000_000_000),
  description: vine.string().trim().maxLength(2000),
  amenities: vine.array(vine.string().trim().maxLength(60)).maxLength(20),
  photos: vine.array(photo).maxLength(8),
  max_guests: vine.number().withoutDecimals().range([1, 50]).nullable(),
  bedrooms: vine.number().withoutDecimals().range([0, 50]).nullable(),
  status: vine.enum(['pending', 'published', 'rejected', 'archived'] as const),
  featured: vine.boolean(),
}
type F = typeof listingFields
const optional = Object.fromEntries(Object.entries(listingFields).map(([k, v]) => [k, (v as any).optional()])) as {
  [K in keyof F]: ReturnType<F[K]['optional']>
}

export const createListingValidator = vine.compile(
  vine.object({ ...listingFields, area: listingFields.area.optional(), description: listingFields.description.optional(),
    amenities: listingFields.amenities.optional(), photos: listingFields.photos.optional(), max_guests: listingFields.max_guests.optional(),
    bedrooms: listingFields.bedrooms.optional(), status: listingFields.status.optional(), featured: listingFields.featured.optional() })
)
export const updateListingValidator = vine.compile(vine.object(optional))

export const bookingValidator = vine.compile(
  vine.object({
    listing_id: vine.string().maxLength(64),
    check_in: date(),
    check_out: date().nullable().optional(),
    guests: vine.number().withoutDecimals().range([1, 20]).optional(),
    contact_phone: vine.string().trim().maxLength(20).optional(),
    message: vine.string().trim().maxLength(1000).optional(),
    payment_method: vine.enum(['orange_money', 'mtn_momo'] as const).nullable().optional(),
  })
)

export const bookingStatusValidator = vine.compile(
  vine.object({ status: vine.enum(['requested', 'confirmed', 'declined', 'cancelled', 'completed'] as const) })
)
