# Configuración de correo en Hostinger (plan básico)

Para que los correos de verificación y recuperación de contraseña funcionen en Hostinger es necesario usar el servidor SMTP del plan de hosting. El envío directo con `mail()` falla cuando no hay `sendmail` disponible o el remitente no coincide con una cuenta de correo válida.

## 1. Crear la cuenta de correo

1. Ingresa al panel de Hostinger y crea una cuenta de correo bajo tu dominio (por ejemplo `no-reply@optistock.site`).
2. Asigna una contraseña segura y guárdala. La necesitarás para el archivo de configuración.

## 2. Configurar las credenciales en el proyecto

1. Copia el archivo de ejemplo:

   ```bash
   cp config/mail_settings.example.php config/mail_settings.php
   ```

2. Edita `config/mail_settings.php` y reemplaza los valores de:
   - `username`: tu correo recién creado.
   - `password`: la contraseña del buzón.
   - Si usas otro remitente o dirección de respuesta, actualiza `default_from_email` y `default_reply_to_email`.

3. Asegúrate de **no** subir `config/mail_settings.php` al repositorio. El `.gitignore` ya lo excluye.

## 3. Opcional: configurar variables de entorno

Si prefieres no guardar credenciales en el archivo, puedes definir variables de entorno en Hostinger (Sección *Advanced → Environment Variables*):

- `MAIL_TRANSPORT=smtp`
- `MAIL_SMTP_HOST=smtp.hostinger.com`
- `MAIL_SMTP_PORT=587`
- `MAIL_SMTP_USERNAME=tu-correo@optistock.site`
- `MAIL_SMTP_PASSWORD=tu-contraseña`
- `MAIL_SMTP_ENCRYPTION=tls`
- `MAIL_FROM_EMAIL=no-reply@optistock.site`
- `MAIL_FROM_NAME=OptiStock`
- `MAIL_REPLY_TO_EMAIL=soporte@optistock.site`

## 4. Probar el envío

En el servidor ejecuta:

```bash
php scripts/php/test_mail.php tu-correo@optistock.site
```

Si todo está correcto verás el mensaje `ENVIADO: mail() aceptó el envío.` o `SMTP aceptó el envío.` y recibirás el correo de prueba.

## 5. Revisar los logs

Los intentos de envío quedan registrados en `logs/mail.log`. Si ocurre un error, revisa ese archivo y el *Error Log* de Hostinger para obtener más detalles.
