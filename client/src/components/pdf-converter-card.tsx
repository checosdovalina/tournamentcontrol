import { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download, Upload, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function PDFConverterCard() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        toast({
          title: "Archivo inválido",
          description: "Por favor selecciona un archivo PDF",
          variant: "destructive"
        });
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleConvert = async () => {
    if (!selectedFile) {
      toast({
        title: "Sin archivo",
        description: "Por favor selecciona un archivo PDF primero",
        variant: "destructive"
      });
      return;
    }

    setIsConverting(true);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch('/api/superadmin/convert-pdf-to-excel', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error al convertir PDF');
      }

      // Descargar el archivo Excel
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cronograma_${selectedFile.name.replace('.pdf', '')}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Conversión exitosa",
        description: "El archivo Excel se ha descargado correctamente"
      });

      // Limpiar selección
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error: any) {
      console.error('Error converting PDF:', error);
      toast({
        title: "Error en la conversión",
        description: error.message || "No se pudo convertir el PDF a Excel",
        variant: "destructive"
      });
    } finally {
      setIsConverting(false);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Convertir PDF a Excel
        </CardTitle>
        <CardDescription>
          Convierte cronogramas de torneos en PDF a formato Excel para importar partidos
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-6">
          {!selectedFile ? (
            <div className="text-center">
              <Upload className="mx-auto h-12 w-12 text-gray-400" />
              <div className="mt-4">
                <label htmlFor="pdf-upload">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    data-testid="button-select-pdf"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Seleccionar PDF
                  </Button>
                  <input
                    ref={fileInputRef}
                    id="pdf-upload"
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={handleFileSelect}
                    className="hidden"
                    data-testid="input-pdf-file"
                  />
                </label>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  Sube un archivo PDF con el cronograma del torneo
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="font-medium" data-testid="text-selected-filename">
                    {selectedFile.name}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {(selectedFile.size / 1024).toFixed(2)} KB
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRemoveFile}
                data-testid="button-remove-pdf"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {selectedFile && (
          <div className="flex gap-2">
            <Button
              onClick={handleConvert}
              disabled={isConverting}
              className="flex-1"
              data-testid="button-convert-pdf"
            >
              <Download className="mr-2 h-4 w-4" />
              {isConverting ? "Convirtiendo..." : "Convertir y Descargar Excel"}
            </Button>
          </div>
        )}

        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
          <h4 className="text-sm font-semibold mb-2">Formatos soportados:</h4>
          <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
            <li>• Cronogramas en formato tabla vertical con "VS"</li>
            <li>• Cronogramas en formato tarjetas lado a lado</li>
            <li>• El PDF debe contener: fecha, hora, cancha, categoría y nombres de jugadores</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
