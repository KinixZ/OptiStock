<?php

require_once __DIR__ . '/mail_config.php';

if (!function_exists('enviarCorreo')) {
    $GLOBALS['__ultimo_error_envio_correo'] = null;

    /**
     * Envía un correo utilizando un cliente SMTP básico.
     */
    function enviarCorreo($destinatario, $asunto, $mensaje, array $opciones = [])
    {
        $GLOBALS['__ultimo_error_envio_correo'] = null;

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
        $toName = array_key_exists('to_name', $opciones)
            ? (string) $opciones['to_name']
            : '';

        $charset = isset($opciones['charset']) && $opciones['charset']
            ? $opciones['charset']
            : MAIL_DEFAULT_CHARSET;

        $contentType = !empty($opciones['content_type'])
            ? $opciones['content_type']
            : (!empty($opciones['is_html']) ? 'text/html' : 'text/plain');

        $ccHeader = construirListaCorreos($opciones['cc'] ?? [], $charset);
        $bccEmails = extraerCorreosPlano($opciones['bcc'] ?? []);

        $destinatariosRCPT = array_unique(array_merge(
            [$destinatario],
            extraerCorreosPlano($opciones['cc'] ?? []),
            $bccEmails
        ));

        if (empty($destinatariosRCPT)) {
            $GLOBALS['__ultimo_error_envio_correo'] = 'No hay destinatarios válidos para el correo.';
            registrarEnvioCorreo(false, $destinatario, $asunto, $GLOBALS['__ultimo_error_envio_correo']);
            return false;
        }

        $headers = [
            'Date' => date('r'),
            'Subject' => codificarCabecera($asunto, $charset),
            'From' => formatearDireccionCorreo($fromName, $fromEmail, $charset),
            'Reply-To' => formatearDireccionCorreo($replyToName, $replyToEmail, $charset),
            'To' => formatearDireccionCorreo($toName, $destinatario, $charset),
            'MIME-Version' => '1.0',
            'Content-Type' => $contentType . '; charset=' . $charset,
            'Content-Transfer-Encoding' => '8bit',
            'X-Mailer' => 'OptiStock SMTP (PHP ' . PHP_VERSION . ')',
        ];

        $messageIdDomain = obtenerDominioParaMessageId($fromEmail ?: MAIL_FROM_EMAIL);
        $headers['Message-ID'] = sprintf('<%s@%s>', uniqid('', true), $messageIdDomain);

        if ($ccHeader !== '') {
            $headers['Cc'] = $ccHeader;
        }

        if (!empty($opciones['headers']) && is_array($opciones['headers'])) {
            foreach ($opciones['headers'] as $clave => $valor) {
                $clave = trim((string) $clave);
                if ($clave !== '') {
                    $headers[$clave] = $valor;
                }
            }
        }

        $headerString = '';
        foreach ($headers as $clave => $valor) {
            if ($valor !== null && $valor !== '') {
                $headerString .= $clave . ': ' . normalizarSaltosLinea((string) $valor) . "\r\n";
            }
        }

        $mensajeNormalizado = normalizarSaltosLinea((string) $mensaje);
        if ($mensajeNormalizado === '') {
            $mensajeNormalizado = "\r\n";
        }

        $cuerpo = $headerString . "\r\n" . $mensajeNormalizado;
        $cuerpo = preg_replace('/^\./m', '..', $cuerpo);

        $envelopeFrom = isset($opciones['envelope_from']) && $opciones['envelope_from']
            ? $opciones['envelope_from']
            : MAIL_ENVELOPE_FROM;

        $resultadoSMTP = smtpEnviarMensaje($envelopeFrom ?: $fromEmail, $destinatariosRCPT, $cuerpo);

        if (!$resultadoSMTP['exito']) {
            $GLOBALS['__ultimo_error_envio_correo'] = $resultadoSMTP['mensaje'];
            registrarEnvioCorreo(false, $destinatario, $asunto, $resultadoSMTP['mensaje']);
            return false;
        }

        registrarEnvioCorreo(true, $destinatario, $asunto, 'Correo aceptado por el servidor SMTP.');
        return true;
    }

    function smtpEnviarMensaje($from, array $destinatarios, $cuerpo)
    {
        $from = trim((string) $from);
        if (!filter_var($from, FILTER_VALIDATE_EMAIL)) {
            return [
                'exito' => false,
                'mensaje' => 'La dirección de origen es inválida para MAIL FROM.'
            ];
        }

        $respuesta = '';
        $error = '';
        $socket = smtpConectar($error);
        if (!$socket) {
            return [
                'exito' => false,
                'mensaje' => $error ?: 'No se pudo iniciar la conexión SMTP.'
            ];
        }

        $cerrarSocket = function () use ($socket) {
            if (is_resource($socket)) {
                @fwrite($socket, "QUIT\r\n");
                @fclose($socket);
            }
        };

        try {
            if (!smtpLeerRespuesta($socket, [220], $respuesta)) {
                throw new \Exception('El servidor SMTP no devolvió un estado 220 de bienvenida. Respuesta: ' . $respuesta);
            }

            $hostLocal = obtenerNombreHostLocal();
            if (!smtpEnviarComando($socket, 'EHLO ' . $hostLocal, [250], $respuesta)) {
                throw new \Exception('Error durante EHLO: ' . $respuesta);
            }

            if (SMTP_ENCRYPTION === 'tls') {
                if (!smtpEnviarComando($socket, 'STARTTLS', [220], $respuesta)) {
                    throw new \Exception('El servidor rechazó STARTTLS: ' . $respuesta);
                }

                if (!smtpHabilitarCifrado($socket, $respuesta)) {
                    throw new \Exception('No se pudo establecer la capa TLS: ' . $respuesta);
                }

                if (!smtpEnviarComando($socket, 'EHLO ' . $hostLocal, [250], $respuesta)) {
                    throw new \Exception('Error durante EHLO posterior a STARTTLS: ' . $respuesta);
                }
            }

            if (!smtpAutenticar($socket, $respuesta)) {
                throw new \Exception('No se pudo autenticar contra el servidor SMTP: ' . $respuesta);
            }

            if (!smtpEnviarComando($socket, 'MAIL FROM:<' . $from . '>', [250], $respuesta)) {
                throw new \Exception('MAIL FROM rechazado: ' . $respuesta);
            }

            $hayDestinatarios = false;
            foreach ($destinatarios as $correo) {
                $correo = trim((string) $correo);
                if (!filter_var($correo, FILTER_VALIDATE_EMAIL)) {
                    continue;
                }

                if (!smtpEnviarComando($socket, 'RCPT TO:<' . $correo . '>', [250, 251], $respuesta)) {
                    throw new \Exception('RCPT TO rechazado para ' . $correo . ': ' . $respuesta);
                }
                $hayDestinatarios = true;
            }

            if (!$hayDestinatarios) {
                throw new \Exception('Ninguno de los destinatarios fue aceptado por el servidor SMTP.');
            }

            if (!smtpEnviarComando($socket, 'DATA', [354], $respuesta)) {
                throw new \Exception('El servidor rechazó el comando DATA: ' . $respuesta);
            }

            if (!smtpEnviarDatos($socket, $cuerpo)) {
                throw new \Exception('No se pudo enviar el cuerpo del mensaje al servidor SMTP.');
            }

            if (!smtpLeerRespuesta($socket, [250], $respuesta)) {
                throw new \Exception('El servidor no confirmó la recepción del mensaje. Respuesta: ' . $respuesta);
            }

            smtpEnviarComando($socket, 'QUIT', [221], $respuesta);
            @fclose($socket);

            return ['exito' => true, 'mensaje' => $respuesta];
        } catch (\Exception $ex) {
            $cerrarSocket();
            return ['exito' => false, 'mensaje' => $ex->getMessage()];
        }
    }

    function smtpConectar(&$error)
    {
        $enlace = SMTP_HOST . ':' . SMTP_PORT;
        $contextOptions = [];

        if (in_array(SMTP_ENCRYPTION, ['ssl', 'tls'], true)) {
            $contextOptions['ssl'] = [
                'verify_peer' => false,
                'verify_peer_name' => false,
                'allow_self_signed' => true,
                'crypto_method' => STREAM_CRYPTO_METHOD_TLS_CLIENT | STREAM_CRYPTO_METHOD_SSLv23_CLIENT,
            ];
        }

        $context = stream_context_create($contextOptions);
        $transport = SMTP_ENCRYPTION === 'ssl' ? 'ssl://' . $enlace : $enlace;

        $socket = @stream_socket_client(
            $transport,
            $errno,
            $errstr,
            SMTP_TIMEOUT,
            STREAM_CLIENT_CONNECT,
            $context
        );

        if (!$socket) {
            $error = 'Conexión SMTP fallida (' . $errno . '): ' . $errstr;
            return false;
        }

        stream_set_timeout($socket, SMTP_TIMEOUT);
        return $socket;
    }

    function smtpLeerRespuesta($socket, array $codigosEsperados, &$respuesta)
    {
        $respuesta = '';
        while (($linea = @fgets($socket, 515)) !== false) {
            $respuesta .= $linea;
            if (preg_match('/^\d{3} /', $linea)) {
                break;
            }
        }

        if ($respuesta === '') {
            return false;
        }

        if (!preg_match('/^(\d{3})/', trim($respuesta), $coincidencia)) {
            return false;
        }

        $codigo = (int) $coincidencia[1];
        return in_array($codigo, $codigosEsperados, true);
    }

    function smtpEnviarComando($socket, $comando, array $codigosEsperados, &$respuesta)
    {
        if (@fwrite($socket, $comando . "\r\n") === false) {
            $respuesta = 'No se pudo escribir en el socket SMTP.';
            return false;
        }

        return smtpLeerRespuesta($socket, $codigosEsperados, $respuesta);
    }

    function smtpEnviarDatos($socket, $datos)
    {
        $datosTerminado = $datos;
        if (!preg_match('/\r\n$/', $datosTerminado)) {
            $datosTerminado .= "\r\n";
        }
        $datosTerminado .= ".\r\n";

        $resultado = @fwrite($socket, $datosTerminado);
        return $resultado !== false;
    }

    function smtpAutenticar($socket, &$respuesta)
    {
        if (!smtpEnviarComando($socket, 'AUTH LOGIN', [334], $respuesta)) {
            return false;
        }

        if (!smtpEnviarComando($socket, base64_encode(SMTP_USERNAME), [334], $respuesta)) {
            return false;
        }

        if (!smtpEnviarComando($socket, base64_encode(SMTP_PASSWORD), [235], $respuesta)) {
            return false;
        }

        return true;
    }

    function smtpHabilitarCifrado($socket, &$respuesta)
    {
        $cryptoMethod = STREAM_CRYPTO_METHOD_TLS_CLIENT | STREAM_CRYPTO_METHOD_SSLv23_CLIENT;
        if (!@stream_socket_enable_crypto($socket, true, $cryptoMethod)) {
            $respuesta = 'stream_socket_enable_crypto() devolvió false.';
            return false;
        }

        return true;
    }

    function obtenerNombreHostLocal()
    {
        $host = gethostname();
        if (!$host) {
            $host = 'localhost';
        }
        return $host;
    }

    function codificarCabecera($texto, $charset)
    {
        $texto = (string) $texto;
        if ($texto === '') {
            return '';
        }

        if (!preg_match('/[\x80-\xFF]/', $texto)) {
            return $texto;
        }

        if (function_exists('mb_encode_mimeheader')) {
            return mb_encode_mimeheader($texto, $charset, 'B', "\r\n");
        }

        return '=?' . $charset . '?B?' . base64_encode($texto) . '?=';
    }

    function normalizarSaltosLinea($texto)
    {
        $texto = str_replace(["\r\n", "\r"], "\n", $texto);
        $texto = str_replace("\n", "\r\n", $texto);
        return $texto;
    }

    function formatearDireccionCorreo($nombre, $correo, $charset = MAIL_DEFAULT_CHARSET)
    {
        $correo = trim((string) $correo);
        $nombre = trim((string) $nombre);

        if ($correo === '') {
            return $nombre;
        }

        if ($nombre === '') {
            return $correo;
        }

        $nombreCodificado = codificarCabecera($nombre, $charset);
        return sprintf('%s <%s>', $nombreCodificado, $correo);
    }

    function construirListaCorreos($lista, $charset = MAIL_DEFAULT_CHARSET)
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
                    $direcciones[] = formatearDireccionCorreo($nombre, $correo, $charset);
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

    function extraerCorreosPlano($lista)
    {
        if (is_string($lista)) {
            $lista = array_map('trim', explode(',', $lista));
        }

        if (!is_array($lista)) {
            return [];
        }

        $correos = [];
        foreach ($lista as $entrada) {
            if (is_array($entrada)) {
                $correo = $entrada['email'] ?? '';
            } else {
                $correo = $entrada;
            }

            $correo = trim((string) $correo);
            if (filter_var($correo, FILTER_VALIDATE_EMAIL)) {
                $correos[] = $correo;
            }
        }

        return $correos;
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

    function obtenerDominioParaMessageId($correo)
    {
        $partes = explode('@', $correo);
        if (count($partes) === 2 && trim($partes[1]) !== '') {
            return trim($partes[1]);
        }

        return 'optistock.site';
    }

    function obtenerUltimoErrorEnvioCorreo()
    {
        return $GLOBALS['__ultimo_error_envio_correo'] ?? null;
    }
}
