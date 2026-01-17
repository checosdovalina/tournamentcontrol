# Sistema de Captura de Score por QR - Documentación Completa

**Versión:** 1.0  
**Fecha:** 27 de Noviembre de 2025  
**Sistema:** CourtFlow - Padel Tournament Control System

---

## 1. DESCRIPCIÓN GENERAL

El sistema de Captura de Score por QR permite a cualquier persona (sin necesidad de cuenta) actualizar el marcador de un partido de pádel escaneando un código QR único. Esto facilita que los propios jugadores o espectadores mantengan actualizado el score en tiempo real.

### 1.1 Acceso al Sistema

| Método | Descripción |
|--------|-------------|
| URL Directa | `/score/{matchId}` |
| Código QR | Generado automáticamente para cada partido activo |
| Permisos | Público (sin autenticación requerida) |

---

## 2. FUNCIONALIDADES IMPLEMENTADAS

### 2.1 Visualización de Información del Partido

| Elemento | Descripción |
|----------|-------------|
| Pareja 1 | Nombres completos de ambos jugadores |
| Pareja 2 | Nombres completos de ambos jugadores |
| Cancha | Nombre de la cancha asignada |
| Categoría | Nombre de la categoría del partido |
| Score en Vivo | Sets completados con marcador |
| Set Actual | Indicador del set en juego |

### 2.2 Captura de Juegos

| Acción | Descripción | Botón |
|--------|-------------|-------|
| Agregar Juego | Suma 1 juego a la pareja seleccionada | `+ Juego` (azul) |
| Quitar Juego | Resta 1 juego a la pareja seleccionada | `-` (gris) |
| Deshacer | Revierte el último cambio realizado | `Deshacer último cambio` (naranja) |

### 2.3 Validación Automática de Sets

El sistema detecta automáticamente cuando un set está completo según las reglas oficiales de pádel:

| Score Ganador | Condición |
|---------------|-----------|
| 6-0 a 6-4 | Diferencia de 2+ juegos con mínimo 6 |
| 7-5 | Gana por 2 después de 5-5 |
| 7-6 | Tie-break (después de 6-6) |

**Comportamiento al completar un set:**
1. El set se marca como completado
2. Se muestra badge con el score final
3. Se inicia automáticamente el siguiente set
4. No se pueden agregar más juegos al set completado

### 2.4 Sistema de Historial (Undo)

| Característica | Descripción |
|----------------|-------------|
| Almacenamiento | Cada cambio se guarda en historial completo |
| Deep Copy | Se usa copia profunda para evitar corrupción |
| Restauración | Revierte al estado exacto anterior |
| Límite | Puede deshacer múltiples cambios hasta el inicio |

**Escenarios cubiertos:**
- Deshacer juego agregado incorrectamente
- Revertir cierre de set incorrecto
- Corregir errores de captura múltiples

### 2.5 Timer de Auto-Finalización

Cuando el partido está completo (una pareja ganó 2 sets), se activa un timer automático:

| Parámetro | Valor |
|-----------|-------|
| Duración | 15 segundos |
| Indicador Visual | Barra de progreso azul |
| Mensaje | "Finalizando automáticamente en X segundos" |

**Opciones disponibles durante el countdown:**

| Botón | Acción | Estilo |
|-------|--------|--------|
| Deshacer y corregir | Cancela timer y permite editar | Naranja, outline |
| Finalizar Ahora | Completa el partido inmediatamente | Azul, sólido |

### 2.6 Finalización de Partido

Al finalizar (manual o automático):
1. Se guarda el resultado en la base de datos
2. Se libera la cancha asignada
3. Se actualiza el estado del partido a "finished"
4. Se notifica por WebSocket a todos los displays
5. Se muestra pantalla de confirmación

---

## 3. FLUJO DE USO PASO A PASO

### 3.1 Inicio de Captura

```
1. Escanear código QR del partido
2. Se carga la página de captura
3. Verificar que los nombres de parejas son correctos
4. Verificar la cancha mostrada
```

### 3.2 Registro de Juegos

```
1. Identificar qué pareja ganó el juego
2. Presionar botón "+ Juego" de esa pareja
3. Verificar que el marcador se actualizó
4. Si hubo error, presionar "Deshacer último cambio"
```

### 3.3 Cambio de Set

