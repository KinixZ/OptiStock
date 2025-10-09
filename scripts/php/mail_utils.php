<?php

if (!function_exists('enviarCorreo')) {
    function enviarCorreo($destinatario, $asunto, $mensaje, array $opciones = [])
    {
        if (!filter_var($destinatario, FILTER_VALIDATE_EMAIL)) {
            registrarEnvioCorreo(false, $destinatario, $asunto, 'Correo destinatario inválido.');
            return false;
        }

        $config = obtenerConfiguracionCorreo();

        $fromEmail = trim((string)($opciones['from_email'] ?? $config['default_from_email'] ?? 'no-reply@optistock.site'));
        $fromName = trim((string)($opciones['from_name'] ?? $config['default_from_name'] ?? 'OptiStock'));
        $replyToEmail = trim((string)($opciones['reply_to'] ?? $config['default_reply_to_email'] ?? $fromEmail));
        $replyToName = trim((string)($opciones['reply_to_name'] ?? $config['default_reply_to_name'] ?? $fromName));

        $transport = strtolower((string)($opciones['transport'] ?? $config['transport'] ?? 'sendmail'));

        if ($transport === 'sendmail') {
            $resultadoSendmail = enviarCorreoSendmail(
                $destinatario,
                $asunto,
                $mensaje,
                $opciones,
                $config,
                $fromEmail,
                $fromName,
                $replyToEmail,
                $replyToName
            );

            if ($resultadoSendmail === true) {
                return true;
            }

            if ($resultadoSendmail === null) {
                // Si sendmail no está disponible continuamos con mail()
            } else {
                // Hubo un error usando sendmail; intentaremos mail() como respaldo
            }
        }

        return enviarCorreoMail(
            $destinatario,
            $asunto,
            $mensaje,
            $opciones,
            $fromEmail,
            $fromName,
            $replyToEmail,
            $replyToName
        );
    }

    function enviarCorreoSendmail($destinatario, $asunto, $mensaje, array $opciones, array $config, $fromEmail, $fromName, $replyToEmail, $replyToName)
    {
        $rutaSendmail = trim((string)($opciones['sendmail_path']
            ?? ($config['sendmail']['path'] ?? ini_get('sendmail_path') ?? '')));

        if ($rutaSendmail === '') {
            return null;
        }

        $headers = [
            'From' => formatearDireccionCorreo($fromName, $fromEmail),
            'Reply-To' => formatearDireccionCorreo($replyToName, $replyToEmail),
            'MIME-Version' => '1.0',
            'Content-Type' => 'text/plain; charset=UTF-8',
            'Content-Transfer-Encoding' => '8bit',
            'X-Mailer' => 'OptiStock Sendmail PHP/' . phpversion(),
            'Date' => date(DATE_RFC2822),
            'Message-ID' => sprintf('<%s@%s>', uniqid('optistock-', true), obtenerDominioMensaje($fromEmail)),
        ];

        if (isset($opciones['headers']) && is_array($opciones['headers'])) {
            foreach ($opciones['headers'] as $clave => $valor) {
                $headers[$clave] = $valor;
            }
        }

        $cuerpo = prepararCuerpoCorreo($mensaje, $headers, $opciones);

        $lineasCabecera = [
            'To: ' . formatearDireccionCorreo('', $destinatario),
            'Subject: ' . sanearCabeceraCorreo($asunto),
        ];

        foreach ($headers as $clave => $valor) {
            $lineasCabecera[] = $clave . ': ' . $valor;
        }

        $mensajeCompleto = implode("\r\n", $lineasCabecera) . "\r\n\r\n" . $cuerpo;

        $descriptorSpec = [
            0 => ['pipe', 'w'],
            1 => ['pipe', 'r'],
            2 => ['pipe', 'r'],
        ];

        $proceso = @proc_open($rutaSendmail, $descriptorSpec, $pipes);

        if (!is_resource($proceso)) {
            registrarEnvioCorreo(false, $destinatario, $asunto, 'No se pudo iniciar sendmail.');
            return false;
        }

        fwrite($pipes[0], $mensajeCompleto);
        fclose($pipes[0]);

        $stdout = stream_get_contents($pipes[1]);
        fclose($pipes[1]);

        $stderr = stream_get_contents($pipes[2]);
        fclose($pipes[2]);

        $codigoSalida = proc_close($proceso);

        if ($codigoSalida !== 0) {
            $detalle = trim($stderr !== '' ? $stderr : $stdout);
            $mensajeError = 'sendmail salió con código ' . $codigoSalida;
            if ($detalle !== '') {
                $mensajeError .= ': ' . $detalle;
            }
            registrarEnvioCorreo(false, $destinatario, $asunto, $mensajeError);
            return false;
        }

        registrarEnvioCorreo(true, $destinatario, $asunto, 'sendmail aceptó el envío.');
        return true;
    }

    function enviarCorreoMail($destinatario, $asunto, $mensaje, array $opciones, $fromEmail, $fromName, $replyToEmail, $replyToName)
    {
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

        $cuerpo = prepararCuerpoCorreo($mensaje, $headers, $opciones);

        $headerString = '';
        foreach ($headers as $clave => $valor) {
            $headerString .= $clave . ': ' . $valor . "\r\n";
        }

        $resultado = @mail($destinatario, $asunto, $cuerpo, $headerString, $parametrosAdicionales);

        if (!$resultado) {
            $detalleError = obtenerDetalleErrorCorreo();
            registrarEnvioCorreo(false, $destinatario, $asunto, $detalleError);
            return false;
        }

        registrarEnvioCorreo(true, $destinatario, $asunto, 'mail() aceptó el envío.');
        return true;
    }

    function obtenerDominioMensaje($correo)
    {
        $correo = (string) $correo;
        if (strpos($correo, '@') !== false) {
            return substr(strrchr($correo, '@'), 1);
        }

        return 'optistock.site';
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

    function prepararCuerpoCorreo($mensaje, array &$headers, array $opciones)
    {
        if (is_array($mensaje)) {
            $html = isset($mensaje['html']) ? (string) $mensaje['html'] : '';
            $text = isset($mensaje['text']) ? (string) $mensaje['text'] : '';

            $html = trim($html) !== '' ? normalizarSaltosLinea($html) : '';
            $text = trim($text) !== '' ? normalizarSaltosLinea($text) : '';

            if ($html !== '' && $text === '') {
                $text = normalizarSaltosLinea(strip_tags($html));
            }

            if ($html !== '' && $text !== '') {
                $boundary = generarBoundaryCorreo();
                $headers['Content-Type'] = 'multipart/alternative; boundary="' . $boundary . '"';

                $partes = [];
                $partes[] = '--' . $boundary;
                $partes[] = 'Content-Type: text/plain; charset=UTF-8';
                $partes[] = 'Content-Transfer-Encoding: 8bit';
                $partes[] = '';
                $partes[] = $text;
                $partes[] = '';
                $partes[] = '--' . $boundary;
                $partes[] = 'Content-Type: text/html; charset=UTF-8';
                $partes[] = 'Content-Transfer-Encoding: 8bit';
                $partes[] = '';
                $partes[] = $html;
                $partes[] = '';
                $partes[] = '--' . $boundary . '--';

                return normalizarSaltosLinea(implode("\n", $partes));
            }

            if ($html !== '') {
                $headers['Content-Type'] = 'text/html; charset=UTF-8';
                return $html;
            }

            $headers['Content-Type'] = 'text/plain; charset=UTF-8';
            return $text;
        }

        $cuerpo = (string) $mensaje;
        $cuerpo = normalizarSaltosLinea($cuerpo);

        if (!empty($opciones['is_html']) || (isset($opciones['content_type']) && stripos($opciones['content_type'], 'html') !== false)) {
            $headers['Content-Type'] = 'text/html; charset=UTF-8';
        }

        return $cuerpo;
    }

    function sanearCabeceraCorreo($valor)
    {
        $valor = trim((string) $valor);
        return preg_replace('/[\r\n]+/', ' ', $valor);
    }

    function normalizarSaltosLinea($texto)
    {
        $texto = str_replace(["\r\n", "\r"], "\n", (string) $texto);
        return str_replace("\n", "\r\n", $texto);
    }

    function generarBoundaryCorreo()
    {
        if (function_exists('random_bytes')) {
            return '=_OptiStock_' . bin2hex(random_bytes(12));
        }

        if (function_exists('openssl_random_pseudo_bytes')) {
            return '=_OptiStock_' . bin2hex(openssl_random_pseudo_bytes(12));
        }

        return '=_OptiStock_' . md5(uniqid((string) mt_rand(), true));
    }

    function escaparTextoCorreo($texto)
    {
        return htmlspecialchars((string) $texto, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    }

    function plantillaCorreoOptiStock($titulo, $contenidoHtml, array $opciones = [])
    {
        $brandName = escaparTextoCorreo($opciones['brand_name'] ?? 'OptiStock');
        $titulo = escaparTextoCorreo($titulo);
        $preheader = isset($opciones['preheader']) ? escaparTextoCorreo($opciones['preheader']) : '';
        $footerHtml = $opciones['footer_html'] ?? '';

        $preheaderSpan = $preheader !== ''
            ? '<span style="display:none!important;visibility:hidden;mso-hide:all;font-size:1px;color:#f5f6fb;line-height:1;max-height:0;max-width:0;opacity:0;overflow:hidden;">' . $preheader . '</span>'
            : '';

        $contenido = normalizarSaltosLinea((string) $contenidoHtml);
        $footer = $footerHtml !== '' ? $footerHtml : '<p style="margin:0;color:#6b7280;font-size:12px;line-height:18px;">Recibiste este correo porque tienes una cuenta en OptiStock.</p>';

        $html = <<<HTML
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{$titulo}</title>
</head>
<body style="margin:0;padding:24px;background-color:#f5f6fb;font-family:'Poppins',Arial,sans-serif;color:#1f2937;">
    {$preheaderSpan}
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;">
        <tr>
            <td align="center">
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 18px 40px -28px rgba(23,31,52,0.45);border:1px solid rgba(255,111,145,0.16);">
                    <tr>
                        <td style="background:linear-gradient(135deg,#ff6f91 0%,#ff9671 100%);padding:32px;text-align:center;color:#ffffff;">
                            <div style="font-size:26px;font-weight:700;letter-spacing:0.4px;">{$brandName}</div>
                            <div style="margin-top:6px;font-size:15px;font-weight:500;opacity:0.92;">{$titulo}</div>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:32px;">
                            {$contenido}
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:24px 32px;background-color:#f9fafc;border-top:1px solid #e7e9f5;">
                            {$footer}
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
HTML;

        return $html;
    }

    function crearCorreoCodigoOptiStock($titulo, $mensajePrincipal, $codigo, $nota = '', $nombre = null, array $instrucciones = [])
    {
        $saludoPlano = $nombre ? 'Hola ' . trim((string) $nombre) . ',' : 'Hola,';
        $saludo = escaparTextoCorreo($saludoPlano);
        $mensajePlano = (string) $mensajePrincipal;
        $codigoPlano = (string) $codigo;
        $notaPlano = (string) $nota;
        $instrucciones = array_filter(array_map('trim', $instrucciones), function ($valor) {
            return $valor !== '';
        });

        $mensajePrincipalHtml = escaparTextoCorreo($mensajePlano);
        $codigoHtml = escaparTextoCorreo($codigoPlano);
        $notaHtml = $notaPlano !== '' ? '<p style="margin:0 0 16px;font-size:14px;line-height:22px;color:#1f2937;">' . escaparTextoCorreo($notaPlano) . '</p>' : '';

        $listaHtml = '';
        $listaTexto = [];

        if (!empty($instrucciones)) {
            $itemsHtml = [];
            foreach ($instrucciones as $paso) {
                $pasoEscapado = escaparTextoCorreo($paso);
                $itemsHtml[] = '<li style="margin:0 0 8px;font-size:14px;line-height:22px;color:#1f2937;">' . $pasoEscapado . '</li>';
                $listaTexto[] = $paso;
            }

            if (!empty($itemsHtml)) {
                $listaHtml = '<ol style="margin:0 0 20px;padding-left:20px;">' . implode('', $itemsHtml) . '</ol>';
            }
        }

        $contenidoPartes = [];
        $contenidoPartes[] = '<p style="margin:0 0 16px;font-size:15px;line-height:24px;color:#1f2937;">' . $saludo . '</p>';
        $contenidoPartes[] = '<p style="margin:0 0 20px;font-size:15px;line-height:24px;color:#1f2937;">' . $mensajePrincipalHtml . '</p>';
        $contenidoPartes[] = '<div style="margin:0 0 20px;display:inline-block;padding:16px 28px;font-size:26px;font-weight:700;letter-spacing:6px;background-color:rgba(255,111,145,0.12);color:#ff6f91;border-radius:18px;border:1px solid rgba(255,111,145,0.32);">' . $codigoHtml . '</div>';

        if ($listaHtml !== '') {
            $contenidoPartes[] = '<p style="margin:0 0 12px;font-size:14px;line-height:22px;color:#1f2937;font-weight:600;">Sigue estos pasos:</p>';
            $contenidoPartes[] = $listaHtml;
        }

        if ($notaHtml !== '') {
            $contenidoPartes[] = $notaHtml;
        }

        $contenidoPartes[] = '<p style="margin:0;font-size:14px;line-height:22px;color:#1f2937;">Si tienes alguna duda, responde a este correo o escríbenos a <a href="mailto:soporte@optistock.site" style="color:#0fb4d4;text-decoration:none;font-weight:600;">soporte@optistock.site</a>.</p>';

        $contenidoHtml = implode("\n", $contenidoPartes);

        $footer = '<p style="margin:0;color:#6b7280;font-size:12px;line-height:18px;">Recibiste este mensaje porque registraste esta dirección de correo en OptiStock.</p>';

        $html = plantillaCorreoOptiStock($titulo, $contenidoHtml, [
            'preheader' => $mensajePlano,
            'footer_html' => $footer,
        ]);

        $partesTexto = [
            $saludoPlano,
            $mensajePlano,
            'Código: ' . $codigoPlano,
        ];

        if (!empty($listaTexto)) {
            $partesTexto[] = 'Sigue estos pasos:';
            foreach ($listaTexto as $pasoTexto) {
                $partesTexto[] = '- ' . $pasoTexto;
            }
        }

        if ($notaPlano !== '') {
            $partesTexto[] = $notaPlano;
        }

        $partesTexto[] = 'Si tienes alguna duda, contáctanos en soporte@optistock.site';

        $textoPlano = implode("\n\n", array_filter($partesTexto));

        return [
            'html' => $html,
            'text' => $textoPlano,
        ];
    }

    function crearCorreoInformativoOptiStock($titulo, array $parrafos, $nombre = null)
    {
        $saludoPlano = $nombre ? 'Hola ' . trim((string) $nombre) . ',' : 'Hola,';
        $saludo = escaparTextoCorreo($saludoPlano);

        $bloquesHtml = ['<p style="margin:0 0 16px;font-size:15px;line-height:24px;color:#1f2937;">' . $saludo . '</p>'];
        $bloquesTexto = [$saludoPlano];

        foreach ($parrafos as $parrafo) {
            if ($parrafo === null || $parrafo === '') {
                continue;
            }

            $bloquesHtml[] = '<p style="margin:0 0 16px;font-size:14px;line-height:22px;color:#1f2937;">' . escaparTextoCorreo($parrafo) . '</p>';
            $bloquesTexto[] = (string) $parrafo;
        }

        $bloquesHtml[] = '<p style="margin:0;font-size:14px;line-height:22px;color:#1f2937;">Si necesitas ayuda adicional, responde a este correo o escríbenos a <a href="mailto:soporte@optistock.site" style="color:#0fb4d4;text-decoration:none;font-weight:600;">soporte@optistock.site</a>.</p>';
        $bloquesTexto[] = 'Si necesitas ayuda adicional, contáctanos en soporte@optistock.site';

        $contenidoHtml = implode("\n", $bloquesHtml);

        $html = plantillaCorreoOptiStock($titulo, $contenidoHtml, [
            'preheader' => isset($parrafos[0]) ? (string) $parrafos[0] : $titulo,
        ]);

        $textoPlano = implode("\n\n", $bloquesTexto);

        return [
            'html' => $html,
            'text' => $textoPlano,
        ];
    }

    function obtenerConfiguracionCorreo()
    {
        static $config = null;

        if ($config !== null) {
            return $config;
        }

        $config = [
            'transport' => 'sendmail',
            'sendmail' => [
                'path' => ini_get('sendmail_path') ?: '/usr/sbin/sendmail -t -i',
            ],
            'default_from_email' => 'no-reply@optistock.site',
            'default_from_name' => 'OptiStock',
            'default_reply_to_email' => 'soporte@optistock.site',
            'default_reply_to_name' => 'Soporte OptiStock',
        ];

        $rutaConfig = dirname(__DIR__, 2) . '/config/mail_settings.php';
        if (is_readable($rutaConfig)) {
            $personalizado = include $rutaConfig;
            if (is_array($personalizado)) {
                $config = array_replace_recursive($config, $personalizado);
            }
        }

        $config = aplicarVariablesEntornoCorreo($config);

        return $config;
    }

    function aplicarVariablesEntornoCorreo(array $config)
    {
        $mapa = [
            'default_from_email' => 'MAIL_FROM_EMAIL',
            'default_from_name' => 'MAIL_FROM_NAME',
            'default_reply_to_email' => 'MAIL_REPLY_TO_EMAIL',
            'default_reply_to_name' => 'MAIL_REPLY_TO_NAME',
            'transport' => 'MAIL_TRANSPORT',
            'sendmail.path' => 'MAIL_SENDMAIL_PATH',
        ];

        foreach ($mapa as $ruta => $variable) {
            $valor = getenv($variable);
            if ($valor === false || $valor === null || $valor === '') {
                continue;
            }

            asignarValorPorRuta($config, $ruta, $valor);
        }

        return $config;
    }

    function asignarValorPorRuta(array &$config, $ruta, $valor)
    {
        $partes = explode('.', $ruta);
        $referencia =& $config;

        foreach ($partes as $indice) {
            if (!is_array($referencia)) {
                $referencia = [];
            }

            if (!array_key_exists($indice, $referencia)) {
                $referencia[$indice] = [];
            }

            $referencia =& $referencia[$indice];
        }

        if (is_numeric($valor) && strpos($valor, '.') === false) {
            $valor = (int) $valor;
        }

        if (is_string($valor)) {
            $valorLimpio = strtolower($valor);
            if ($valorLimpio === 'true' || $valorLimpio === 'false') {
                $valor = $valorLimpio === 'true';
            }
        }

        $referencia = $valor;
    }
}
