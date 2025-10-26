import * as XLSX from 'xlsx';
import * as fs from 'fs';

const buffer = fs.readFileSync('public/cronograma_25_oct.xlsx');
const workbook = XLSX.read(buffer);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];

// Convertir a JSON para ver los datos
const data = XLSX.utils.sheet_to_json(worksheet);

console.log('Total de filas:', data.length);
console.log('\nPrimeras 5 filas:');
console.log(JSON.stringify(data.slice(0, 5), null, 2));
