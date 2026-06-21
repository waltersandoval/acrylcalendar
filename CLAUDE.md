# Reglas de seguridad de este proyecto

Este archivo lo lee automáticamente Claude Code en cada sesión futura en este
repo. Sirve para que cualquier código nuevo se escriba ya siguiendo estas
reglas, en vez de tener que corregirlas después en una auditoría.

## Principio rector

- **Nunca confiar en el cliente.** Todo lo que importa para la seguridad
  (permisos, monto de un pago, identidad del usuario) se valida en el
  servidor (Cloud Function o reglas de Firestore), nunca solo en React.
- **Defensa en profundidad.** Las reglas de Firestore y las Cloud Functions
  deben proteger lo mismo, cada una por su cuenta:
  - Las Cloud Functions usan el Admin SDK, que **ignora** las reglas de
    Firestore. Si una colección también se puede escribir directo desde el
    cliente, las reglas son la única protección real para esa vía.
  - Las reglas de Firestore no ven la lógica de las Cloud Functions. Si una
    acción sensible (transferir un calendario, borrar una cuenta, verificar
    un pago) solo está protegida "porque pasa por una función", confirmar
    que la colección de Firestore involucrada **no** se pueda escribir
    también directo desde el cliente sin esas mismas validaciones.

## El bug que más se repitió en este proyecto: "ownerUid sí, pero ¿y la relación?"

Patrón a vigilar siempre que una regla de `create`/`update` revise
`request.resource.data.ownerUid == request.auth.uid`: eso solo prueba que el
documento es "propio". Si el documento también tiene un campo que apunta a
*otro* documento (`calendarId`, `groupId`, etc.), hay que validar **además**
que ese otro documento le pertenece a quien escribe. Si no, cualquiera puede
crear un documento "propio" que apunte al recurso de otra persona (visto en
`events`, y de forma crítica en `payment_configs`, donde permitía redirigir
pagos de PayPal de otro negocio).

## Checklist obligatorio antes de decir "esto ya está listo para producción"

1. **Secretos/claves**: nada hardcodeado en el código (grep por `AIza`,
   `sk_live`, `client_secret`, `BEGIN PRIVATE KEY`). Secretos reales en
   Firebase Secret Manager / variables de entorno del hosting, nunca en git.
2. **Firestore rules**: cada `match` revisado contra el patrón de arriba.
   Probar mentalmente "¿qué pasa si un atacante autenticado cualquiera
   intenta leer/crear/editar esto apuntando a un recurso ajeno?".
3. **Cloud Functions**: cada función que modifica datos verifica el rol del
   caller contra el dato real en Firestore (no contra lo que el cliente
   dice tener). Validar longitud/formato de inputs en cualquier función
   pública (sin auth).
4. **Pagos**: el monto y el estado del pago se verifican siempre
   server-to-server contra la API del proveedor (PayPal, Stripe, etc.)
   antes de confirmar nada — nunca confiar en el monto que manda el
   navegador. Si hay configuraciones de pago por calendario/tenant, validar
   que la config usada realmente le pertenece a quien recibe el pago.
5. **Datos públicos**: ninguna colección/regla expone con `if true` o
   reglas demasiado anchas datos personales de terceros (nombre, email,
   teléfono). Si la página pública necesita disponibilidad/estado, exponerlo
   por una Cloud Function que filtre los campos, no por lectura directa.
6. **Borrado de cuentas**: si existe "eliminar cuenta", que borre en cascada
   todo lo que pertenece a ese uid (incluyendo subcolecciones privadas con
   secretos) — si no, quedan datos huérfanos para siempre.
7. **Dependencias**: `npm audit` (raíz y `functions/`) sin vulnerabilidades
   altas/críticas sin revisar.
8. **Cabeceras/hosting**: CSP, HSTS, X-Frame-Options configurados; CSP
   actualizado cada vez que se agrega un script/iframe de un tercero
   (PayPal, reCAPTCHA, etc.).
9. **PWA/Service worker**: el service worker no abre URLs ni ejecuta nada
   con datos controlados por el atacante (revisar `notificationclick` y
   payloads de push).
10. **App Check**: las Cloud Functions públicas y Firestore protegidos con
    Firebase App Check, con el enforcement activado en servidor (no solo el
    token emitido en el cliente) una vez confirmado el rollout en métricas.

## Cuándo pedir una auditoría completa

- Antes de cualquier despliegue a producción.
- Después de agregar una Cloud Function nueva o una colección nueva en
  Firestore.
- Después de agregar o cambiar cualquier integración de pagos.

## Cómo reusar esto en otros proyectos "vibecodeados"

- Copiar este archivo a la raíz de cualquier proyecto nuevo, o pegar su
  contenido en `~/.claude/CLAUDE.md` en tu computadora para que se aplique
  automáticamente en todas las sesiones de Claude Code, en cualquier repo.
- Al arrancar un proyecto nuevo con IA, pedir explícitamente desde el
  principio: *"seguí las reglas de seguridad de CLAUDE.md mientras
  programás, no solo al final"* — y antes de salir a producción, pedir la
  auditoría completa siguiendo el checklist de arriba.
