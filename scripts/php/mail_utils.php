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

        $resultado = @mail($destinatario, $asunto, $mensaje, $headerString, $parametrosAdicionales);

        if (!$resultado) {
            $detalleError = obtenerDetalleErrorCorreo();
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

    function obtenerDetalleErrorCorreo()
    {
        $ultimoError = error_get_last();
        if ($ultimoError && isset($ultimoError['message'])) {
            return $ultimoError['message'];
        }

        return 'mail() devolvió false sin mensaje adicional.';
    }
}
