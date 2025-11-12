# Guía de permisos por módulo

Esta guía resume lo que puede ver o hacer un usuario dependiendo de los permisos asignados en cada módulo. La lógica descrita aquí corresponde al comportamiento actual del frontend y los endpoints PHP incluidos en este repositorio, sin depender de servicios externos como Firebase o AWS.

## Administración de usuarios (`users.*` y `roles.*`)

- **Sin permisos activos:** el usuario no puede acceder a la página de administración de usuarios.
- **`users.read`:** permite ver la lista completa de usuarios con su información; el botón de "crear nuevo usuario" sigue visible.
- **`users.create`:** autoriza registrar nuevos usuarios; no oculta el botón de creación.
- **`users.update`:** habilita la edición de datos de un usuario; el botón de editar permanece visible.
- **`users.disable_enable`:** permite activar o desactivar cuentas; el botón correspondiente permanece visible.
- **`users.delete`:** autoriza eliminar usuarios; el botón de eliminar sigue disponible.
- **`roles.assign`:** habilita asignar áreas a los usuarios desde la página (el botón de accesos no se oculta). Nota: la reasignación de roles también es posible desde `users.update`, por lo que conviene ajustar la descripción mostrada en la interfaz.
- **`roles.permissions.configure`:** permite editar y configurar los permisos de cada rol; la sección de configuración permanece visible.

## Inventario (`inventory.*`)

- **Sin permisos activos:** el usuario no puede acceder a la página de inventario.
- **`inventory.products.read`:** permite ver la lista completa de productos; el catálogo general sigue visible.
- **`inventory.products.create`:** autoriza agregar productos; el botón para guardar nuevos productos permanece visible.
- **`inventory.products.update`:** habilita editar productos existentes; el botón para modificar productos se mantiene.
- **`inventory.categories.read`:** permite ver el resumen de categorías; la sección se mantiene visible.
- **`inventory.categories.create`:** autoriza crear categorías nuevas; el botón para guardarlas no se oculta.
- **`inventory.categories.update`:** habilita modificar categorías existentes; el botón de edición permanece.
- **`inventory.categories.delete`:** permite eliminar categorías sin productos activos; el botón de eliminar no se oculta.
- **`inventory.subcategories.read`:** permite ver el resumen de subcategorías; la sección permanece visible.
- **`inventory.subcategories.create`:** autoriza crear subcategorías para categorías existentes; el botón de guardado no se oculta.
- **`inventory.subcategories.update`:** habilita modificar subcategorías; el botón de edición sigue disponible.
- **`inventory.subcategories.delete`:** permite eliminar subcategorías; el botón de eliminar permanece.
- **`inventory.movements.quick_io`:** permite registrar ingresos y egresos rápidos mediante escáner QR; mantiene visible el botón de escanear y las opciones de ingreso/egreso flash del menú principal. Por sí solo no otorga acceso a la página de inventario.
- **`inventory.alerts.receive`:** habilita recibir alertas de stock bajo o crítico; las notificaciones en la bandeja permanecen visibles. Por sí solo no otorga acceso a la página de inventario.

## Áreas y zonas (`warehouse.*`)

- **Sin permisos activos:** el usuario no puede acceder a la página de áreas y zonas.
- **`warehouse.areas.read`:** permite visualizar la información de todas las áreas; la sección de áreas registradas no se oculta.
- **`warehouse.areas.create`:** autoriza registrar nuevas áreas; el formulario para crearlas permanece disponible.
- **`warehouse.areas.update`:** habilita editar áreas; el botón de edición no se oculta.
- **`warehouse.areas.delete`:** permite eliminar áreas; el botón de eliminación permanece.
- **`warehouse.zones.read`:** permite ver zonas y zonas sin asignar; ambas secciones siguen visibles.
- **`warehouse.zones.create`:** autoriza crear nuevas zonas; el formulario para crearlas permanece.
- **`warehouse.zones.update`:** habilita modificar zonas; el botón de edición en zonas y zonas sin área se mantiene.
- **`warehouse.zones.delete`:** permite eliminar zonas; el botón de eliminación no se oculta.
- **`warehouse.alerts.receive`:** habilita recibir alertas de capacidad crítica; las notificaciones correspondientes permanecen visibles. Por sí solo no otorga acceso a la página.
- **`warehouse.incidents.record`:** autoriza registrar incidentes en áreas y zonas; la sección de incidencias se mantiene disponible.
- **`warehouse.incidents.alerts`:** permite recibir alertas sobre incidentes; las notificaciones y el listado de incidencias no se ocultan.

## Reportes (`reports.*`)

- **Sin permisos activos:** el usuario no puede acceder a la página de reportes.
- **`reports.generate`:** permite visualizar los archivos almacenados; la sección correspondiente sigue visible.
- **`reports.export.pdf`:** autoriza exportar reportes en PDF; los botones de exportación en todas las páginas permanecen visibles. Por sí solo no otorga acceso a la página de reportes.
- **`reports.export.xlsx`:** autoriza exportar reportes en XLSX; los botones para generar Excel/XLSX permanecen visibles. Por sí solo no otorga acceso a la página de reportes.
- **`reports.schedule`:** permite programar reportes automáticos; la sección de reportes automáticos se mantiene visible.
- **`reports.notify`:** habilita recibir alertas de reportes generados automáticamente; las notificaciones correspondientes no se ocultan.

## Registro de actividades (LOG) (`log.*`)

- **Sin permisos activos:** el usuario no puede acceder a la página de registro de actividades.
- **`log.read`:** permite ver el historial de actividades recientes y el historial de solicitudes; ambas secciones permanecen visibles.
- **`log.export`:** autoriza exportar registros de actividades e historial de solicitudes en PDF o Excel; los botones correspondientes permanecen.
- **`log.analytics.view`:** habilita ver gráficas y estadísticas; la sección de tendencias y usuarios destacados sigue visible.
- **`log.flag_records`:** permite marcar registros para revisión; las secciones de solicitudes en revisión o pendientes no se ocultan.

## Panel principal y notificaciones (`dashboard.*`, `notifications.*`)

- **Sin permisos activos:** el usuario sigue teniendo acceso a la página principal, pero sin los elementos descritos a continuación.
- **`dashboard.view.metrics`:** permite ver las métricas generales del panel principal; la sección del dashboard permanece visible.
- **`notifications.receive.critical`:** habilita recibir notificaciones importantes o críticas; la bandeja de notificaciones continúa mostrando esos avisos.

## Cuenta y personalización (`account.*`)

- **Sin permisos activos:** el usuario no puede acceder a la página de la cuenta.
- **`account.profile.read`:** permite ver la información del perfil y de la empresa; dichos datos permanecen visibles.
- **`account.profile.update`:** autoriza modificar datos personales y de la empresa; los botones para editar información personal y actualizar datos empresariales siguen activos.
- **`account.theme.configure`:** habilita cambiar colores y logotipo de la empresa; el botón de personalización en el menú lateral y la opción para subir el logo permanecen disponibles.
