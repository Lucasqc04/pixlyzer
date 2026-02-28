import JSZip from 'jszip';

export async function exportImagesZip(uploads: { imageData: string | null, fileName: string | null, id: string }[], fileName = 'comprovantes.zip') {
  const zip = new JSZip();
  let count = 1;
  uploads.forEach(upload => {
    if (upload.imageData) {
      // Tenta usar o nome original, senão usa o id ou contador
      let name = upload.fileName || upload.id || `comprovante_${count}`;
      // Garante extensão .jpg
      if (!name.toLowerCase().endsWith('.jpg') && !name.toLowerCase().endsWith('.jpeg')) {
        name = name.replace(/\.[^/.]+$/, '') + '.jpg';
      }
      zip.file(name, upload.imageData, { base64: true });
      count++;
    }
  });
  const blob = await zip.generateAsync({ type: 'blob' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
}