```
1. Cuando un set llega a score ganador (ej: 6-4)
2. El sistema automáticamente:
   - Muestra badge del set completado
   - Cambia a "Juegos - Set X" (siguiente)
   - Reinicia marcador a 0-0
```

### 3.4 Finalización

```
1. Cuando una pareja gana 2 sets
2. Aparece mensaje de countdown (15 segundos)
3. Opciones:
   a) Esperar que se complete automáticamente
   b) Presionar "Finalizar Ahora"
   c) Presionar "Deshacer y corregir" si hay error
4. Se muestra pantalla de confirmación
```

---

## 4. DEFECTOS REPORTADOS Y CORREGIDOS

### 4.1 Defecto: Undo no funcionaba al revertir cierre de set

| Campo | Detalle |
|-------|---------|
| **ID** | BUG-001 |
| **Fecha Reporte** | 27-Nov-2025 |
| **Severidad** | Alta |
| **Estado** | CORREGIDO |

**Descripción del Problema:**
Cuando un usuario agregaba un juego que cerraba un set (ej: de 5-4 a 6-4), y luego presionaba "Deshacer", el sistema no restauraba correctamente el estado anterior. El score quedaba corrupto.

**Causa Raíz:**
Se usaba shallow copy (`[...array]`) para guardar el historial. Esto causaba que las modificaciones posteriores al score también afectaran los registros del historial, corrompiendo la capacidad de restaurar.

**Solución Implementada:**
Se cambió a deep copy usando `JSON.parse(JSON.stringify(state))` para asegurar que cada entrada del historial sea independiente.

**Código Afectado:**
- `client/src/pages/guest-score.tsx`
- Funciones: `addGame()`, `removeGame()`, `handleUndo()`

---

### 4.2 Defecto: Timer no completaba partido al llegar a 0

| Campo | Detalle |
|-------|---------|
| **ID** | BUG-002 |
| **Fecha Reporte** | 27-Nov-2025 |
| **Severidad** | Alta |
| **Estado** | CORREGIDO |

**Descripción del Problema:**
El countdown de 15 segundos llegaba a 0 pero el partido no se finalizaba automáticamente. El sistema quedaba en estado "0 segundos" sin ejecutar la acción.

**Causa Raíz:**
El `setInterval` capturaba una closure del `winnerId` al momento de crearse. Cuando el interval ejecutaba, el `winnerId` era `null` porque la referencia original había quedado obsoleta.

**Solución Implementada:**
Se implementó un `useRef` (`winnerIdRef`) que mantiene siempre el valor actual del ganador. El timer lee de esta ref en lugar de la closure.

**Código Afectado:**
- `client/src/pages/guest-score.tsx`
- Variables: `winnerIdRef`, `countdownIntervalRef`

---

### 4.3 Defecto: Timer seguía sin funcionar después de primer fix

| Campo | Detalle |
|-------|---------|
| **ID** | BUG-003 |
| **Fecha Reporte** | 27-Nov-2025 |
| **Severidad** | Alta |
| **Estado** | CORREGIDO |

**Descripción del Problema:**
Después de implementar el fix con `useRef`, el timer aún no completaba el partido correctamente.

**Causa Raíz:**
La lógica del `useEffect` era demasiado compleja con múltiples dependencias que causaban re-renders y reinicios del interval.

**Solución Implementada:**
Se simplificó completamente la arquitectura:
1. Un `useEffect` para detectar partido completo e iniciar countdown
2. Un `useEffect` separado para manejar el decremento usando `setTimeout` recursivo
3. Cuando llega a 0, ejecuta la mutación directamente

**Código Afectado:**
- `client/src/pages/guest-score.tsx`
- useEffects reorganizados completamente

---

## 5. MEJORAS SUGERIDAS (BACKLOG)

### 5.1 Confirmación de Cambios Críticos

| Campo | Detalle |
|-------|---------|
| **ID** | MEJORA-001 |
| **Prioridad** | Media |
| **Esfuerzo** | Bajo |

**Descripción:**
Agregar diálogo de confirmación antes de finalizar partido manualmente con "Finalizar Ahora".

**Beneficio:**
Previene finalizaciones accidentales que no se pueden revertir.

---

### 5.2 Indicador de Estado de Conexión

| Campo | Detalle |
|-------|---------|
| **ID** | MEJORA-002 |
| **Prioridad** | Alta |
| **Esfuerzo** | Bajo |

**Descripción:**
Mostrar indicador visual (badge verde/rojo) del estado de conexión WebSocket.

