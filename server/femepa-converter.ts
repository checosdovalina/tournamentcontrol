import * as XLSX from "xlsx";

export function convertFemepaxToCourtFlow(buffer: Buffer): Buffer {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

  const outputRows: any[][] = [
    ["Fecha", "Hora", "Jugador1Pareja1", "Jugador2Pareja1", "Jugador1Pareja2", "Jugador2Pareja2", "Categoría", "Formato"],
  ];

  // Row 0 = title, Row 1 = headers, data starts at Row 2
  for (let i = 2; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length < 6) continue;

    const torCatNum = (row[0] || "").toString().trim();
    const fechaStr = (row[2] || "").toString().trim();
    const equipo1 = (row[4] || "").toString().trim();
    const equipo2 = (row[5] || "").toString().trim();

    if (!torCatNum || !fechaStr || !equipo1 || !equipo2) continue;

    // Extract category: remove tournament prefix (up to year-####) and #NUM suffix
    // e.g. "SECCIONAL-NORESTE-2026 1VAR GRUPO UNICO #3" → "1VAR GRUPO UNICO"
    const catMatch = torCatNum.match(/^.*?-\d{4}\s+(.+?)\s+#\d+$/);
    const category = catMatch ? catMatch[1] : "";

    // Parse date: "vie 13/03/26 21:45" → "13/03/2026" + "21:45"
    const dateTimeMatch = fechaStr.match(/\S+\s+(\d{2})\/(\d{2})\/(\d{2})\s+(\d{2}:\d{2})/);
    if (!dateTimeMatch) continue;

    const [, day, month, year2d, time] = dateTimeMatch;
    const fecha = `${day}/${month}/20${year2d}`;

    // Split players by " y "
    const pair1 = equipo1.split(" y ");
    const pair2 = equipo2.split(" y ");

    if (pair1.length < 2 || pair2.length < 2) continue;

    outputRows.push([
      fecha,
      time,
      pair1[0].trim(),
      pair1[1].trim(),
      pair2[0].trim(),
      pair2[1].trim(),
      category,
      "",
    ]);
  }

  const newWorkbook = XLSX.utils.book_new();
  const newWorksheet = XLSX.utils.aoa_to_sheet(outputRows);
  XLSX.utils.book_append_sheet(newWorkbook, newWorksheet, "Partidos");

  return XLSX.write(newWorkbook, { type: "buffer", bookType: "xlsx" });
}
