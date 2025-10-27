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

// Parser para formato "tabla" (PDF vertical con VS)
export async function parseTableFormatPDF(buffer: Buffer): Promise<Match[]> {
  const { PDFParse } = await import('pdf-parse');
  const parser = new PDFParse({ data: buffer });
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
    
    // Detectar hora
    const horaMatch = line.match(/^(\d{2}:\d{2})/);
    if (horaMatch) {
      currentHora = horaMatch[1];
    }
    
    // Detectar categoría
    const categoriaMatch = line.match(/(SUMA \d+ \w+|CUARTA \w+|QUINTA \w+|TERCERA \w+|SEGUNDA \w+|PRIMERA \w+|SENIORS 50\+)/);
    if (categoriaMatch && currentHora) {
      const categoria = categoriaMatch[1];
      
      let jornada = '';
      if (i + 1 < lines.length && lines[i + 1].includes('Jornada')) {
        jornada = lines[i + 1];
      }
      
      const jugadores: string[] = [];
      let j = i + 2;
      let foundVS = false;
      
      while (j < lines.length && jugadores.length < 4) {
        const jugadorLine = lines[j];
        
        if (jugadorLine === 'VS') {
          foundVS = true;
          j++;
          continue;
        }
        
        if (jugadorLine.includes('Grupo') || jugadorLine.match(/^\d{2}:\d{2}/)) {
          break;
        }
        
        if (jugadorLine && !jugadorLine.includes('Jornada')) {
          jugadores.push(jugadorLine);
        }
        
        j++;
      }
      
      if (jugadores.length >= 4 && foundVS) {
        matches.push({
          fecha: currentDate,
          hora: currentHora,
          cancha: 'Múltiples canchas',
          categoria,
          jornada,
          pareja1Jugador1: jugadores[0],
          pareja1Jugador2: jugadores[1],
          pareja2Jugador1: jugadores[2],
          pareja2Jugador2: jugadores[3],
        });
      }
    }
  }
  
  return matches;
}

// Parser para formato "tarjeta" (PDF con layout lado a lado)
export async function parseCardFormatPDF(buffer: Buffer): Promise<Match[]> {
  const { PDFParse } = await import('pdf-parse');
  const parser = new PDFParse({ data: buffer });
  const data = await parser.getText();
  
  const lines = data.text.split('\n');
  const matches: Match[] = [];
  
  let fecha = '';
  for (let i = 0; i < Math.min(20, lines.length); i++) {
    const dateMatch = lines[i].match(/(\d{4}-\d{2}-\d{2})/);
    if (dateMatch) {
      fecha = dateMatch[1];
      break;
    }
  }
  
  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    
    const horaMatch = line.match(/^Hora:\s*(\d{1,2}:\d{2}\s*[AP]M)\s+Cancha\s*#(\d+)/);
    
    if (horaMatch) {
      const hora = horaMatch[1];
      const cancha = `Cancha #${horaMatch[2]}`;
      
      const blockStart = Math.max(0, i - 10);
      const block = lines.slice(blockStart, i);
      
      const match = parseMatchBlock(block, fecha, hora, cancha);
      if (match) {
        matches.push(match);
      }
    }
    
    i++;
  }
  
  return matches;
}

function parseMatchBlock(block: string[], fecha: string, hora: string, cancha: string): Match | null {
  try {
    const cleanBlock = block.filter(l => l.trim()).map(l => l.trim());
    
    let categoria = '';
    let jornada = '';
    const jugadores: string[] = [];
    
    for (let i = 0; i < cleanBlock.length; i++) {
      const line = cleanBlock[i];
      
      const jornadaMatch = line.match(/RR-J\d+/);
      if (jornadaMatch && !jornada) {
        jornada = jornadaMatch[0];
      }
      
      if (!categoria) {
        const catMatch = line.match(/(SUMA \d+|CUARTA|QUINTA|TERCERA|SEGUNDA|PRIMERA|SEXTA KIDS|SEPTIMA KIDS|SENIORS 50\+|MASTER)/i);
        if (catMatch) {
          categoria = catMatch[1];
          
          if (i + 1 < cleanBlock.length) {
            const nextLine = cleanBlock[i + 1];
            if (nextLine.match(/^(FEMENIL|VARONIL)$/i)) {
              categoria += ` ${nextLine}`;
            }
          }
        }
      }
      
      const isSystemLine = line.match(/(SUMA|CUARTA|QUINTA|TERCERA|SEGUNDA|PRIMERA|SEXTA|SEPTIMA|SENIORS|MASTER|FEMENIL|VARONIL|PARQUE|ESPAÑA|EL CLUBSITO|LAS VILLAS|PLAY PADEL|RR-J\d+)/i);
      
      if (!isSystemLine && line.length > 2 && jugadores.length < 4) {
        const nombreLimpio = line.replace(/\s*-\s*$/, '').trim();
        if (nombreLimpio) {
          jugadores.push(nombreLimpio);
        }
      }
    }
    
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
    return null;
  }
}

// Función principal que intenta ambos parsers
export async function convertPDFToExcel(buffer: Buffer): Promise<Buffer> {
  // Intentar primero formato tarjeta
  let matches = await parseCardFormatPDF(buffer);
  
  // Si no extrajo nada, intentar formato tabla
  if (matches.length === 0) {
    matches = await parseTableFormatPDF(buffer);
  }
  
  // Si aún no extrajo nada, lanzar error
  if (matches.length === 0) {
    throw new Error('No se pudieron extraer partidos del PDF. Verifica que el formato sea correcto.');
  }
  
  // Convertir a Excel
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
  
  // Retornar buffer del Excel
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}
