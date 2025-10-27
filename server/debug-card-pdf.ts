import * as fs from 'fs';

async function debugPDF() {
  const { PDFParse } = await import('pdf-parse');
  const dataBuffer = fs.readFileSync('attached_assets/download_1761546269670.pdf');
  const parser = new PDFParse({ data: dataBuffer });
  const data = await parser.getText();
  
  const lines = data.text.split('\n');
  
  console.log('=== Buscando líneas con "Hora:" ===\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('Hora:')) {
      console.log(`\n--- Línea ${i} ---`);
      console.log(`[${i-10}]: ${lines[i-10]}`);
      console.log(`[${i-5}]: ${lines[i-5]}`);
      console.log(`[${i-1}]: ${lines[i-1]}`);
      console.log(`[${i}]: ${lines[i]}`); // <- Línea de Hora
      console.log(`[${i+1}]: ${lines[i+1]}`);
      
      if (i > 100) break; // Solo primeros partidos
    }
  }
}

debugPDF().catch(console.error);
