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
