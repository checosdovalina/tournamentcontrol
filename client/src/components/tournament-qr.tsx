import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { QrCode, Download, ExternalLink } from "lucide-react";
import QRCode from "qrcode";
import { useToast } from "@/hooks/use-toast";

interface TournamentQRProps {
  tournamentId: string;
  tournamentName: string;
}

export default function TournamentQR({ tournamentId, tournamentName }: TournamentQRProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const { toast } = useToast();

  useEffect(() => {
    generateQR();
  }, [tournamentId]);

  const generateQR = async () => {
    try {
      const url = `${window.location.origin}/score-capture/${tournamentId}`;
      const dataUrl = await QRCode.toDataURL(url, {
        width: 400,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });
      setQrDataUrl(dataUrl);
    } catch (error) {
      console.error("Error generating QR code:", error);
      toast({
        title: "Error",
        description: "No se pudo generar el código QR",
        variant: "destructive",
      });
    }
  };

  const downloadQR = () => {
    if (!qrDataUrl) return;

    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `qr-captura-${tournamentName.replace(/\s+/g, '-').toLowerCase()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "QR descargado",
      description: "El código QR ha sido descargado exitosamente",
    });
  };

  const copyLink = () => {
    const url = `${window.location.origin}/score-capture/${tournamentId}`;
    navigator.clipboard.writeText(url);
    toast({
      title: "Link copiado",
      description: "El enlace ha sido copiado al portapapeles",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCode className="h-5 w-5" />
          QR Genérico de Captura de Scores
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Este QR es único para el torneo y se puede imprimir. Permite a cualquier persona escanear y capturar scores de los partidos activos.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {qrDataUrl && (
          <div className="flex flex-col items-center space-y-4">
            <div className="bg-white p-4 rounded-lg shadow-md">
              <img 
                src={qrDataUrl} 
                alt="QR Code para captura de scores" 
                className="w-full max-w-sm"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-2 w-full max-w-sm">
              <Button
                onClick={downloadQR}
                className="flex-1"
                variant="default"
                data-testid="button-download-qr"
              >
                <Download className="h-4 w-4 mr-2" />
                Descargar QR
              </Button>
              <Button
                onClick={copyLink}
                className="flex-1"
                variant="outline"
                data-testid="button-copy-link"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Copiar Link
              </Button>
            </div>

            <div className="text-center space-y-2">
              <p className="text-sm font-medium">Link directo:</p>
              <code className="text-xs bg-muted px-3 py-1 rounded block break-all">
                {window.location.origin}/score-capture/{tournamentId}
              </code>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4 text-sm">
              <p className="font-medium mb-2">¿Cómo funciona?</p>
              <ul className="space-y-1 text-muted-foreground list-disc list-inside">
                <li>Escanea el QR o usa el link para ver todos los partidos activos</li>
                <li>Selecciona un partido disponible para capturar</li>
                <li>Si otro usuario ya está capturando un partido, aparecerá bloqueado</li>
                <li>El bloqueo se libera automáticamente después de 5 minutos de inactividad</li>
              </ul>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
