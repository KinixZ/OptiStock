# Problemas comunes al administrar usuarios

Las acciones de **activar/desactivar usuarios**, **asignar o revocar áreas** y **eliminar usuarios** dependen de la API en `scripts/php`. Todos esos endpoints comparten un requisito: deben poder registrar una solicitud con el identificador del usuario que ejecuta la acción.

## Requisito de sesión iniciada

Los controladores `actualizar_estado_usuario.php`, `guardar_acceso_usuario.php`, `eliminar_acceso_usuario.php` y `eliminar_usuario_empresa.php` delegan el registro de la solicitud en la función `opti_registrar_solicitud()` definida en [`scripts/php/solicitudes_utils.php`](../scripts/php/solicitudes_utils.php). Esta función sólo acepta la operación si recibe un `id_solicitante` distinto de cero. Cuando la sesión no contiene `$_SESSION['usuario_id']` el valor enviado es `0`, por lo que `opti_registrar_solicitud()` responde con `success: false` y el mensaje *"Datos incompletos para registrar la solicitud."*【F:scripts/php/solicitudes_utils.php†L120-L144】

> ⚠️ **Importante:** Guardar el identificador del usuario en `localStorage` o en cualquier otro almacenamiento del navegador no satisface este requisito. El backend nunca lee ese valor: únicamente confía en lo que haya en `$_SESSION['usuario_id']`, ya que ahí se garantiza que proviene de un inicio de sesión válido.

En consecuencia, si la página se abre directamente como un archivo estático (por ejemplo, `file://...`) o a través de un servidor que no comparte las cookies de sesión de PHP, el backend nunca recibe el identificador del administrador y bloquea las operaciones. Desde el frontend esto se ve como alertas de error al intentar activar/desactivar usuarios, modificar accesos o eliminarlos.

## Cómo resolverlo

1. **Inicia sesión mediante el flujo de autenticación de OptiStock** (`scripts/php/login.php`). Esto poblará `$_SESSION['usuario_id']` y las peticiones `fetch` compartirán la cookie de sesión.
2. **Sirve la aplicación desde PHP** (por ejemplo, usando Apache o el servidor embebido de PHP) para que las cookies de sesión se envíen junto con las peticiones a `/scripts/php/...`.
3. Si estás haciendo pruebas locales sin backend y necesitas usar los valores guardados en el navegador, añade un endpoint auxiliar (por ejemplo `scripts/php/iniciar_sesion_manual.php`) que reciba el `usuario_id` almacenado y lo asigne a `$_SESSION['usuario_id']`. Después de llamarlo, las demás peticiones funcionarán porque la sesión PHP ya tendrá un identificador válido.
4. Como alternativa, puedes modificar los endpoints mencionados para que acepten explícitamente el identificador en el cuerpo de la petición y actualicen el registro de solicitudes con ese dato. Ten en cuenta que esto implica revisar los controles de seguridad porque la API dejaría de basarse en la sesión PHP.

Mientras no exista una sesión válida, el backend seguirá bloqueando estas acciones por seguridad, ya que no tiene forma de registrar quién las solicitó.
