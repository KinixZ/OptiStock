const empresaId = 1; // Ajustar según la empresa

const html5QrCode = new Html5Qrcode('reader');
html5QrCode.start(
  { facingMode: 'environment' },
  { fps: 10, qrbox: 250 },
  async decodedText => {
    await html5QrCode.stop();
    const productoId = parseInt(decodedText, 10);
    const movimientoPayload = { empresa_id: empresaId, producto_id: productoId, tipo: 'ingreso', cantidad: 1 };
    fetch('../../scripts/php/guardar_movimientos.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(movimientoPayload)
    })
    .then(r => {
      if (!r.ok) throw new Error('Error HTTP al registrar movimiento');
      return r.json();
    })
    .then(result => {
      if (result?.success !== true) {
        throw new Error(result?.error || 'No se pudo registrar el movimiento');
      }
      alert('Movimiento registrado');
      document.dispatchEvent(new CustomEvent('movimientoRegistrado', {
        detail: {
          productoId: productoId,
          tipo: movimientoPayload.tipo,
          cantidad: movimientoPayload.cantidad,
          stockActual: result.stock_actual ?? null
        }
      }));
    })
    .catch(error => {
      console.error(error);
      alert('Error al registrar movimiento');
    });
  },
  err => console.log(err)
);
