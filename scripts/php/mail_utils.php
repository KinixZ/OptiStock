<?php
if (!function_exists('enviarCorreo')) {
    function enviarCorreo($destinatario, $asunto, $mensaje, array $opciones = [])
    {
        if (!filter_var($destinatario, FILTER_VALIDATE_EMAIL)) {
            registrarEnvioCorreo(false, $destinatario, $asunto, 'Correo destinatario inválido.');
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
            'X-Mailer' => 'PHP/' . phpversion(),
        ];

        $esHtml = !empty($opciones['is_html']);
        $mensajePlano = isset($opciones['plain_text']) && $opciones['plain_text']
            ? (string) $opciones['plain_text']
            : convertirHtmlAPlano($mensaje);

        if ($esHtml) {
            $boundary = '=_OptiMail_' . md5(uniqid((string) microtime(), true));
            $headers['Content-Type'] = 'multipart/alternative; boundary="' . $boundary . '"';

            $partes = [];
            $partes[] = '--' . $boundary . "\r\n" .
                'Content-Type: text/plain; charset=UTF-8' . "\r\n" .
                'Content-Transfer-Encoding: 8bit' . "\r\n\r\n" .
                $mensajePlano . "\r\n";
            $partes[] = '--' . $boundary . "\r\n" .
                'Content-Type: text/html; charset=UTF-8' . "\r\n" .
                'Content-Transfer-Encoding: 8bit' . "\r\n\r\n" .
                $mensaje . "\r\n";
            $partes[] = '--' . $boundary . '--';

            $mensajeAEnviar = implode('', $partes);
        } else {
            $headers['Content-Type'] = 'text/plain; charset=UTF-8';
            $headers['Content-Transfer-Encoding'] = '8bit';
            $mensajeAEnviar = $mensaje;
        }

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

        $resultado = @mail($destinatario, $asunto, $mensajeAEnviar, $headerString, $parametrosAdicionales);

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

    function convertirHtmlAPlano($html)
    {
        if ($html === null || $html === '') {
            return '';
        }

        if (!is_string($html)) {
            $html = (string) $html;
        }

        $texto = preg_replace('/\s+/u', ' ', strip_tags($html));
        $texto = html_entity_decode((string) $texto, ENT_QUOTES | ENT_HTML5, 'UTF-8');

        return trim($texto);
    }

    function generarCorreoPlantilla($titulo, $contenidoHtml, array $opciones = [])
    {
        $primaryColor = $opciones['primary_color'] ?? '#ff6f91';
        $accentColor = $opciones['accent_color'] ?? '#0fb4d4';
        $footerText = $opciones['footer_text'] ?? 'Este mensaje fue enviado automáticamente por OptiStock.';
        $codigo = $opciones['codigo'] ?? null;
        $botonTexto = $opciones['boton_texto'] ?? null;
        $botonUrl = $opciones['boton_url'] ?? null;

        $tituloSeguro = htmlspecialchars((string) $titulo, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $footerSeguro = htmlspecialchars((string) $footerText, ENT_QUOTES | ENT_HTML5, 'UTF-8');

        $codigoHtml = '';
        if ($codigo) {
            $codigoSeguro = htmlspecialchars((string) $codigo, ENT_QUOTES | ENT_HTML5, 'UTF-8');
            $codigoHtml = '<div style="margin:24px 0 0; text-align:center;">'
                . '<div style="display:inline-block; padding:12px 24px; border-radius:999px; background:' . htmlspecialchars($accentColor, ENT_QUOTES | ENT_HTML5, 'UTF-8') . '15; color:#1f2937; font-weight:600; letter-spacing:4px; font-size:20px;">'
                . $codigoSeguro
                . '</div>'
                . '</div>';
        }

        $botonHtml = '';
        if ($botonTexto && $botonUrl) {
            $botonHtml = '<div style="margin:32px 0 0; text-align:center;">'
                . '<a href="' . htmlspecialchars((string) $botonUrl, ENT_QUOTES | ENT_HTML5, 'UTF-8') . '"'
                . ' style="display:inline-block; padding:14px 28px; background-color:' . htmlspecialchars($primaryColor, ENT_QUOTES | ENT_HTML5, 'UTF-8') . '; color:#ffffff; text-decoration:none; border-radius:999px; font-weight:600;">'
                . htmlspecialchars((string) $botonTexto, ENT_QUOTES | ENT_HTML5, 'UTF-8')
                . '</a>'
                . '</div>';
        }

        $anioActual = date('Y');
        $contenidoPrincipal = $contenidoHtml;

        return '<!DOCTYPE html>' .
            '<html lang="es">' .
            '<head>' .
            '<meta charset="UTF-8">' .
            '<meta name="viewport" content="width=device-width, initial-scale=1.0">' .
            '<title>' . $tituloSeguro . '</title>' .
            '</head>' .
            '<body style="background-color:#f5f6fb; margin:0; padding:24px; font-family:\'Poppins\',Arial,sans-serif; color:#1f2937;">' .
            '<div style="max-width:600px; margin:0 auto; background-color:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 18px 40px -28px rgba(23,31,52,0.45); border:1px solid #e7e9f5;">' .
            '<div style="background:linear-gradient(135deg,' . htmlspecialchars($primaryColor, ENT_QUOTES | ENT_HTML5, 'UTF-8') . ',' . htmlspecialchars($accentColor, ENT_QUOTES | ENT_HTML5, 'UTF-8') . '); padding:24px;">' .
            '<p style="margin:0; font-size:13px; letter-spacing:3px; text-transform:uppercase; color:rgba(255,255,255,0.85);">OptiStock</p>' .
            '<h1 style="margin:8px 0 0; font-size:24px; color:#ffffff;">' . $tituloSeguro . '</h1>' .
            '</div>' .
            '<div style="padding:32px 24px; line-height:1.6; font-size:15px;">' .
            $contenidoPrincipal .
            $codigoHtml .
            $botonHtml .
            '<p style="margin-top:32px; font-size:12px; color:#6b7280;">' . $footerSeguro . '</p>' .
            '</div>' .
            '</div>' .
            '<p style="text-align:center; margin-top:24px; font-size:12px; color:#6b7280;">© ' . $anioActual . ' OptiStock. Todos los derechos reservados.</p>' .
            '</body>' .
            '</html>';
    }
}
