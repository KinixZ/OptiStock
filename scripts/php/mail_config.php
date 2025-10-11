<?php
/**
 * Configuración base para el envío de correos mediante SMTP.
 *
 * Los valores pueden sobrescribirse mediante variables de entorno
 * antes de ejecutar PHP:
 *  - MAIL_FROM_EMAIL
 *  - MAIL_FROM_NAME
 *  - MAIL_REPLYTO_EMAIL
 *  - MAIL_REPLYTO_NAME
 *  - MAIL_ENVELOPE_FROM
 *  - MAIL_DEFAULT_CHARSET
 *  - SMTP_HOST
 *  - SMTP_PORT
 *  - SMTP_USERNAME
 *  - SMTP_PASSWORD
 *  - SMTP_ENCRYPTION
 *  - SMTP_TIMEOUT
 */

define('MAIL_FROM_EMAIL', getenv('MAIL_FROM_EMAIL') ?: 'no-reply@optistock.site');
define('MAIL_FROM_NAME', getenv('MAIL_FROM_NAME') ?: 'OptiStock');
define('MAIL_REPLYTO_EMAIL', getenv('MAIL_REPLYTO_EMAIL') ?: 'soporte@optistock.site');
define('MAIL_REPLYTO_NAME', getenv('MAIL_REPLYTO_NAME') ?: 'Equipo OptiStock');
define('MAIL_ENVELOPE_FROM', getenv('MAIL_ENVELOPE_FROM') ?: MAIL_FROM_EMAIL);
define('MAIL_DEFAULT_CHARSET', getenv('MAIL_DEFAULT_CHARSET') ?: 'UTF-8');

define('SMTP_HOST', getenv('SMTP_HOST') ?: 'smtp.hostinger.com');
define('SMTP_PORT', (int) (getenv('SMTP_PORT') ?: 465));
define('SMTP_USERNAME', getenv('SMTP_USERNAME') ?: 'no-reply@optistock.site');
define('SMTP_PASSWORD', getenv('SMTP_PASSWORD') ?: 'Optistock1.');
define('SMTP_ENCRYPTION', strtolower(getenv('SMTP_ENCRYPTION') ?: 'ssl'));
define('SMTP_TIMEOUT', (int) (getenv('SMTP_TIMEOUT') ?: 30));
