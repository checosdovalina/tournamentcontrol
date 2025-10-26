import * as XLSX from 'xlsx';
import * as fs from 'fs';

const buffer = fs.readFileSync('public/cronograma_25_oct.xlsx');
const workbook = XLSX.read(buffer);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];

// Convertir a JSON para ver los datos
const data = XLSX.utils.sheet_to_json(worksheet);

console.log('Buscando partido de SUMA 5 VARONIL a las 08:15...\n');

const match = data.find((row: any) => 
  row.Hora === '08:15' && 
  row['Categoría'] === 'SUMA 5 VARONIL'
);

if (match) {
  console.log('✓ PARTIDO ENCONTRADO:');
  console.log(JSON.stringify(match, null, 2));
} else {
  console.log('✗ NO ENCONTRADO');
  console.log('\nPartidos a las 08:15:');
  const matchesAt0815 = data.filter((row: any) => row.Hora === '08:15');
  console.log(JSON.stringify(matchesAt0815, null, 2));
}
