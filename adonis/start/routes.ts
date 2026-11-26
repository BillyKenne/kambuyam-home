/*
|--------------------------------------------------------------------------
| Kambuyam Home : adresses du site et de l'API
|--------------------------------------------------------------------------
*/
import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

const PagesController = () => import('#controllers/pages_controller')
const AuthController = () => import('#controllers/auth_controller')
const ProfilesController = () => import('#controllers/profiles_controller')
const ListingsController = () => import('#controllers/listings_controller')
const BookingsController = () => import('#controllers/bookings_controller')
const UploadsController = () => import('#controllers/uploads_controller')
const DemoController = () => import('#controllers/demo_controller')

router.get('/', [PagesController, 'home'])

router
  .group(() => {
    // Ouvert à tous
    router.get('session', [AuthController, 'session'])
    router.post('signup', [AuthController, 'signup'])
    router.post('login', [AuthController, 'login'])
    router.post('logout', [AuthController, 'logout'])
    router.post('demo/reset', [DemoController, 'reset'])
    router.get('listings', [ListingsController, 'index'])
    router.get('listings/:id', [ListingsController, 'show'])
    router.get('listings/:id/taken', [ListingsController, 'taken'])
    router.get('busy', [ListingsController, 'busy'])

    // Comptes connectés
    router
      .group(() => {
        router.patch('me', [ProfilesController, 'update'])
        router.get('me/bookings', [BookingsController, 'mine'])
        router.post('bookings', [BookingsController, 'store'])
        router.patch('bookings/:id', [BookingsController, 'update'])
        router.get('owner/listings', [ListingsController, 'mine'])
        router.get('owner/bookings', [BookingsController, 'owner'])
        router.post('listings', [ListingsController, 'store'])
        router.patch('listings/:id', [ListingsController, 'update'])
        router.post('uploads', [UploadsController, 'store'])
        router.get('admin/listings', [ListingsController, 'all'])
        router.get('admin/bookings', [BookingsController, 'all'])
        router.get('admin/users', [ProfilesController, 'index'])
        router.patch('admin/users/:id', [ProfilesController, 'setRole'])
      })
      .use(middleware.auth())
  })
  .prefix('/api')