**Beneficio:**
El usuario sabe si sus cambios se están sincronizando en tiempo real.

---

### 5.3 Modo Offline con Sincronización

| Campo | Detalle |
|-------|---------|
| **ID** | MEJORA-003 |
| **Prioridad** | Media |
| **Esfuerzo** | Alto |

**Descripción:**
Almacenar cambios localmente en localStorage si hay pérdida de conexión. Sincronizar automáticamente cuando se recupera.

**Beneficio:**
No se pierden datos por problemas de red en el club.

---

### 5.4 Historial Visual Expandido

| Campo | Detalle |
|-------|---------|
| **ID** | MEJORA-004 |
| **Prioridad** | Baja |
| **Esfuerzo** | Medio |

**Descripción:**
Mostrar lista colapsable de todos los cambios realizados, no solo el botón de deshacer el último.

**Beneficio:**
Permite ver el histórico completo y restaurar a cualquier punto.

---

### 5.5 Bloqueo por Inactividad

| Campo | Detalle |
|-------|---------|
| **ID** | MEJORA-005 |
| **Prioridad** | Baja |
| **Esfuerzo** | Bajo |

**Descripción:**
Si no hay cambios en 30+ minutos, mostrar pantalla de bloqueo que requiere confirmación para continuar.

**Beneficio:**
Previene capturas accidentales si alguien deja la página abierta.

---

### 5.6 Feedback de Audio

| Campo | Detalle |
|-------|---------|
| **ID** | MEJORA-006 |
| **Prioridad** | Baja |
| **Esfuerzo** | Bajo |

**Descripción:**
Sonido de confirmación al registrar juego, completar set, o finalizar partido.

**Beneficio:**
Feedback inmediato sin necesidad de ver la pantalla.

---

### 5.7 Validación de Score Inconsistente

| Campo | Detalle |
|-------|---------|
| **ID** | MEJORA-007 |
| **Prioridad** | Media |
| **Esfuerzo** | Medio |

**Descripción:**
Alertar si el score reportado es estadísticamente improbable (ej: 6-0, 6-0, 6-0 en 5 minutos).

**Beneficio:**
Detecta posibles errores de captura o uso indebido.

---

## 6. ESPECIFICACIONES TÉCNICAS

### 6.1 Componentes Frontend

| Archivo | Propósito |
|---------|-----------|
| `client/src/pages/guest-score.tsx` | Página principal de captura |
| `client/src/lib/queryClient.ts` | Configuración de React Query |

### 6.2 Endpoints API Utilizados

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/matches/public/:matchId` | GET | Obtener datos del partido |
| `/api/matches/:matchId/score` | PATCH | Actualizar score |
| `/api/matches/:matchId/complete` | POST | Finalizar partido |

### 6.3 Estado del Score (Estructura)

```typescript
interface LiveScore {
  sets: number[][];        // [[6,4], [3,6], [0,0]]
  currentSet: number;      // 1, 2, o 3
}

interface ScoreHistory {
  score: LiveScore;
  timestamp: number;
}
```

### 6.4 Dependencias Clave

| Librería | Uso |
|----------|-----|
| React | Framework UI |
| TanStack Query | Fetching y cache |
| Wouter | Routing |
| Tailwind CSS | Estilos |
| Shadcn/ui | Componentes UI |

---

## 7. CONSIDERACIONES DE SEGURIDAD

| Aspecto | Implementación |
|---------|----------------|
| Acceso | Público pero requiere UUID del partido |
| UUID | Generado aleatoriamente (difícil de adivinar) |
| Validación | Server-side validation de scores |
| Rate Limiting | Límite de requests por IP (pendiente) |

---

## 8. HISTORIAL DE CAMBIOS

| Fecha | Versión | Cambios |
|-------|---------|---------|
| 27-Nov-2025 | 1.0.0 | Implementación inicial de captura QR |
| 27-Nov-2025 | 1.0.1 | Agregado sistema de undo |
| 27-Nov-2025 | 1.0.2 | Agregado timer de auto-finalización |
| 27-Nov-2025 | 1.0.3 | Fix: Deep copy para historial |
| 27-Nov-2025 | 1.0.4 | Fix: Timer con useRef |
| 27-Nov-2025 | 1.0.5 | Fix: Simplificación de lógica de timer |

---

*Documento generado para CourtFlow - Sistema de Control de Torneos de Pádel*
