<?php
require_once __DIR__ . '/mail_config.php';

if (!function_exists('enviarCorreo')) {
    $GLOBALS['__ultimo_error_envio_correo'] = null;

    /**
     * Envía un correo utilizando el transporte configurado.
     */
    function enviarCorreo($destinatario, $asunto, $mensaje, array $opciones = [])
    {
        $asuntoSeguro = sanearCabeceraTexto($asunto);

        if (!filter_var($destinatario, FILTER_VALIDATE_EMAIL)) {
            $detalle = 'Correo destinatario inválido.';
            $GLOBALS['__ultimo_error_envio_correo'] = $detalle;
            registrarEnvioCorreo(false, $destinatario, $asuntoSeguro, $detalle);
            return false;
        }

        $config = prepararConfiguracionCorreo($destinatario, $asuntoSeguro, $mensaje, $opciones);

        $transporte = MAIL_TRANSPORT;
        $usarSmtp = $transporte === 'smtp' || ($transporte === 'auto' && MAIL_SMTP_HOST);
        $resultadoFinal = null;
        $detalleSmtp = '';

        if ($usarSmtp) {
            $resultadoSmtp = enviarCorreoConSMTP($config);
            if ($resultadoSmtp['exito']) {
                $resultadoFinal = $resultadoSmtp;
            } elseif ($transporte === 'auto') {
                $detalleSmtp = $resultadoSmtp['detalle'];
            } else {
                $resultadoFinal = $resultadoSmtp;
            }
        }

        if ($resultadoFinal === null) {
            $resultadoMail = enviarCorreoConMail($config);

            if (!empty($detalleSmtp)) {
                if ($resultadoMail['exito']) {
                    $resultadoMail['detalle'] = 'mail() aceptó el envío tras fallo SMTP: ' . $detalleSmtp;
                } else {
                    $resultadoMail['detalle'] = trim($detalleSmtp . ' | ' . $resultadoMail['detalle'], ' |');
                }
            }

            $resultadoFinal = $resultadoMail;
        }

        if (!$resultadoFinal['exito']) {
            $GLOBALS['__ultimo_error_envio_correo'] = $resultadoFinal['detalle'];
            registrarEnvioCorreo(false, $destinatario, $asuntoSeguro, $resultadoFinal['detalle']);
            return false;
        }

        $GLOBALS['__ultimo_error_envio_correo'] = null;
        registrarEnvioCorreo(true, $destinatario, $asuntoSeguro, $resultadoFinal['detalle']);
        return true;
    }

    function prepararConfiguracionCorreo($destinatario, $asunto, $mensaje, array $opciones)
    {
        $fromEmail = isset($opciones['from_email']) && filter_var($opciones['from_email'], FILTER_VALIDATE_EMAIL)
            ? $opciones['from_email']
            : MAIL_FROM_EMAIL;
        $fromName = array_key_exists('from_name', $opciones)
            ? (string) $opciones['from_name']
            : MAIL_FROM_NAME;
        $replyToEmail = isset($opciones['reply_to']) && filter_var($opciones['reply_to'], FILTER_VALIDATE_EMAIL)
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

        $mensajeNormalizado = normalizarMensaje($mensaje);

        $headersBase = [
            'From' => formatearDireccionCorreo($fromName, $fromEmail),
            'Reply-To' => formatearDireccionCorreo($replyToName, $replyToEmail),
            'MIME-Version' => '1.0',
            'Content-Type' => $contentType . '; charset=' . $charset,
            'Content-Transfer-Encoding' => '8bit',
            'X-Mailer' => 'PHP/' . phpversion(),
        ];

        $headersMail = $headersBase;
        $headersSmtp = $headersBase;

        if (!empty($opciones['cc'])) {
            $listaCc = construirListaCorreos($opciones['cc']);
            if ($listaCc !== '') {
                $headersMail['Cc'] = $listaCc;
                $headersSmtp['Cc'] = $listaCc;
            }
        }

        if (!empty($opciones['bcc'])) {
            $listaBcc = construirListaCorreos($opciones['bcc']);
            if ($listaBcc !== '') {
                $headersMail['Bcc'] = $listaBcc;
            }
        }

        if (!empty($opciones['headers']) && is_array($opciones['headers'])) {
            foreach ($opciones['headers'] as $clave => $valor) {
                if ($clave !== '') {
                    $headersMail[$clave] = $valor;
                    $headersSmtp[$clave] = $valor;
                }
            }
        }

        $dominio = obtenerDominioCorreo($fromEmail);
        $messageId = generarMessageId($dominio);
        $fecha = date(DATE_RFC2822);

        $headersMail['Date'] = $fecha;
        $headersMail['Message-ID'] = $messageId;
        $headersSmtp['Date'] = $fecha;
        $headersSmtp['Message-ID'] = $messageId;

        $headerStringMail = construirHeaderString($headersMail);

        $envelopeFrom = isset($opciones['envelope_from']) && filter_var($opciones['envelope_from'], FILTER_VALIDATE_EMAIL)
            ? $opciones['envelope_from']
            : MAIL_ENVELOPE_FROM;

        $destinatariosAdicionales = array_merge(
            extraerCorreosValidos($opciones['cc'] ?? []),
            extraerCorreosValidos($opciones['bcc'] ?? [])
        );

        return [
            'destinatario' => $destinatario,
            'asunto' => $asunto,
            'mensaje' => $mensajeNormalizado,
            'from_email' => $fromEmail,
            'from_name' => $fromName,
            'reply_to_email' => $replyToEmail,
            'reply_to_name' => $replyToName,
            'headers_mail' => $headersMail,
            'headers_smtp' => $headersSmtp,
            'header_string_mail' => $headerStringMail,
            'envelope_from' => $envelopeFrom,
            'destinatarios_smtp' => array_unique(array_merge([$destinatario], $destinatariosAdicionales)),
        ];
    }

    function enviarCorreoConMail(array $config)
    {
        if (!empty($config['from_email'])) {
            ini_set('sendmail_from', $config['from_email']);
        }

        $parametrosAdicionales = '';
        if (!empty($config['envelope_from']) && filter_var($config['envelope_from'], FILTER_VALIDATE_EMAIL)) {
            $parametrosAdicionales = '-f' . $config['envelope_from'];
        }

        $headers = $config['header_string_mail'];
        if ($headers !== '') {
            $headers .= "\r\n";
        }

        $resultado = @mail(
            $config['destinatario'],
            $config['asunto'],
            $config['mensaje'],
            $headers,
            $parametrosAdicionales
        );

        if (!$resultado) {
            return [
                'exito' => false,
                'detalle' => obtenerDetalleErrorCorreoNativo(),
            ];
        }

        return [
            'exito' => true,
            'detalle' => 'mail() aceptó el envío.',
        ];
    }

    function enviarCorreoConSMTP(array $config)
    {
        if (!MAIL_SMTP_HOST) {
            return [
                'exito' => false,
                'detalle' => 'No se configuró MAIL_SMTP_HOST para el transporte SMTP.',
            ];
        }

        $host = MAIL_SMTP_HOST;
        $port = MAIL_SMTP_PORT > 0 ? MAIL_SMTP_PORT : 587;
        $timeout = MAIL_SMTP_TIMEOUT > 0 ? MAIL_SMTP_TIMEOUT : 30;
        $helo = MAIL_SMTP_HELO ?: (gethostname() ?: 'localhost');

        $encryption = MAIL_SMTP_ENCRYPTION;
        if ($encryption === 'starttls') {
            $encryption = 'tls';
        }
        if (!in_array($encryption, ['ssl', 'tls'], true)) {
            $encryption = '';
        }

        $socketDestino = ($encryption === 'ssl' ? 'ssl://' : '') . $host . ':' . $port;

        $conexion = @stream_socket_client($socketDestino, $errno, $errstr, $timeout, STREAM_CLIENT_CONNECT);
        if (!$conexion) {
            return [
                'exito' => false,
                'detalle' => sprintf('No se pudo conectar con el servidor SMTP (%d): %s', $errno, $errstr),
            ];
        }

        stream_set_timeout($conexion, $timeout);

        [$codigo, $respuesta] = smtpLeerRespuesta($conexion);
        if ($codigo !== 220) {
            fclose($conexion);
            return [
                'exito' => false,
                'detalle' => 'El servidor SMTP no respondió con 220: ' . $respuesta,
            ];
        }

        if (!smtpEnviarComando($conexion, 'EHLO ' . $helo, [250], $respuestaEhlo)) {
            if (!smtpEnviarComando($conexion, 'HELO ' . $helo, [250], $respuestaEhlo)) {
                fclose($conexion);
                return [
                    'exito' => false,
                    'detalle' => 'El servidor SMTP rechazó EHLO/HELO: ' . $respuestaEhlo,
                ];
            }
        }

        if ($encryption === 'tls') {
            if (!smtpEnviarComando($conexion, 'STARTTLS', [220], $respuestaTls)) {
                fclose($conexion);
                return [
                    'exito' => false,
                    'detalle' => 'El servidor SMTP rechazó STARTTLS: ' . $respuestaTls,
                ];
            }

            $metodoCrypto = STREAM_CRYPTO_METHOD_TLS_CLIENT;
            if (defined('STREAM_CRYPTO_METHOD_TLSv1_2_CLIENT')) {
                $metodoCrypto = STREAM_CRYPTO_METHOD_TLSv1_2_CLIENT;
                if (defined('STREAM_CRYPTO_METHOD_TLSv1_3_CLIENT')) {
                    $metodoCrypto |= STREAM_CRYPTO_METHOD_TLSv1_3_CLIENT;
                }
                if (defined('STREAM_CRYPTO_METHOD_TLSv1_1_CLIENT')) {
                    $metodoCrypto |= STREAM_CRYPTO_METHOD_TLSv1_1_CLIENT;
                }
                $metodoCrypto |= STREAM_CRYPTO_METHOD_TLS_CLIENT;
            }

            if (!@stream_socket_enable_crypto($conexion, true, $metodoCrypto)) {
                fclose($conexion);
                return [
                    'exito' => false,
                    'detalle' => 'No fue posible iniciar la conexión segura con STARTTLS.',
                ];
            }

            if (!smtpEnviarComando($conexion, 'EHLO ' . $helo, [250], $respuestaEhlo)) {
                fclose($conexion);
                return [
                    'exito' => false,
                    'detalle' => 'El servidor SMTP rechazó EHLO después de STARTTLS: ' . $respuestaEhlo,
                ];
            }
        }

        if (MAIL_SMTP_USERNAME !== '') {
            if (!smtpEnviarComando($conexion, 'AUTH LOGIN', [334], $respuestaAuth)) {
                fclose($conexion);
                return [
                    'exito' => false,
                    'detalle' => 'Error al iniciar AUTH LOGIN: ' . $respuestaAuth,
                ];
            }

            if (!smtpEnviarComando($conexion, base64_encode(MAIL_SMTP_USERNAME), [334], $respuestaUser)) {
                fclose($conexion);
                return [
                    'exito' => false,
                    'detalle' => 'El servidor SMTP rechazó el usuario: ' . $respuestaUser,
                ];
            }

            if (!smtpEnviarComando($conexion, base64_encode(MAIL_SMTP_PASSWORD), [235], $respuestaPass)) {
                fclose($conexion);
                return [
                    'exito' => false,
                    'detalle' => 'El servidor SMTP rechazó la contraseña: ' . $respuestaPass,
                ];
            }
        }

        $envelope = !empty($config['envelope_from']) ? $config['envelope_from'] : $config['from_email'];
        if (!filter_var($envelope, FILTER_VALIDATE_EMAIL)) {
            fclose($conexion);
            return [
                'exito' => false,
                'detalle' => 'La dirección del remitente no es válida para MAIL FROM.',
            ];
        }

        if (!smtpEnviarComando($conexion, 'MAIL FROM:<' . $envelope . '>', [250], $respuestaMailFrom)) {
            fclose($conexion);
            return [
                'exito' => false,
                'detalle' => 'El servidor SMTP rechazó MAIL FROM: ' . $respuestaMailFrom,
            ];
        }

        $destinatarios = array_values(array_filter($config['destinatarios_smtp'], function ($correo) {
            return filter_var($correo, FILTER_VALIDATE_EMAIL);
        }));

        if (empty($destinatarios)) {
            fclose($conexion);
            return [
                'exito' => false,
                'detalle' => 'No hay destinatarios válidos para RCPT TO.',
            ];
        }

        foreach ($destinatarios as $correo) {
            if (!smtpEnviarComando($conexion, 'RCPT TO:<' . $correo . '>', [250, 251], $respuestaRcpt)) {
                fclose($conexion);
                return [
                    'exito' => false,
                    'detalle' => 'El servidor SMTP rechazó RCPT TO (' . $correo . '): ' . $respuestaRcpt,
                ];
            }
        }

        if (!smtpEnviarComando($conexion, 'DATA', [354], $respuestaData)) {
            fclose($conexion);
            return [
                'exito' => false,
                'detalle' => 'El servidor SMTP rechazó DATA: ' . $respuestaData,
            ];
        }

        $headers = prepararHeadersSMTPParaEnvio($config);
        $cuerpo = prepararCuerpoSMTP($config['mensaje']);
        $mensaje = $headers . "\r\n\r\n" . $cuerpo;

        if (substr($mensaje, -2) !== "\r\n") {
            $mensaje .= "\r\n";
        }

        $mensaje .= ".";

        if (@fwrite($conexion, $mensaje . "\r\n") === false) {
            fclose($conexion);
            return [
                'exito' => false,
                'detalle' => 'No fue posible enviar el contenido del correo al servidor SMTP.',
            ];
        }

        [$codigoFinal, $respuestaFinal] = smtpLeerRespuesta($conexion);
        if ($codigoFinal !== 250) {
            fclose($conexion);
            return [
                'exito' => false,
                'detalle' => 'El servidor SMTP rechazó el mensaje: ' . $respuestaFinal,
            ];
        }

        smtpEnviarComando($conexion, 'QUIT', [221], $respuestaQuit);

        fclose($conexion);

        return [
            'exito' => true,
            'detalle' => 'El servidor SMTP aceptó el mensaje.',
        ];
    }

    function prepararHeadersSMTPParaEnvio(array $config)
    {
        $headers = $config['headers_smtp'];
        $headers = array_merge([
            'Subject' => $config['asunto'],
            'To' => formatearDireccionCorreo('', $config['destinatario']),
        ], $headers);

        if (empty($headers['Message-ID'])) {
            $headers['Message-ID'] = generarMessageId(obtenerDominioCorreo($config['from_email']));
        }

        $lineas = '';
        foreach ($headers as $clave => $valor) {
            if ($valor === null || $valor === '') {
                continue;
            }

            $lineas .= $clave . ': ' . sanearHeaderValor($valor) . "\r\n";
        }

        return rtrim($lineas, "\r\n");
    }

    function prepararCuerpoSMTP($mensaje)
    {
        if ($mensaje === '') {
            return "\r\n";
        }

        $cuerpo = $mensaje;
        if (strpos($cuerpo, '.') === 0) {
            $cuerpo = '.' . $cuerpo;
        }

        $cuerpo = str_replace("\r\n.", "\r\n..", $cuerpo);
        return $cuerpo;
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

    function extraerCorreosValidos($lista)
    {
        if (is_string($lista)) {
            $lista = array_map('trim', explode(',', $lista));
        }

        if (!is_array($lista)) {
            return [];
        }

        $direcciones = [];
        foreach ($lista as $entrada) {
            if (is_array($entrada)) {
                $correo = $entrada['email'] ?? '';
            } else {
                $correo = $entrada;
            }

            $correo = trim((string) $correo);
            if (filter_var($correo, FILTER_VALIDATE_EMAIL)) {
                $direcciones[] = $correo;
            }
        }

        return $direcciones;
    }

    function construirHeaderString(array $headers)
    {
        $resultado = '';
        foreach ($headers as $clave => $valor) {
            if ($valor === null || $valor === '') {
                continue;
            }

            $resultado .= $clave . ': ' . sanearHeaderValor($valor) . "\r\n";
        }

        return rtrim($resultado, "\r\n");
    }

    function normalizarMensaje($mensaje)
    {
        $normalizado = str_replace(["\r\n", "\r"], "\n", (string) $mensaje);
        $normalizado = str_replace("\n", "\r\n", $normalizado);

        if ($normalizado === '') {
            $normalizado = "\r\n";
        }

        if (substr($normalizado, -2) !== "\r\n") {
            $normalizado .= "\r\n";
        }

        return $normalizado;
    }

    function sanearCabeceraTexto($texto)
    {
        $texto = preg_replace('/[\r\n]+/', ' ', (string) $texto);
        return trim($texto);
    }

    function sanearHeaderValor($valor)
    {
        $valor = preg_replace('/[\r\n]+/', ' ', (string) $valor);
        return trim($valor);
    }

    function generarMessageId($dominio)
    {
        try {
            $id = bin2hex(random_bytes(16));
        } catch (Exception $e) {
            $id = str_replace('.', '', uniqid('', true));
        }

        $dominioLimpio = preg_replace('/[^A-Za-z0-9\.-]/', '', (string) $dominio);
        if ($dominioLimpio === '') {
            $dominioLimpio = 'localhost.localdomain';
        }

        return sprintf('<%s@%s>', $id, $dominioLimpio);
    }

    function obtenerDominioCorreo($correo)
    {
        $pos = strpos($correo, '@');
        if ($pos === false) {
            return 'localhost.localdomain';
        }

        $dominio = substr($correo, $pos + 1);
        $dominio = preg_replace('/[^A-Za-z0-9\.-]/', '', (string) $dominio);

        return $dominio !== '' ? $dominio : 'localhost.localdomain';
    }

    function smtpLeerRespuesta($conexion)
    {
        $datos = '';
        while (($linea = fgets($conexion, 515)) !== false) {
            $datos .= $linea;
            if (strlen($linea) >= 4 && $linea[3] === ' ') {
                break;
            }
        }

        if ($datos === '') {
            return [0, ''];
        }

        $codigo = (int) substr($datos, 0, 3);
        return [$codigo, trim($datos)];
    }

    function smtpEnviarComando($conexion, $comando, array $codigosEsperados, &$respuesta)
    {
        if ($comando !== null) {
            if (@fwrite($conexion, $comando . "\r\n") === false) {
                $respuesta = 'No fue posible escribir en el socket SMTP.';
                return false;
            }
        }

        [$codigo, $mensaje] = smtpLeerRespuesta($conexion);
        if (!in_array($codigo, $codigosEsperados, true)) {
            $respuesta = $mensaje !== '' ? $mensaje : 'Respuesta inesperada del servidor SMTP.';
            return false;
        }

        $respuesta = $mensaje;
        return true;
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

    function obtenerDetalleErrorCorreoNativo()
    {
        $ultimoError = error_get_last();
        if ($ultimoError && isset($ultimoError['message'])) {
            return $ultimoError['message'];
        }

        return 'mail() devolvió false sin mensaje adicional.';
    }

    function obtenerUltimoErrorEnvioCorreo()
    {
        return $GLOBALS['__ultimo_error_envio_correo'] ?? null;
    }
}
