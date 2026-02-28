
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';

function formatExportDate(date: any) {
  if (!date) return '';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('pt-BR');
}

export function exportToXLSX(data: any[], fields: string[], fileName = 'pixlyzer-uploads.xlsx') {
  const filtered = data.map(row => {
    const obj: any = {};
    fields.forEach(f => {
      if (f === 'data' || f === 'createdAt') obj[f] = formatExportDate(row[f]);
      else obj[f] = row[f];
    });
    return obj;
  });
  const ws = XLSX.utils.json_to_sheet(filtered);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Uploads');
  XLSX.writeFile(wb, fileName);
}

export function exportToJSON(data: any[], fields: string[], fileName = 'pixlyzer-uploads.json') {
  const filtered = data.map(row => {
    const obj: any = {};
    fields.forEach(f => {
      if (f === 'data' || f === 'createdAt') obj[f] = formatExportDate(row[f]);
      else obj[f] = row[f];
    });
    return obj;
  });
  const blob = new Blob([JSON.stringify(filtered, null, 2)], { type: 'application/json' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
}

export async function exportToPDF(data: any[], fields: string[], fileName = 'pixlyzer-uploads.pdf') {
  const doc = new jsPDF();
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 10;
    let y = margin;

    // Informações no topo, compactas
    fields.forEach((f, idx) => {
      let value = row[f];
      if (f === 'data' || f === 'createdAt') value = formatExportDate(value);
      doc.text(`${f}: ${value ?? ''}`.substring(0, 80), margin, y);
      y += 7; // mais compacto
    });

    // Imagem centralizada abaixo das informações
    if (row.imageData) {
      try {
        const img = new window.Image();
        img.src = `data:image/jpeg;base64,${row.imageData}`;
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
        });
        // Espaço entre info e imagem
        y += 5;
        // Definir área máxima para imagem (abaixo das infos até o final da página)
        const maxImgWidth = pageWidth - margin * 2;
        const maxImgHeight = pageHeight - y - margin;
        let imgWidth = img.width;
        let imgHeight = img.height;
        // Ajustar proporção
        const widthRatio = maxImgWidth / imgWidth;
        const heightRatio = maxImgHeight / imgHeight;
        const ratio = Math.min(widthRatio, heightRatio, 1);
        imgWidth = imgWidth * ratio;
        imgHeight = imgHeight * ratio;
        // Centralizar horizontalmente
        const imgX = margin + (maxImgWidth - imgWidth) / 2;
        const imgY = y;
        doc.addImage(img, 'JPEG', imgX, imgY, imgWidth, imgHeight);
      } catch (e) {
        // fallback: não renderiza imagem
      }
    }
    if (i < data.length - 1) doc.addPage();
  }
  doc.save(fileName);
}
