<?php
if (!function_exists('inicializarRespuestaJson')) {
    /**
     * Prepara el entorno para responder con JSON sin exponer errores HTML.
     *
     * @return callable Función que restaura el manejador de errores previo.
     */
    function inicializarRespuestaJson(): callable
    {
        if (!headers_sent()) {
            header('Content-Type: application/json; charset=UTF-8');
        }

        ini_set('display_errors', '0');
        error_reporting(E_ALL);

        if (function_exists('mysqli_report')) {
            mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
        }

        $anterior = set_error_handler(function ($severity, $message, $file, $line) {
            if (!(error_reporting() & $severity)) {
                return false;
            }

            throw new ErrorException($message, 0, $severity, $file, $line);
        });

        return function () use ($anterior): void {
            if ($anterior !== null) {
                set_error_handler($anterior);
            } else {
                restore_error_handler();
            }
        };
    }
}

if (!function_exists('finalizarRespuestaJson')) {
    /**
     * Envía el arreglo indicado como respuesta JSON.
     */
    function finalizarRespuestaJson(array $respuesta): void
    {
        if (!headers_sent()) {
            header('Content-Type: application/json; charset=UTF-8');
        }

        echo json_encode($respuesta);
    }
}

if (!function_exists('mensajeErrorInterno')) {
    /**
     * Mensaje genérico para errores no controlados.
     */
    function mensajeErrorInterno(): string
    {
        return 'Ocurrió un error interno. Inténtalo de nuevo más tarde.';
    }
}
