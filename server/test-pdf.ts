import * as fs from 'fs';

async function testPDF() {
  const { PDFParse } = await import('pdf-parse');
  const dataBuffer = fs.readFileSync('attached_assets/Cronograma_25 OCT 2.0_1761454959399.pdf');
  const parser = new PDFParse({ data: dataBuffer });
  const data = await parser.getText();
  
  console.log('=== TEXT EXTRAÍDO DEL PDF ===');
  console.log(data.text);
  console.log('\n=== LÍNEAS ===');
  const lines = data.text.split('\n').filter((l: string) => l.trim());
  lines.forEach((line: string, idx: number) => {
    console.log(`${idx}: "${line.trim()}"`);
  });
}

testPDF();
