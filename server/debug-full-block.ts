import * as fs from 'fs';

async function debugPDF() {
  const { PDFParse } = await import('pdf-parse');
  const dataBuffer = fs.readFileSync('attached_assets/download_1761546269670.pdf');
  const parser = new PDFParse({ data: dataBuffer });
  const data = await parser.getText();
  
  const lines = data.text.split('\n');
  
  console.log('=== PRIMER BLOQUE COMPLETO (líneas 0-20) ===\n');
  for (let i = 0; i < 25; i++) {
    console.log(`[${i}]: ${lines[i]}`);
  }
}

debugPDF().catch(console.error);
