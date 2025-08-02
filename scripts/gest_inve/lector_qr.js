const empresaId = 1; // Ajustar según la empresa

const html5QrCode = new Html5Qrcode('reader');
html5QrCode.start(
  { facingMode: 'environment' },
  { fps: 10, qrbox: 250 },
  async decodedText => {
    await html5QrCode.stop();
    const productoId = parseInt(decodedText, 10);
    fetch('../../scripts/php/guardar_movimientos.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ empresa_id: empresaId, producto_id: productoId, tipo: 'ingreso', cantidad: 1 })
    })
    .then(r => r.json())
    .then(() => alert('Movimiento registrado'))
    .catch(() => alert('Error al registrar movimiento'));
  },
  err => console.log(err)
);
