import { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download, Upload, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Mode = "pdf" | "femepa";

const MODES = {
  pdf: {
    label: "PDF a Excel",
    description: "Convierte cronogramas de torneos en PDF a formato Excel para importar partidos",
    accept: ".pdf,application/pdf",
    acceptLabel: "PDF",
    endpoint: (base: string) => base,
    hint: [
      "Cronogramas en formato tabla vertical con \"VS\"",
      "Cronogramas en formato tarjetas lado a lado",
      "El PDF debe contener: fecha, hora, cancha, categoría y nombres de jugadores",
    ],
    outputName: (name: string) => `cronograma_${name.replace('.pdf', '')}.xlsx`,
  },
  femepa: {
    label: "FEMEPA",
    description: "Convierte el listado de partidos exportado de Femepa.app al formato de CourtFlow",
    accept: ".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    acceptLabel: "Excel (.xlsx)",
    endpoint: () => "/api/admin/convert-femepa-excel",
    hint: [
      "Exporta el listado desde Femepa.app como Excel",
      "El archivo debe tener columnas: Tor/Cat/Núm, Sede, Fecha, Resultado, Equipo uno, Equipo dos",
      "El resultado será un Excel listo para importar en CourtFlow",
    ],
    outputName: (name: string) => `partidos_courtflow_${name.replace('.xlsx', '')}.xlsx`,
  },
};

export default function PDFConverterCard({ endpoint = '/api/admin/convert-pdf-to-excel' }: { endpoint?: string }) {
  const [mode, setMode] = useState<Mode>("pdf");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const config = MODES[mode];

  const handleModeChange = (newMode: Mode) => {
    setMode(newMode);
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
  };

  const handleConvert = async () => {
    if (!selectedFile) {
      toast({ title: "Sin archivo", description: "Por favor selecciona un archivo primero", variant: "destructive" });
      return;
    }

    setIsConverting(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const url = config.endpoint(endpoint);
      const response = await fetch(url, { method: 'POST', body: formData, credentials: 'include' });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error al convertir');
      }

      const blob = await response.blob();
      const objUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objUrl;
      a.download = config.outputName(selectedFile.name);
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(objUrl);
      document.body.removeChild(a);

      toast({ title: "Conversión exitosa", description: "El archivo Excel se ha descargado correctamente" });

      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error: any) {
      console.error('Error converting file:', error);
      toast({ title: "Error en la conversión", description: error.message || "No se pudo convertir el archivo", variant: "destructive" });
    } finally {
      setIsConverting(false);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Convertidor de Cronograma
        </CardTitle>
        <CardDescription>{config.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Mode selector */}
        <div className="flex rounded-lg border border-border overflow-hidden">
          {(Object.keys(MODES) as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => handleModeChange(m)}
              data-testid={`button-mode-${m}`}
              className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                mode === m
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground hover:bg-muted"
              }`}
            >
              {MODES[m].label}
            </button>
          ))}
        </div>

        {/* File drop zone */}
        <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-6">
          {!selectedFile ? (
            <div className="text-center">
              <Upload className="mx-auto h-12 w-12 text-gray-400" />
              <div className="mt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  data-testid="button-select-file"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Seleccionar {config.acceptLabel}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={config.accept}
                  onChange={handleFileSelect}
                  className="hidden"
                  data-testid="input-converter-file"
                />
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  Sube un archivo {config.acceptLabel}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="font-medium" data-testid="text-selected-filename">{selectedFile.name}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {(selectedFile.size / 1024).toFixed(2)} KB
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={handleRemoveFile} data-testid="button-remove-file">
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {selectedFile && (
          <Button
            onClick={handleConvert}
            disabled={isConverting}
            className="w-full"
            data-testid="button-convert-file"
          >
            <Download className="mr-2 h-4 w-4" />
            {isConverting ? "Convirtiendo..." : "Convertir y Descargar Excel"}
          </Button>
        )}

        <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
          <h4 className="text-sm font-semibold mb-2">Instrucciones:</h4>
          <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
            {config.hint.map((h, i) => <li key={i}>• {h}</li>)}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
