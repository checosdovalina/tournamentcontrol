import fs from 'fs';
import pdfParse from 'pdf-parse';

async function testPDF() {
  const pdfPath = process.argv[2] || 'attached_assets/download_1761546269670.pdf';
  
  const dataBuffer = fs.readFileSync(pdfPath);
  const data = await pdfParse(dataBuffer);
  
  const lines = data.text.split('\n');
  
  console.log('=== Primeras 150 líneas ===\n');
  lines.slice(0, 150).forEach((line, i) => {
    console.log(`${i + 1}: ${line}`);
  });
}

testPDF().catch(console.error);
