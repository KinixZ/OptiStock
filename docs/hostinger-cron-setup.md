# Programar el scheduler en Hostinger

Sigue estos pasos para activar el cron que dispara `scripts/php/scheduler.php` desde Hostinger (plan básico):

1. **Ubica la ruta absoluta del script**
   - En Hostinger la estructura habitual es `/home/USUARIO/`.
   - Si tu proyecto está en `public_html`, la ruta típica es:
     ```
     /home/USUARIO/domains/TU_DOMINIO/public_html/scripts/php/scheduler.php
     ```
   - Sustituye `USUARIO` por tu nombre de usuario de Hostinger y ajusta la ruta real si el archivo vive en otra carpeta.

2. **Prepara el comando PHP**
   - Hostinger expone PHP CLI en `/usr/bin/php`.
   - El comando final se ve así (modifica la ruta por la tuya):
     ```
     /usr/bin/php /home/USUARIO/domains/TU_DOMINIO/public_html/scripts/php/scheduler.php
     ```

3. **Configura el cron job en el panel**
   - En el panel de control ve a **Hosting → Avanzado → Cron Jobs**.
   - Elige **PHP** o **Personalizado**. Si usas la vista de la captura adjunta selecciona **Personalizado** y llena:
     - **Comando a ejecutar:** pega el comando preparado arriba.
     - **Common options (s):** elige una frecuencia predeterminada (por ejemplo “Every 5 minutes”). Si prefieres control manual, deja el desplegable vacío y rellena los campos de minuto/hora/día/mes/weekday.
   - Ejemplo para correr cada 15 minutos: deja "Common options" vacío y escribe `*/15` en **minuto**, `*` en las demás columnas.

4. **Guarda y verifica**
   - Pulsa **Guardar**. Hostinger agregará la entrada a `crontab`.
   - Revisa el cron log del panel o crea un reporte manual para confirmar que el script corre (puedes agregar un `error_log` temporal dentro de `scheduler.php` para verificar).

5. **Recomendaciones adicionales**
   - Usa una frecuencia acorde a tus automatizaciones (por ejemplo cada 5 minutos si los reportes pueden dispararse en cualquier minuto).
   - Asegúrate de que `scheduler.php` tenga permisos de lectura/ejecución para el usuario del hosting (`644` suele bastar porque el cron invoca PHP con lectura).
   - Si migras el proyecto a otra carpeta, recuerda actualizar la ruta del cron.

Con esto el cron job ejecutará el scheduler automáticamente según la frecuencia que definas.
