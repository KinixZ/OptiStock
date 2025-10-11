<?php
/**
 * Configuración base para el envío de correos usando mail().
 *
 * Los valores pueden sobrescribirse mediante variables de entorno
 * antes de ejecutar PHP:
 *  - MAIL_FROM_EMAIL
 *  - MAIL_FROM_NAME
 *  - MAIL_REPLYTO_EMAIL
 *  - MAIL_REPLYTO_NAME
 *  - MAIL_ENVELOPE_FROM
 *  - MAIL_DEFAULT_CHARSET
 */

define('MAIL_FROM_EMAIL', getenv('MAIL_FROM_EMAIL') ?: 'no-reply@optistock.site');
define('MAIL_FROM_NAME', getenv('MAIL_FROM_NAME') ?: 'OptiStock');
define('MAIL_REPLYTO_EMAIL', getenv('MAIL_REPLYTO_EMAIL') ?: 'soporte@optistock.site');
define('MAIL_REPLYTO_NAME', getenv('MAIL_REPLYTO_NAME') ?: 'Equipo OptiStock');
define('MAIL_ENVELOPE_FROM', getenv('MAIL_ENVELOPE_FROM') ?: MAIL_FROM_EMAIL);
define('MAIL_DEFAULT_CHARSET', getenv('MAIL_DEFAULT_CHARSET') ?: 'UTF-8');

define('MAIL_TRANSPORT', strtolower(getenv('MAIL_TRANSPORT') ?: 'auto'));
define('MAIL_SMTP_HOST', getenv('MAIL_SMTP_HOST') ?: '');
define('MAIL_SMTP_PORT', (int) (getenv('MAIL_SMTP_PORT') ?: 587));
define('MAIL_SMTP_USERNAME', getenv('MAIL_SMTP_USERNAME') ?: '');
define('MAIL_SMTP_PASSWORD', getenv('MAIL_SMTP_PASSWORD') ?: '');
define('MAIL_SMTP_ENCRYPTION', strtolower(getenv('MAIL_SMTP_ENCRYPTION') ?: 'tls'));
define('MAIL_SMTP_TIMEOUT', (int) (getenv('MAIL_SMTP_TIMEOUT') ?: 30));
define('MAIL_SMTP_HELO', getenv('MAIL_SMTP_HELO') ?: '');
