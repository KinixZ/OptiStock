// Script para manejar el log de control
const filtroModulo = document.getElementById('filtroModulo');
const filtroUsuario = document.getElementById('filtroUsuario');
const filtroRol = document.getElementById('filtroRol');
const tablaBody = document.getElementById('logTableBody');
const exportPdfBtn = document.getElementById('exportPdf');
const exportExcelBtn = document.getElementById('exportExcel');

let registros = [];

async function cargarRegistros() {
    try {
        const params = new URLSearchParams();
        if (filtroModulo.value) params.append('modulo', filtroModulo.value);
        if (filtroUsuario.value) params.append('usuario', filtroUsuario.value);
        if (filtroRol.value) params.append('rol', filtroRol.value);

        const res = await fetch(`/scripts/php/get_logs.php?${params.toString()}`);
        const data = await res.json();
        if (data.success) {
            registros = data.logs;
            mostrarRegistros(registros);
        }
    } catch (err) {
        console.error('Error cargando logs', err);
    }
}

function mostrarRegistros(datos) {
    tablaBody.innerHTML = '';
    datos.forEach(reg => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${reg.fecha}</td>
            <td>${reg.hora}</td>
            <td>${reg.usuario}</td>
            <td>${reg.rol}</td>
            <td>${reg.modulo}</td>
            <td>${reg.accion}</td>
        `;
        tablaBody.appendChild(tr);
    });
}

[filtroModulo, filtroUsuario, filtroRol].forEach(el => {
    el.addEventListener('change', cargarRegistros);
});

document.addEventListener('DOMContentLoaded', cargarRegistros);

exportPdfBtn.addEventListener('click', () => {
    const doc = new jspdf.jsPDF();
    doc.autoTable({ html: '#logTable' });
    doc.save('logs.pdf');
});

exportExcelBtn.addEventListener('click', () => {
    const wb = XLSX.utils.table_to_book(document.getElementById('logTable'));
    XLSX.writeFile(wb, 'logs.xlsx');
});
