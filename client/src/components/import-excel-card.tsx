import { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, Upload, X, CheckCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ImportExcelCardProps {
  tournamentId: string;
  onImportComplete?: () => void;
}

export default function ImportExcelCard({ tournamentId, onImportComplete }: ImportExcelCardProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    message: string;
    stats?: {
      created: number;
      skipped: number;
      errors?: string[];
    };
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validExtensions = ['.xlsx', '.xls'];
      const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
      
      if (!validExtensions.includes(fileExtension)) {
        toast({
          title: "Archivo inválido",
          description: "Por favor selecciona un archivo Excel (.xlsx o .xls)",
          variant: "destructive"
        });
        return;
      }
      setSelectedFile(file);
      setImportResult(null);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) {
      toast({
        title: "Sin archivo",
        description: "Por favor selecciona un archivo Excel primero",
        variant: "destructive"
      });
      return;
    }

    setIsImporting(true);
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch(`/api/admin/tournaments/${tournamentId}/import-excel-schedule`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Error al importar Excel');
      }

      setImportResult(result);
      
      toast({
        title: "Importación exitosa",
        description: result.message
      });

      // Limpiar selección
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // Notificar al padre
      if (onImportComplete) {
        onImportComplete();
      }
    } catch (error: any) {
      console.error('Error importing Excel:', error);
      const errorResult = {
        success: false,
        message: error.message || "No se pudo importar el cronograma desde Excel"
      };
      setImportResult(errorResult);
      
      toast({
        title: "Error en la importación",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setImportResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          Importar Cronograma desde Excel
        </CardTitle>
        <CardDescription>
          Importa partidos programados desde un archivo Excel. El sistema creará automáticamente jugadores y parejas.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-6">
          {!selectedFile ? (
            <div className="text-center">
              <Upload className="mx-auto h-12 w-12 text-gray-400" />
              <div className="mt-4">
                <label htmlFor="excel-upload">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    data-testid="button-select-excel"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Seleccionar Excel
                  </Button>
                  <input
                    ref={fileInputRef}
                    id="excel-upload"
                    type="file"
                    accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                    onChange={handleFileSelect}
                    className="hidden"
                    data-testid="input-excel-file"
                  />
                </label>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  Sube un archivo Excel (.xlsx o .xls) con el cronograma
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="h-8 w-8 text-green-500" />
                <div>
                  <p className="font-medium" data-testid="text-selected-excel-filename">
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
                data-testid="button-remove-excel"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {selectedFile && (
          <Button
            onClick={handleImport}
            disabled={isImporting}
            className="w-full"
            data-testid="button-import-excel"
          >
            <Upload className="mr-2 h-4 w-4" />
            {isImporting ? "Importando..." : "Importar Cronograma"}
          </Button>
        )}

        {importResult && (
          <Alert variant={importResult.success ? "default" : "destructive"}>
            {importResult.success ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <AlertDescription>
              <p className="font-semibold">{importResult.message}</p>
              {importResult.stats && (
                <div className="mt-2 space-y-1 text-sm">
                  <p>✓ Partidos creados: {importResult.stats.created}</p>
                  <p>⊘ Filas omitidas: {importResult.stats.skipped}</p>
                  {importResult.stats.errors && importResult.stats.errors.length > 0 && (
                    <div className="mt-2">
                      <p className="font-semibold">Errores:</p>
                      <ul className="list-disc list-inside">
                        {importResult.stats.errors.slice(0, 5).map((error, idx) => (
                          <li key={idx} className="text-xs">{error}</li>
                        ))}
                        {importResult.stats.errors.length > 5 && (
                          <li className="text-xs">...y {importResult.stats.errors.length - 5} más</li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}

        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
          <h4 className="text-sm font-semibold mb-2">Formato del Excel:</h4>
          <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
            <li>• <strong>Columna A:</strong> Fecha del partido</li>
            <li>• <strong>Columna B:</strong> Hora del partido</li>
            <li>• <strong>Columna D:</strong> Categoría</li>
            <li>• <strong>Columnas F-G:</strong> Pareja 1 (Jugador 1 y 2)</li>
            <li>• <strong>Columnas H-I:</strong> Pareja 2 (Jugador 1 y 2)</li>
          </ul>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
            El sistema creará automáticamente jugadores y parejas si no existen.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
