<?php
if (!array_key_exists('_MAIL_UTILS_LAST_ERROR', $GLOBALS)) {
    $GLOBALS['_MAIL_UTILS_LAST_ERROR'] = null;
}

if (!function_exists('enviarCorreo')) {
    function establecerUltimoErrorCorreo($mensaje)
    {
        $GLOBALS['_MAIL_UTILS_LAST_ERROR'] = $mensaje !== '' ? $mensaje : null;
    }

    function obtenerUltimoErrorCorreo()
    {
        return isset($GLOBALS['_MAIL_UTILS_LAST_ERROR']) ? $GLOBALS['_MAIL_UTILS_LAST_ERROR'] : null;
    }

    function enviarCorreo($destinatario, $asunto, $mensaje, array $opciones = [])
    {
        establecerUltimoErrorCorreo(null);

        if (!filter_var($destinatario, FILTER_VALIDATE_EMAIL)) {
            $detalleError = 'Correo destinatario inválido.';
            establecerUltimoErrorCorreo($detalleError);
            registrarEnvioCorreo(false, $destinatario, $asunto, $detalleError);
            return false;
        }

        $fromEmail = isset($opciones['from_email']) && $opciones['from_email']
            ? $opciones['from_email']
            : 'no-reply@optistock.site';
        $fromName = isset($opciones['from_name']) && $opciones['from_name']
            ? $opciones['from_name']
            : 'OptiStock';
        $replyToEmail = isset($opciones['reply_to']) && $opciones['reply_to']
            ? $opciones['reply_to']
            : $fromEmail;
        $replyToName = isset($opciones['reply_to_name']) && $opciones['reply_to_name']
            ? $opciones['reply_to_name']
            : $fromName;

        $headers = [
            'From' => formatearDireccionCorreo($fromName, $fromEmail),
            'Reply-To' => formatearDireccionCorreo($replyToName, $replyToEmail),
            'MIME-Version' => '1.0',
            'Content-Type' => 'text/plain; charset=UTF-8',
            'Content-Transfer-Encoding' => '8bit',
            'X-Mailer' => 'PHP/' . phpversion(),
        ];

        if (isset($opciones['headers']) && is_array($opciones['headers'])) {
            foreach ($opciones['headers'] as $clave => $valor) {
                $headers[$clave] = $valor;
            }
        }

        $headerString = '';
        foreach ($headers as $clave => $valor) {
            $headerString .= $clave . ': ' . $valor . "\r\n";
        }

        if ($fromEmail) {
            ini_set('sendmail_from', $fromEmail);
        }

        $envelopeFrom = isset($opciones['envelope_from']) && $opciones['envelope_from']
            ? $opciones['envelope_from']
            : $fromEmail;
        $parametrosAdicionales = '';
        if ($envelopeFrom) {
            $parametrosAdicionales = '-f' . escapeshellarg($envelopeFrom);
        }

        $errorPhpMail = null;
        $manejadorErrores = function ($errno, $errstr, $errfile, $errline) use (&$errorPhpMail) {
            $errorPhpMail = sprintf('%s (código %d en %s:%d)', $errstr, $errno, $errfile, $errline);
            return true;
        };

        if (function_exists('error_clear_last')) {
            error_clear_last();
        }

        set_error_handler($manejadorErrores);
        $resultado = mail($destinatario, $asunto, $mensaje, $headerString, $parametrosAdicionales);
        restore_error_handler();

        if (!$resultado) {
            $detalleError = obtenerDetalleErrorCorreo($errorPhpMail);
            establecerUltimoErrorCorreo($detalleError);
            registrarEnvioCorreo(false, $destinatario, $asunto, $detalleError);
            return false;
        }

        establecerUltimoErrorCorreo(null);
        registrarEnvioCorreo(true, $destinatario, $asunto, 'mail() aceptó el envío.');
        return true;
    }

    function formatearDireccionCorreo($nombre, $correo)
    {
        $correo = trim((string) $correo);
        $nombre = trim((string) $nombre);

        if ($correo === '') {
            return $nombre;
        }

        if ($nombre === '') {
            return $correo;
        }

        return sprintf('%s <%s>', $nombre, $correo);
    }

    function registrarEnvioCorreo($exito, $destinatario, $asunto, $detalle = '')
    {
        $logDir = dirname(__DIR__, 2) . '/logs';
        if (!is_dir($logDir)) {
            @mkdir($logDir, 0775, true);
        }

        $logFile = $logDir . '/mail.log';
        $estado = $exito ? 'OK' : 'ERROR';
        $linea = sprintf(
            '[%s] [%s] Destinatario: %s | Asunto: %s',
            date('Y-m-d H:i:s'),
            $estado,
            $destinatario,
            $asunto
        );

        if ($detalle) {
            $linea .= ' | Detalle: ' . $detalle;
        }

        $linea .= PHP_EOL;

        @file_put_contents($logFile, $linea, FILE_APPEND);

        if (!$exito) {
            error_log('enviarCorreo: ' . $linea);
        }
    }

    function obtenerDetalleErrorCorreo($mensajeCapturado = null)
    {
        if ($mensajeCapturado) {
            return $mensajeCapturado;
        }

        $ultimoError = error_get_last();
        if ($ultimoError && isset($ultimoError['message'])) {
            return $ultimoError['message'];
        }

        $detalles = [];

        $funcionesDeshabilitadas = ini_get('disable_functions');
        if ($funcionesDeshabilitadas && stripos($funcionesDeshabilitadas, 'mail') !== false) {
            return 'mail() está deshabilitada en php.ini (disable_functions). En Hostinger ve a hPanel → Sitio web → Administrar → Avanzado → Configuración PHP, entra en la pestaña "Opciones", borra "mail" de la lista de funciones deshabilitadas y guarda los cambios; después usa "Reiniciar PHP". Si tu plan no permite editarlo, deberás contactar al soporte de Hostinger para que lo habiliten o actualizar a un plan que incluya mail().';
        }

        $sendmailPath = ini_get('sendmail_path');
        if ($sendmailPath) {
            $detalles[] = 'sendmail_path=' . $sendmailPath;

            $sendmailEjecutable = trim(strtok($sendmailPath, ' '));
            if ($sendmailEjecutable && !file_exists($sendmailEjecutable)) {
                return sprintf('El ejecutable de sendmail no existe: %s', $sendmailEjecutable);
            }

            if ($sendmailEjecutable && !is_executable($sendmailEjecutable)) {
                return sprintf('El ejecutable de sendmail no tiene permisos de ejecución: %s', $sendmailEjecutable);
            }
        }

        $smtpHost = ini_get('SMTP');
        if ($smtpHost) {
            $detalles[] = 'SMTP=' . $smtpHost;
        }

        $smtpPort = ini_get('smtp_port');
        if ($smtpPort) {
            $detalles[] = 'smtp_port=' . $smtpPort;
        }

        if ($smtpHost) {
            $puerto = $smtpPort ? (int) $smtpPort : 25;
            $errno = 0;
            $errstr = '';
            $conexion = @fsockopen($smtpHost, $puerto, $errno, $errstr, 2.0);
            if (!$conexion) {
                return sprintf('No se pudo conectar al servidor SMTP %s:%d (%s %d).', $smtpHost, $puerto, $errstr ?: 'sin mensaje', $errno);
            }
            fclose($conexion);
        }

        if ($detalles) {
            return 'mail() devolvió false. Configuración relevante: ' . implode('; ', $detalles);
        }

        return 'mail() devolvió false sin mensaje adicional.';
    }
}
