# OptiStock

OptiStock es una aplicación para la gestión y administración de almacenes. Este proyecto
contiene un frontend estático en HTML/CSS y un backend basado en Node.js y PHP.

## Instalación de dependencias

1. Asegúrese de tener [Node.js](https://nodejs.org/) instalado.
2. Instale las dependencias definidas en `package.json`:
   ```bash
   npm install
   ```
3. Si los módulos `express` y `mysql` no se instalan con el paso anterior, puede
   instalarlos manualmente:
   ```bash
   npm install express mysql
   ```

## Configuración de variables de entorno

Cree un archivo `.env` en la raíz del proyecto con los siguientes valores:

```bash
CLIENT_ID=TU_CLIENT_ID_DE_GOOGLE
DB_HOST=localhost
DB_USER=usuario
DB_PASSWORD=contrasena
DB_NAME=base_de_datos
PORT=3000
```

Ajuste cada valor según la configuración de su entorno (por ejemplo, los datos
para la conexión de MySQL o el puerto en el que se ejecutará la aplicación).

### Envío de correos

El proyecto incluye utilidades PHP para enviar correos electrónicos. Por
defecto se utiliza la función nativa `mail()`, pero ahora es posible configurar
un servidor SMTP sin depender de servicios externos avanzados.

Opcionalmente agregue a su `.env` las siguientes variables:

```bash
MAIL_TRANSPORT=auto          # Valores: auto, mail, smtp
MAIL_SMTP_HOST=mail.midominio.com
MAIL_SMTP_PORT=587
MAIL_SMTP_USERNAME=usuario
MAIL_SMTP_PASSWORD=clave
MAIL_SMTP_ENCRYPTION=tls     # Valores: tls, ssl o vacío para sin cifrado
MAIL_SMTP_HELO=optistock.site
MAIL_FROM_EMAIL=no-reply@midominio.com
MAIL_REPLYTO_EMAIL=soporte@midominio.com
```

Si `MAIL_TRANSPORT` está en `auto`, el sistema intentará primero enviar por
SMTP cuando `MAIL_SMTP_HOST` tenga un valor y, si falla, volverá a `mail()`.
Deje `MAIL_TRANSPORT=mail` para forzar el uso exclusivo de `mail()`.

## Ejecución de la aplicación

Inicie el servidor ejecutando:

```bash
node scripts/server/server.js
```

El backend se iniciará en `http://localhost:3000` (o en el puerto definido en
`PORT`).

## Estructura del proyecto

```
OptiStock/
├── images/            # Recursos de imagen utilizados por el sitio
├── pages/             # Páginas HTML del frontend
├── scripts/           # Archivos JS y PHP para lógica de frontend y backend
├── styles/            # Hojas de estilo CSS
├── optistock.sql      # Script de base de datos
├── package.json       # Dependencias de Node.js
└── ...
```

Cada carpeta dentro de `pages/`, `scripts/` y `styles/` agrupa los recursos
correspondientes para las distintas secciones de la aplicación.
