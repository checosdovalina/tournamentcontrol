import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

interface Match {
  fecha: string;
  hora: string;
  cancha: string;
  categoria: string;
  jornada: string;
  pareja1_j1: string;
  pareja1_j2: string;
  pareja2_j1: string;
  pareja2_j2: string;
}

async function parsePDFSchedule(pdfPath: string): Promise<Match[]> {
  const { PDFParse } = await import('pdf-parse');
  const dataBuffer = fs.readFileSync(pdfPath);
  const parser = new PDFParse({ data: dataBuffer });
  const data = await parser.getText();
  
  const matches: Match[] = [];
  const lines = data.text.split('\n').map((line: string) => line.trim()).filter((line: string) => line.length > 0);
  
  let currentDate = '';
  let currentHora = '';
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Extraer fecha
    if (line.includes('Fecha:')) {
      const dateMatch = line.match(/Fecha:\s*(\d{4}-\d{2}-\d{2})/);
      if (dateMatch) {
        currentDate = dateMatch[1];
      }
    }
    
    // Detectar hora (formato HH:MM seguido posiblemente de categorías)
    const horaMatch = line.match(/^(\d{2}:\d{2})/);
    if (horaMatch) {
      currentHora = horaMatch[1];
    }
    
    // Detectar categoría (al inicio O después de la hora)
    const categoriaMatch = line.match(/(SUMA \d+ \w+|CUARTA \w+|QUINTA \w+|TERCERA \w+|SEGUNDA \w+|PRIMERA \w+|SEXTA KIDS|SEPTIMA KIDS|KIDS \w+|SENIORS 50\+|MASTER)/);
    if (categoriaMatch && currentHora) {
      const categoria = categoriaMatch[1];
      
      // Buscar jornada (siguiente línea)
      let jornada = '';
      if (i + 1 < lines.length && lines[i + 1].includes('Jornada')) {
        jornada = lines[i + 1];
      }
      
      // Extraer jugadores - después de jornada hasta "Grupo"
      let jugadores: string[] = [];
      let j = i + 2; // Empezamos después de "Jornada X"
      
      while (j < lines.length) {
        const currentLine = lines[j];
        
        // Terminar si encontramos "Grupo"
        if (currentLine.includes('Grupo')) {
          break;
        }
        
        // Saltar "VS"
        if (currentLine === 'VS') {
          j++;
          continue;
        }
        
        // Saltar si es otra categoría o hora
        if (currentLine.match(/^(SUMA|CUARTA|QUINTA|TERCERA|SEGUNDA|PRIMERA|SEXTA|SEPTIMA|KIDS|SENIORS|MASTER|Cancha|Jornada|\d{2}:\d{2}|Hora)/)) {
          break;
        }
        
        // Agregar nombre de jugador
        jugadores.push(currentLine);
        j++;
      }
      
      // Si tenemos al menos 4 jugadores, crear el match
      if (jugadores.length >= 4) {
        matches.push({
          fecha: currentDate,
          hora: currentHora,
          cancha: 'Múltiples canchas', // El PDF muestra varios partidos en la misma hora
          categoria: categoria,
          jornada: jornada,
          pareja1_j1: jugadores[0] || '',
          pareja1_j2: jugadores[1] || '',
          pareja2_j1: jugadores[2] || '',
          pareja2_j2: jugadores[3] || '',
        });
      }
      
      // NO avanzar el índice aquí - dejar que el for loop continúe normalmente
      // Esto permite procesar múltiples partidos en la misma hora
    }
  }
  
  return matches;
}

function generateExcel(matches: Match[], outputPath: string): void {
  // Transformar a formato más legible para Excel
  const excelData = matches.map(match => ({
    'Fecha': match.fecha,
    'Hora': match.hora,
    'Cancha': match.cancha,
    'Categoría': match.categoria,
    'Jornada': match.jornada,
    'Pareja 1 - Jugador 1': match.pareja1_j1,
    'Pareja 1 - Jugador 2': match.pareja1_j2,
    'Pareja 2 - Jugador 1': match.pareja2_j1,
    'Pareja 2 - Jugador 2': match.pareja2_j2,
  }));
  
  // Crear workbook
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(excelData);
  
  // Ajustar ancho de columnas
  const colWidths = [
    { wch: 12 }, // Fecha
    { wch: 8 },  // Hora
    { wch: 10 }, // Cancha
    { wch: 20 }, // Categoría
    { wch: 12 }, // Jornada
    { wch: 25 }, // Pareja 1 - Jugador 1
    { wch: 25 }, // Pareja 1 - Jugador 2
    { wch: 25 }, // Pareja 2 - Jugador 1
    { wch: 25 }, // Pareja 2 - Jugador 2
  ];
  ws['!cols'] = colWidths;
  
  XLSX.utils.book_append_sheet(wb, ws, 'Cronograma');
  XLSX.writeFile(wb, outputPath);
}

export { parsePDFSchedule, generateExcel };

// Ejecutar si se llama directamente
const pdfPath = process.argv[2];
const outputPath = process.argv[3] || 'cronograma.xlsx';

if (pdfPath) {
  parsePDFSchedule(pdfPath)
    .then(matches => {
      console.log(`✓ Extraídos ${matches.length} partidos del PDF`);
      generateExcel(matches, outputPath);
      console.log(`✓ Excel generado: ${outputPath}`);
    })
    .catch(err => {
      console.error('Error:', err);
      process.exit(1);
    });
} else {
  console.error('Uso: tsx server/pdf-to-excel.ts <ruta-al-pdf> [ruta-salida.xlsx]');
}
