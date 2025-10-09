<?php
return [
    // Transport options: 'smtp' or 'mail'.
    'transport' => 'smtp',

    // SMTP settings for Hostinger basic hosting.
    'smtp' => [
        'host' => 'smtp.hostinger.com',
        'port' => 587,
        'encryption' => 'tls', // or 'ssl' if you configured it that way
        'username' => 'tu-correo@optistock.site',
        'password' => 'TU_CONTRASENA_DE_CORREO',
        'auth' => true,
        'timeout' => 15,
    ],

    // Default sender details used when not provided via enviarCorreo() options.
    'default_from_email' => 'no-reply@optistock.site',
    'default_from_name' => 'OptiStock',
    'default_reply_to_email' => 'soporte@optistock.site',
    'default_reply_to_name' => 'Soporte OptiStock',
];
