import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, FileSpreadsheet, CheckCircle2, XCircle, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

interface ImportPairsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tournamentId?: string;
}

export default function ImportPairsModal({ open, onOpenChange, tournamentId }: ImportPairsModalProps) {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [results, setResults] = useState<any>(null);

  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('tournamentId', tournamentId || '');

      const response = await fetch('/api/pairs/import', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error al importar');
      }

      return response.json();
    },
    onSuccess: (data) => {
      setResults(data);
      queryClient.invalidateQueries({ queryKey: ["/api/pairs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/players"] });
      
      toast({
        title: "Importación completada",
        description: `${data.success} parejas importadas exitosamente`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error al importar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResults(null);
    }
  };

  const handleImport = () => {
    if (!file) return;
    importMutation.mutate(file);
  };

  const handleClose = () => {
    setFile(null);
    setResults(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar Parejas desde Excel</DialogTitle>
          <DialogDescription>
            Sube un archivo Excel con las parejas y sus categorías
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Instructions */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <p className="font-medium mb-2">Formato del archivo Excel:</p>
              <ul className="list-disc list-inside text-sm space-y-1">
                <li><strong>Columna 1:</strong> Jugador 1 (o "Jugador 1", "Player 1", "Player1Name")</li>
                <li><strong>Columna 2:</strong> Jugador 2 (o "Jugador 2", "Player 2", "Player2Name")</li>
                <li><strong>Columna 3 (opcional):</strong> Categoría (o "Categoría", "Category", "CategoryName")</li>
              </ul>
            </AlertDescription>
          </Alert>

          {/* File Upload */}
          <div className="border-2 border-dashed rounded-lg p-8 text-center">
            {!file ? (
              <div className="space-y-4">
                <FileSpreadsheet className="mx-auto h-12 w-12 text-muted-foreground" />
                <div>
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <Button variant="outline" asChild data-testid="button-select-file">
                      <span>
                        <Upload className="mr-2 h-4 w-4" />
                        Seleccionar archivo Excel
                      </span>
                    </Button>
                  </label>
                  <input
                    id="file-upload"
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileChange}
                    className="hidden"
                    data-testid="input-file-upload"
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  Formatos aceptados: .xlsx, .xls
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <FileSpreadsheet className="mx-auto h-12 w-12 text-primary" />
                <div>
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(file.size / 1024).toFixed(2)} KB
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setFile(null)}
                  size="sm"
                  data-testid="button-change-file"
                >
                  Cambiar archivo
                </Button>
              </div>
            )}
          </div>

          {/* Import Results */}
          {results && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-medium" data-testid="text-import-success">{results.success} parejas importadas</span>
              </div>

              {(results.errors && results.errors.length > 0) && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-destructive">
                    <XCircle className="h-5 w-5" />
                    <span className="font-medium" data-testid="text-import-errors">{results.errors.length} errores encontrados</span>
                  </div>
                  <div className="max-h-40 overflow-y-auto border rounded-md p-3 text-sm" data-testid="list-import-errors">
                    {results.errors.map((error: any, index: number) => (
                      <div key={index} className="py-1" data-testid={`error-row-${index}`}>
                        <span className="font-medium">Fila {error.row}:</span> {error.error}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={handleClose} data-testid="button-close-modal">
              {results ? 'Cerrar' : 'Cancelar'}
            </Button>
            {!results && (
              <Button
                onClick={handleImport}
                disabled={!file || importMutation.isPending}
                data-testid="button-import"
              >
                {importMutation.isPending ? 'Importando...' : 'Importar'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
