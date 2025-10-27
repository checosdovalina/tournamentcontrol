import fs from 'fs';
import * as pdfParse from 'pdf-parse';

async function analyzePDF() {
  const pdfPath = 'attached_assets/download_1761546269670.pdf';
  
  const dataBuffer = fs.readFileSync(pdfPath);
  const data = await pdfParse.default(dataBuffer);
  
  const lines = data.text.split('\n').filter(l => l.trim());
  
  console.log('=== Primeras 80 líneas ===\n');
  for (let i = 0; i < Math.min(80, lines.length); i++) {
    console.log(`${i}: ${lines[i]}`);
  }
}

analyzePDF().catch(console.error);
