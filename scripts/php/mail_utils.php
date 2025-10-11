<?php
require_once __DIR__ . '/mail_config.php';

if (!function_exists('enviarCorreo')) {
    /**
     * Envía un correo utilizando la función mail() nativa.
     */
    function enviarCorreo($destinatario, $asunto, $mensaje, array $opciones = [])
    {
        if (!filter_var($destinatario, FILTER_VALIDATE_EMAIL)) {
            registrarEnvioCorreo(false, $destinatario, $asunto, 'Correo destinatario inválido.');
            return false;
        }

        $fromEmail = isset($opciones['from_email']) && $opciones['from_email']
            ? $opciones['from_email']
            : MAIL_FROM_EMAIL;
        $fromName = array_key_exists('from_name', $opciones)
            ? (string) $opciones['from_name']
            : MAIL_FROM_NAME;
        $replyToEmail = isset($opciones['reply_to']) && $opciones['reply_to']
            ? $opciones['reply_to']
            : MAIL_REPLYTO_EMAIL;
        $replyToName = array_key_exists('reply_to_name', $opciones)
            ? (string) $opciones['reply_to_name']
            : MAIL_REPLYTO_NAME;

        $charset = isset($opciones['charset']) && $opciones['charset']
            ? $opciones['charset']
            : MAIL_DEFAULT_CHARSET;

        $contentType = !empty($opciones['content_type'])
            ? $opciones['content_type']
            : (!empty($opciones['is_html']) ? 'text/html' : 'text/plain');

        $headers = [
            'From' => formatearDireccionCorreo($fromName, $fromEmail),
            'Reply-To' => formatearDireccionCorreo($replyToName, $replyToEmail),
            'MIME-Version' => '1.0',
            'Content-Type' => $contentType . '; charset=' . $charset,
            'Content-Transfer-Encoding' => '8bit',
            'X-Mailer' => 'PHP/' . phpversion(),
        ];

        if (!empty($opciones['cc'])) {
            $headers['Cc'] = construirListaCorreos($opciones['cc']);
        }

        if (!empty($opciones['bcc'])) {
            $headers['Bcc'] = construirListaCorreos($opciones['bcc']);
        }

        if (!empty($opciones['headers']) && is_array($opciones['headers'])) {
            foreach ($opciones['headers'] as $clave => $valor) {
                if ($clave !== '') {
                    $headers[$clave] = $valor;
                }
            }
        }

        $headerString = '';
        foreach ($headers as $clave => $valor) {
            if ($valor !== null && $valor !== '') {
                $headerString .= $clave . ': ' . $valor . "\r\n";
            }
        }

        if ($fromEmail) {
            ini_set('sendmail_from', $fromEmail);
        }

        $envelopeFrom = isset($opciones['envelope_from']) && $opciones['envelope_from']
            ? $opciones['envelope_from']
            : MAIL_ENVELOPE_FROM;

        $parametrosAdicionales = '';
        if ($envelopeFrom) {
            $parametrosAdicionales = '-f' . escapeshellarg($envelopeFrom);
        }

        $resultado = @mail($destinatario, $asunto, $mensaje, $headerString, $parametrosAdicionales);

        if (!$resultado) {
            $detalleError = obtenerDetalleErrorCorreo();
            registrarEnvioCorreo(false, $destinatario, $asunto, $detalleError);
            return false;
        }

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

    function construirListaCorreos($lista)
    {
        if (is_string($lista)) {
            $lista = array_map('trim', explode(',', $lista));
        }

        if (!is_array($lista)) {
            return '';
        }

        $direcciones = [];
        foreach ($lista as $entrada) {
            if (is_array($entrada)) {
                $correo = $entrada['email'] ?? '';
                $nombre = $entrada['name'] ?? '';
                if (filter_var($correo, FILTER_VALIDATE_EMAIL)) {
                    $direcciones[] = formatearDireccionCorreo($nombre, $correo);
                }
            } else {
                $correo = trim((string) $entrada);
                if (filter_var($correo, FILTER_VALIDATE_EMAIL)) {
                    $direcciones[] = $correo;
                }
            }
        }

        return implode(', ', $direcciones);
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
