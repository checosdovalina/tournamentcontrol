import * as XLSX from 'xlsx';

const workbook = XLSX.readFile('public/cronograma_27_oct.xlsx');
const worksheet = workbook.Sheets['Partidos'];
const data = XLSX.utils.sheet_to_json(worksheet);

console.log(`Total de partidos extraídos: ${data.length}\n`);
console.log('=== Primeros 3 partidos ===\n');
data.slice(0, 3).forEach((row: any, i: number) => {
  console.log(`Partido ${i + 1}:`);
  console.log(`  Fecha: ${row['Fecha']}`);
  console.log(`  Hora: ${row['Hora']}`);
  console.log(`  Cancha: ${row['Cancha']}`);
  console.log(`  Categoría: ${row['Categoría']}`);
  console.log(`  Jornada: ${row['Jornada']}`);
  console.log(`  Pareja 1: ${row['Pareja 1 - Jugador 1']} + ${row['Pareja 1 - Jugador 2']}`);
  console.log(`  Pareja 2: ${row['Pareja 2 - Jugador 1']} + ${row['Pareja 2 - Jugador 2']}`);
  console.log('');
});

console.log('=== Últimos 2 partidos ===\n');
data.slice(-2).forEach((row: any, i: number) => {
  console.log(`Partido ${data.length - 1 + i}:`);
  console.log(`  ${row['Hora']} - ${row['Categoría']} (${row['Jornada']})`);
  console.log(`  ${row['Pareja 1 - Jugador 1']} + ${row['Pareja 1 - Jugador 2']}`);
  console.log(`  VS`);
  console.log(`  ${row['Pareja 2 - Jugador 1']} + ${row['Pareja 2 - Jugador 2']}`);
  console.log('');
});
