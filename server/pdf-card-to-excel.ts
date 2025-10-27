import * as fs from 'fs';
import * as XLSX from 'xlsx';

interface Match {
  fecha: string;
  hora: string;
  cancha: string;
  categoria: string;
  jornada: string;
  pareja1Jugador1: string;
  pareja1Jugador2: string;
  pareja2Jugador1: string;
  pareja2Jugador2: string;
}

async function convertPDFToExcel(pdfPath: string, excelPath: string) {
  const { PDFParse } = await import('pdf-parse');
  const dataBuffer = fs.readFileSync(pdfPath);
  const parser = new PDFParse({ data: dataBuffer });
  const data = await parser.getText();
  
  const lines = data.text.split('\n');
  const matches: Match[] = [];
  
  // Buscar fecha en el encabezado
  let fecha = '';
  for (let i = 0; i < Math.min(20, lines.length); i++) {
    const dateMatch = lines[i].match(/(\d{4}-\d{2}-\d{2})/);
    if (dateMatch) {
      fecha = dateMatch[1];
      break;
    }
  }
  
  // Procesar líneas buscando el patrón de partido
  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    
    // Buscar línea de hora que indica el final de un partido
    const horaMatch = line.match(/^Hora:\s*(\d{1,2}:\d{2}\s*[AP]M)\s+Cancha\s*#(\d+)/);
    
    if (horaMatch) {
      const hora = horaMatch[1];
      const cancha = `Cancha #${horaMatch[2]}`;
      
      // Retroceder para capturar el bloque del partido (aprox 8-10 líneas atrás)
      const blockStart = Math.max(0, i - 10);
      const block = lines.slice(blockStart, i);
      
      // Parsear el bloque
      const match = parseMatchBlock(block, fecha, hora, cancha);
      if (match) {
        matches.push(match);
      }
    }
    
    i++;
  }
  
  // Convertir a formato Excel
  const worksheetData = matches.map(m => ({
    'Fecha': m.fecha,
    'Hora': m.hora,
    'Cancha': m.cancha,
    'Categoría': m.categoria,
    'Jornada': m.jornada,
    'Pareja 1 - Jugador 1': m.pareja1Jugador1,
    'Pareja 1 - Jugador 2': m.pareja1Jugador2,
    'Pareja 2 - Jugador 1': m.pareja2Jugador1,
    'Pareja 2 - Jugador 2': m.pareja2Jugador2,
  }));
  
  const worksheet = XLSX.utils.json_to_sheet(worksheetData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Partidos');
  XLSX.writeFile(workbook, excelPath);
  
  console.log(`✓ Extraídos ${matches.length} partidos del PDF`);
  console.log(`✓ Excel generado: ${excelPath}`);
}

function parseMatchBlock(block: string[], fecha: string, hora: string, cancha: string): Match | null {
  try {
    // Filtrar líneas vacías y limpiar
    const cleanBlock = block.filter(l => l.trim()).map(l => l.trim());
    
    // Buscar categoría (puede estar en 1 o 2 líneas)
    let categoria = '';
    let jornada = '';
    const jugadores: string[] = [];
    
    for (let i = 0; i < cleanBlock.length; i++) {
      const line = cleanBlock[i];
      
      // Detectar jornada (formato: "ESPAÑA RR-J1" o solo "RR-J1")
      const jornadaMatch = line.match(/RR-J\d+/);
      if (jornadaMatch && !jornada) {
        jornada = jornadaMatch[0];
      }
      
      // Detectar categoría (palabras clave)
      if (!categoria) {
        const catMatch = line.match(/(SUMA \d+|CUARTA|QUINTA|TERCERA|SEGUNDA|PRIMERA|SEXTA KIDS|SEPTIMA KIDS|SENIORS 50\+|MASTER)/i);
        if (catMatch) {
          // Construir categoría completa mirando la siguiente línea
          categoria = catMatch[1];
          
          // Si la siguiente línea es FEMENIL o VARONIL, agregarla
          if (i + 1 < cleanBlock.length) {
            const nextLine = cleanBlock[i + 1];
            if (nextLine.match(/^(FEMENIL|VARONIL)$/i)) {
              categoria += ` ${nextLine}`;
            }
          }
        }
      }
      
      // Detectar jugadores (líneas que NO contienen palabras clave de sistema)
      const isSystemLine = line.match(/(SUMA|CUARTA|QUINTA|TERCERA|SEGUNDA|PRIMERA|SEXTA|SEPTIMA|SENIORS|MASTER|FEMENIL|VARONIL|PARQUE|ESPAÑA|EL CLUBSITO|LAS VILLAS|PLAY PADEL|RR-J\d+)/i);
      
      if (!isSystemLine && line.length > 2 && jugadores.length < 4) {
        // Limpiar el nombre del jugador (quitar el "-" al final si existe)
        const nombreLimpio = line.replace(/\s*-\s*$/, '').trim();
        if (nombreLimpio) {
          jugadores.push(nombreLimpio);
        }
      }
    }
    
    // Validar que tenemos los datos completos
    if (categoria && jornada && jugadores.length >= 4) {
      return {
        fecha,
        hora,
        cancha,
        categoria: categoria.trim(),
        jornada: jornada.trim(),
        pareja1Jugador1: jugadores[0],
        pareja1Jugador2: jugadores[1],
        pareja2Jugador1: jugadores[2],
        pareja2Jugador2: jugadores[3],
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error parsing block:', error);
    return null;
  }
}

// Main execution
const pdfPath = process.argv[2];
const excelPath = process.argv[3];

if (!pdfPath || !excelPath) {
  console.error('Uso: npx tsx server/pdf-card-to-excel.ts <archivo.pdf> <salida.xlsx>');
  process.exit(1);
}

convertPDFToExcel(pdfPath, excelPath).catch(console.error);
