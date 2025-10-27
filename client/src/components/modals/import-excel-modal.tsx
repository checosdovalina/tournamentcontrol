import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, Upload, X, CheckCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ImportExcelModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tournamentId: string;
  onImportComplete?: () => void;
}

export default function ImportExcelModal({ 
  open, 
  onOpenChange, 
  tournamentId, 
  onImportComplete 
}: ImportExcelModalProps) {
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
          description: "Selecciona un archivo Excel (.xlsx o .xls)",
          variant: "destructive"
        });
        return;
      }
      setSelectedFile(file);
      setImportResult(null);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) return;

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

      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      if (onImportComplete) {
        onImportComplete();
      }

      setTimeout(() => {
        onOpenChange(false);
      }, 2000);
    } catch (error: any) {
      console.error('Error importing Excel:', error);
      const errorResult = {
        success: false,
        message: error.message || "No se pudo importar el cronograma"
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

  const handleClose = () => {
    setSelectedFile(null);
    setImportResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importar Cronograma desde Excel
          </DialogTitle>
          <DialogDescription>
            Sube un archivo Excel (.xlsx o .xls) con el cronograma
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-6">
            {!selectedFile ? (
              <div className="text-center">
                <Upload className="mx-auto h-10 w-10 text-gray-400" />
                <div className="mt-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    data-testid="button-select-excel"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Seleccionar Excel
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                    onChange={handleFileSelect}
                    className="hidden"
                    data-testid="input-excel-file"
                  />
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="h-8 w-8 text-green-500" />
                  <div>
                    <p className="font-medium text-sm" data-testid="text-selected-excel-filename">
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
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

          {importResult && (
            <Alert variant={importResult.success ? "default" : "destructive"}>
              {importResult.success ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <AlertDescription>
                <p className="font-semibold text-sm">{importResult.message}</p>
                {importResult.stats && (
                  <div className="mt-2 space-y-1 text-xs">
                    <p>✓ Partidos creados: {importResult.stats.created}</p>
                    {importResult.stats.skipped > 0 && (
                      <p>⊘ Filas omitidas: {importResult.stats.skipped}</p>
                    )}
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg text-xs">
            <p className="font-semibold mb-1">Formato requerido:</p>
            <ul className="space-y-0.5 text-gray-600 dark:text-gray-400">
              <li>• <strong>Col A:</strong> Fecha • <strong>Col B:</strong> Hora • <strong>Col D:</strong> Categoría</li>
              <li>• <strong>Col F-G:</strong> Pareja 1 • <strong>Col H-I:</strong> Pareja 2</li>
            </ul>
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isImporting}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleImport}
              disabled={!selectedFile || isImporting}
              data-testid="button-import-excel"
            >
              <Upload className="mr-2 h-4 w-4" />
              {isImporting ? "Importando..." : "Importar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
