const XLSX = require('xlsx');
const fs = require('fs');

// Datos parseados del PDF del cronograma
const matches = [
  // 08:15
  { fecha: '2025-10-25', hora: '08:15', cancha: 'Cancha 1', categoria: 'TERCERA VARONIL', jornada: 'Jornada 1', pareja1: 'Manuel Ramirez / Chava Ruiz', pareja2: 'Jugador Por Definir / Jugador 47', grupo: 'Grupo I' },
  { fecha: '2025-10-25', hora: '08:15', cancha: 'Cancha 2', categoria: 'SUMA 3 FEMENIL', jornada: 'Jornada 1', pareja1: 'Alejandra Villalobos / Gaby Villarreal', pareja2: 'Ximena Robles / Romina Batarse', grupo: 'Grupo A' },
  { fecha: '2025-10-25', hora: '08:15', cancha: 'Cancha 3', categoria: 'TERCERA VARONIL', jornada: 'Jornada 1', pareja1: 'Claudio González / Fernando Alcazar', pareja2: 'Andres Trujillo / Emiliano Armendariz', grupo: 'Grupo G' },
  { fecha: '2025-10-25', hora: '08:15', cancha: 'Cancha 4', categoria: 'SENIORS 50+', jornada: 'Jornada 1', pareja1: 'Florencio Gil / Jorge Perez', pareja2: 'Venancio Garcia / Ricardo Ramirez', grupo: 'Grupo A' },
  
  // 09:30
  { fecha: '2025-10-25', hora: '09:30', cancha: 'Cancha 1', categoria: 'TERCERA VARONIL', jornada: 'Jornada 1', pareja1: 'Abraham Nahle / Rodolfo Bustos', pareja2: 'Sonrics Moreno / Volker Muller', grupo: 'Grupo F' },
  { fecha: '2025-10-25', hora: '09:30', cancha: 'Cancha 2', categoria: 'SUMA 9 FEMENIL', jornada: 'Jornada 1', pareja1: 'Ana Isabel / Graciela Alba', pareja2: 'Alejandra Martinez / Ana Sofia Cabral', grupo: 'Grupo A' },
  { fecha: '2025-10-25', hora: '09:30', cancha: 'Cancha 3', categoria: 'SUMA 3 FEMENIL', jornada: 'Jornada 1', pareja1: 'Leonor Carrillo / Ana lya Roman', pareja2: 'Begoña Zarragoicoechea / Eugenia Martinez', grupo: 'Grupo C' },
  { fecha: '2025-10-25', hora: '09:30', cancha: 'Cancha 4', categoria: 'SUMA 9 FEMENIL', jornada: 'Jornada 1', pareja1: 'Deby Medrano / Nadia V. Lizárraga', pareja2: 'Melissa Eugenia Baca / Betty Baca', grupo: 'Grupo C' },
  { fecha: '2025-10-25', hora: '09:30', cancha: 'Cancha 5', categoria: 'SUMA 7 VARONIL', jornada: 'Jornada 1', pareja1: 'Jorge Habib / Fernando Hernández', pareja2: 'adrián fernández / Camilo Chaúl', grupo: 'Grupo A' },
  { fecha: '2025-10-25', hora: '09:30', cancha: 'Cancha 6', categoria: 'QUINTA VARONIL', jornada: 'Jornada 2', pareja1: 'Rick Campbell / JORGE LÓPEZ AMOR', pareja2: 'Alberto Albores / Miguel Garcia', grupo: 'Grupo J' },
  
  // 10:45
  { fecha: '2025-10-25', hora: '10:45', cancha: 'Cancha 1', categoria: 'SUMA 9 FEMENIL', jornada: 'Jornada 1', pareja1: 'Paty Garcia / Marisol Montiel', pareja2: 'Milagros Angeli Martinez / Maria Valentina Galarza Hernández', grupo: 'Grupo E' },
  { fecha: '2025-10-25', hora: '10:45', cancha: 'Cancha 2', categoria: 'SUMA 9 FEMENIL', jornada: 'Jornada 1', pareja1: 'Sonia Anaya / Cecy Cardiel', pareja2: 'Irma Murguía / Norma Zacarias', grupo: 'Grupo B' },
  { fecha: '2025-10-25', hora: '10:45', cancha: 'Cancha 3', categoria: 'SUMA 3 FEMENIL', jornada: 'Jornada 2', pareja1: 'María Ximena García / Maria Roberta Rodríguez', pareja2: 'Susana Garza / Ana lucia Martinez', grupo: 'Grupo D' },
  { fecha: '2025-10-25', hora: '10:45', cancha: 'Cancha 4', categoria: 'TERCERA VARONIL', jornada: 'Jornada 1', pareja1: 'Marco Borbolla / Luis Arturo', pareja2: 'Héctor Hernandez / Letmar Yair Infante', grupo: 'Grupo C' },
  { fecha: '2025-10-25', hora: '10:45', cancha: 'Cancha 5', categoria: 'SEGUNDA VARONIL', jornada: 'Jornada 3', pareja1: 'Octavio Lopez / Rodrigo Medrano', pareja2: 'Jorge Serna / Alejandro Alvarez', grupo: 'Grupo B' },
  { fecha: '2025-10-25', hora: '10:45', cancha: 'Cancha 6', categoria: 'TERCERA VARONIL', jornada: 'Jornada 1', pareja1: 'Javier "Chipo" Cepeda / Pancho Ruiz', pareja2: 'Ismael Cepeda / Carlos "Mamirez Ramirez', grupo: 'Grupo A' },
  
  // 12:00
  { fecha: '2025-10-25', hora: '12:00', cancha: 'Cancha 1', categoria: 'SUMA 5 FEMENIL', jornada: 'Jornada 1', pareja1: 'Ana Karen González / Mariana Chávez', pareja2: 'Maria rosa Martinez / Ana Lucia Cepeda', grupo: 'Grupo A' },
  { fecha: '2025-10-25', hora: '12:00', cancha: 'Cancha 2', categoria: 'SUMA 9 FEMENIL', jornada: 'Jornada 1', pareja1: 'Aranza Russek / Maika Ramos', pareja2: 'Laura Georgina Martínez / Damara Morales', grupo: 'Grupo A' },
  { fecha: '2025-10-25', hora: '12:00', cancha: 'Cancha 3', categoria: 'SUMA 3 FEMENIL', jornada: 'Jornada 1', pareja1: 'Mafer Uribe / Marijose Mtz', pareja2: 'amina cassani / Andrea Quintero', grupo: 'Grupo B' },
  { fecha: '2025-10-25', hora: '12:00', cancha: 'Cancha 4', categoria: 'TERCERA VARONIL', jornada: 'Jornada 1', pareja1: 'Julio César Robles / Ignacio Flores', pareja2: 'Patricio García / Venancio Garcia', grupo: 'Grupo B' },
  { fecha: '2025-10-25', hora: '12:00', cancha: 'Cancha 5', categoria: 'SUMA 5 FEMENIL', jornada: 'Jornada 1', pareja1: 'Maria Emilia Ibarra / Tania Velazquez', pareja2: 'Bertha Patricia Aguilera / Estefanía Carreón', grupo: 'Grupo B' },
  
  // 13:15
  { fecha: '2025-10-25', hora: '13:15', cancha: 'Cancha 1', categoria: 'SUMA 7 VARONIL', jornada: 'Jornada 1', pareja1: 'Rick Campbell / Hector Rangel', pareja2: 'Yan Fuentes / Yoel Fuentes', grupo: 'Grupo H' },
  { fecha: '2025-10-25', hora: '13:15', cancha: 'Cancha 2', categoria: 'SUMA 3 VARONIL', jornada: 'Jornada 1', pareja1: 'Franco Orrin / Ricardo Castañeda', pareja2: 'Daniel Alejandr Ocegueda / Cesar Sosa', grupo: 'Grupo B' },
  { fecha: '2025-10-25', hora: '13:15', cancha: 'Cancha 3', categoria: 'SUMA 3 VARONIL', jornada: 'Jornada 1', pareja1: 'Diego Rivera / Jorge Chaúl', pareja2: 'Abraham "Abry" / marco antonio rodriguez', grupo: 'Grupo A' },
  { fecha: '2025-10-25', hora: '13:15', cancha: 'Cancha 4', categoria: 'SUMA 3 VARONIL', jornada: 'Jornada 1', pareja1: 'Manuel Ramirez / Patricio Martínez', pareja2: 'Jorge Chibli / Marco Estefania', grupo: 'Grupo F' },
  
  // 14:30
  { fecha: '2025-10-25', hora: '14:30', cancha: 'Cancha 1', categoria: 'CUARTA VARONIL', jornada: 'Jornada 1', pareja1: 'Diego Del Valle / Ignacio Flores', pareja2: 'Raúl Bautista / René Montiel', grupo: 'Grupo D' },
  { fecha: '2025-10-25', hora: '14:30', cancha: 'Cancha 2', categoria: 'SUMA 3 VARONIL', jornada: 'Jornada 1', pareja1: 'Iker Areco / José Andrés Chávez', pareja2: 'Mario Murguia / Emmanuel Saldaña', grupo: 'Grupo E' },
  { fecha: '2025-10-25', hora: '14:30', cancha: 'Cancha 3', categoria: 'SUMA 3 VARONIL', jornada: 'Jornada 1', pareja1: 'Patricio Gonzalez / Mauricio Batres', pareja2: 'German Madero / Ruben Zapico', grupo: 'Grupo D' },
  { fecha: '2025-10-25', hora: '14:30', cancha: 'Cancha 4', categoria: 'SUMA 7 VARONIL', jornada: 'Jornada 1', pareja1: 'Jose Roberto Avalos / Oscar Russek', pareja2: 'Shafee Etemad Amini / Diego Monroy', grupo: 'Grupo C' },
  { fecha: '2025-10-25', hora: '14:30', cancha: 'Cancha 5', categoria: 'SUMA 7 VARONIL', jornada: 'Jornada 1', pareja1: 'Alejandro Vazquez / Franco Vazquez', pareja2: 'Ricardo "Jr" Garza / Andres Garza', grupo: 'Grupo G' },
  { fecha: '2025-10-25', hora: '14:30', cancha: 'Cancha 6', categoria: 'SUMA 7 VARONIL', jornada: 'Jornada 1', pareja1: 'Ernesto Davila / Andres Trujillo', pareja2: 'Samuel Meza / Javier Meza', grupo: 'Grupo E' },
  
  // 15:45
  { fecha: '2025-10-25', hora: '15:45', cancha: 'Cancha 1', categoria: 'CUARTA VARONIL', jornada: 'Jornada 1', pareja1: 'Carlos Jasso / David Rangel', pareja2: 'Jorge Castro / Diego Rivas', grupo: 'Grupo A' },
  { fecha: '2025-10-25', hora: '15:45', cancha: 'Cancha 2', categoria: 'CUARTA VARONIL', jornada: 'Jornada 1', pareja1: 'Jose Eimbcke / Diego Lorda', pareja2: 'Paco Amezcua / David Rangel', grupo: 'Grupo F' },
  { fecha: '2025-10-25', hora: '15:45', cancha: 'Cancha 3', categoria: 'CUARTA VARONIL', jornada: 'Jornada 1', pareja1: 'Roberto Ibarra / Federico Garza', pareja2: 'Carlos Leal / Daniel De Jesus Ortiz', grupo: 'Grupo E' },
  { fecha: '2025-10-25', hora: '15:45', cancha: 'Cancha 4', categoria: 'CUARTA VARONIL', jornada: 'Jornada 1', pareja1: 'Ernesto Davila / Arturo Madero', pareja2: 'Fernando Gilio / Fernando Gilio', grupo: 'Grupo B' },
  { fecha: '2025-10-25', hora: '15:45', cancha: 'Cancha 5', categoria: 'CUARTA VARONIL', jornada: 'Jornada 1', pareja1: 'Jorge Humphrey / Ricardo "Jr" Moreno', pareja2: 'Eugenio Salazar / Carlos Monarrez', grupo: 'Grupo I' },
  { fecha: '2025-10-25', hora: '15:45', cancha: 'Cancha 6', categoria: 'SUMA 7 VARONIL', jornada: 'Jornada 1', pareja1: 'Pablo Galindo / Armando Valdez', pareja2: 'José carlos Casas / Fernando Pámanes', grupo: 'Grupo B' },
  
  // 17:00
  { fecha: '2025-10-25', hora: '17:00', cancha: 'Cancha 2', categoria: 'CUARTA VARONIL', jornada: 'Jornada 1', pareja1: 'Herminio Siller / Gustavo Acosta', pareja2: 'Adrián Gómez / Roberto Quezada', grupo: 'Grupo G' },
  { fecha: '2025-10-25', hora: '17:00', cancha: 'Cancha 3', categoria: 'SUMA 3 FEMENIL', jornada: 'Jornada 3', pareja1: 'María Ximena García / Maria Roberta Rodríguez', pareja2: 'Anilu Alvarado / Andrea Olivares', grupo: 'Grupo D' },
  
  // 18:15
  { fecha: '2025-10-25', hora: '18:15', cancha: 'Cancha 1', categoria: 'SUMA 1 VARONIL', jornada: 'Jornada 3', pareja1: 'Jose Govea / SEBASTIAN COBOS', pareja2: 'Exequiel Ruiz / Angel Ramos', grupo: 'Grupo B' },
  { fecha: '2025-10-25', hora: '18:15', cancha: 'Cancha 2', categoria: 'SUMA 7 FEMENIL', jornada: 'Jornada 1', pareja1: 'Olga Villarreal / Cecy Cardiel', pareja2: 'Andrea Jaidar / Regina Jaidar', grupo: 'Grupo A' },
  { fecha: '2025-10-25', hora: '18:15', cancha: 'Cancha 3', categoria: 'SUMA 1 VARONIL', jornada: 'Jornada 3', pareja1: 'Carlos Niño de rivera / Fernando Gonzalez', pareja2: 'Jorge Chibli / Carlos Barroso', grupo: 'Grupo C' },
  { fecha: '2025-10-25', hora: '18:15', cancha: 'Cancha 4', categoria: 'SUMA 5 VARONIL', jornada: 'Jornada 1', pareja1: 'Eduardo Madero / Jorge Chaúl', pareja2: 'El Javi Fuentes / Hector Becerra', grupo: 'Grupo C' },
  { fecha: '2025-10-25', hora: '18:15', cancha: 'Cancha 5', categoria: 'SUMA 5 VARONIL', jornada: 'Jornada 1', pareja1: 'Julio César Robles / Jesus Cobos', pareja2: 'Mauricio Guizar / Humberto Ruiz', grupo: 'Grupo F' },
  
  // 19:30
  { fecha: '2025-10-25', hora: '19:30', cancha: 'Cancha 1', categoria: 'SUMA 1 VARONIL', jornada: 'Jornada 3', pareja1: 'Marco Estefania / Andres Ollivier', pareja2: 'Artemio Avalos / Hugo Facio', grupo: 'Grupo A' },
  { fecha: '2025-10-25', hora: '19:30', cancha: 'Cancha 2', categoria: 'SUMA 5 VARONIL', jornada: 'Jornada 1', pareja1: 'Martin Eduardo García / Alan Cepeda', pareja2: 'Bernardo Batarse / Rolando Jr Noyola', grupo: 'Grupo G' },
  { fecha: '2025-10-25', hora: '19:30', cancha: 'Cancha 3', categoria: 'QUINTA VARONIL', jornada: 'Jornada 1', pareja1: 'Salvador Martínez / Miguel Rios', pareja2: 'Jorge Arturo Rivera / Jorge Arturo Rivera', grupo: 'Grupo G' },
  { fecha: '2025-10-25', hora: '19:30', cancha: 'Cancha 4', categoria: 'QUINTA VARONIL', jornada: 'Jornada 1', pareja1: 'Fernando Salmones / Jorge Iparrea', pareja2: 'Miguel Rangel / Hector Cobos', grupo: 'Grupo C' },
  { fecha: '2025-10-25', hora: '19:30', cancha: 'Cancha 5', categoria: 'QUINTA VARONIL', jornada: 'Jornada 1', pareja1: 'Bryant Lagunas / Hector Limones', pareja2: 'Alberto Albores / Miguel Garcia', grupo: 'Grupo J' },
  { fecha: '2025-10-25', hora: '19:30', cancha: 'Cancha 6', categoria: 'SUMA 5 VARONIL', jornada: 'Jornada 1', pareja1: 'Carlos Manjarrez / Emiliano Sánchez', pareja2: 'Artemio Avalos / Jose Roberto Avalos', grupo: 'Grupo D' },
];

// Crear el archivo Excel
const worksheet = XLSX.utils.json_to_sheet(matches);
const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, worksheet, 'Cronograma');

// Guardar el archivo
XLSX.writeFile(workbook, 'cronograma_torneo_parque_espana.xlsx');

console.log('✅ Archivo Excel generado exitosamente: cronograma_torneo_parque_espana.xlsx');
console.log(`📊 Total de partidos: ${matches.length}`);
