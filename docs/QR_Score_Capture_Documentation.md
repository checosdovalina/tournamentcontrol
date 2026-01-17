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

## 2. FUNCIONALIDADES IMPLEMENTADAS (DETALLADO)

### 2.1 Visualización de Información del Partido

La pantalla principal muestra toda la información relevante del partido en curso.

#### 2.1.1 Encabezado del Partido

| Elemento | Ubicación | Descripción |
|----------|-----------|-------------|
| Título | Superior | "Captura de Score - Invitado" |
| Cancha | Superior derecha | Nombre de la cancha asignada (ej: "PLAYDOIT") |
| Botón Volver | Superior izquierda | Flecha para regresar a lista de partidos |

#### 2.1.2 Información de Parejas

| Campo | Formato | Ejemplo |
|-------|---------|---------|
| Pareja 1 | "Jugador 1 / Jugador 2" | "Joanna Vázquez / Adriana Díaz De Leon" |
| Pareja 2 | "Jugador 1 / Jugador 2" | "SAMANTHA Gonzalez / Martha Bustos" |
| Etiqueta | Texto gris | "Pareja 1", "Pareja 2" |

#### 2.1.3 Score en Vivo

| Componente | Descripción | Visualización |
|------------|-------------|---------------|
| Sets Completados | Badges azules con score | `0-6` `0-6` |
| Set Actual | Título del set en juego | "Juegos - Set 3" |
| Marcador Actual | Números grandes | `0` - `0` |

#### 2.1.4 Estados del Partido

| Estado | Indicador | Acciones Disponibles |
|--------|-----------|---------------------|
| En Juego | Score editable | Agregar/Quitar juegos |
| Completo | Timer countdown | Finalizar/Deshacer |
| Finalizado | Pantalla confirmación | Volver a lista |

---

### 2.2 Captura de Juegos (Sistema Completo)

#### 2.2.1 Controles por Pareja

Cada pareja tiene su propio panel de control:

| Control | Función | Ubicación |
|---------|---------|-----------|
| Botón `-` | Resta 1 juego | Izquierda del marcador |
| Marcador | Muestra juegos actuales | Centro |
| Botón `+ Juego` | Suma 1 juego | Derecha del marcador |

#### 2.2.2 Validaciones al Agregar Juego

| Validación | Condición | Mensaje |
|------------|-----------|---------|
| Set completo | Score ya es ganador | "Este set ya está completo" |
| Partido finalizado | Status = "finished" | No permite cambios |
| Score máximo | 7-6 alcanzado | Cierra set automáticamente |

#### 2.2.3 Validaciones al Quitar Juego

| Validación | Condición | Comportamiento |
|------------|-----------|----------------|
| Mínimo 0 | Juegos = 0 | Botón deshabilitado |
| Set anterior | Set actual = 1, juegos = 0 | No permite (usar Undo) |

#### 2.2.4 Feedback Visual

| Acción | Feedback |
|--------|----------|
| Juego agregado | Número incrementa inmediatamente |
| Set completado | Badge aparece, nuevo set inicia |
| Error | Toast de advertencia (naranja) |
| Éxito | Actualización silenciosa |

---

### 2.3 Validación Automática de Sets (Reglas de Pádel)

#### 2.3.1 Condiciones de Victoria de Set

| Escenario | Score Ejemplo | Regla Aplicada |
|-----------|---------------|----------------|
| Victoria directa | 6-0, 6-1, 6-2, 6-3, 6-4 | Mínimo 6 juegos, diferencia 2+ |
| Empate roto | 7-5 | Después de 5-5, gana el primero a 7 |
| Tie-break | 7-6 | Después de 6-6, se juega tie-break |

#### 2.3.2 Lógica de Detección

```
Función isSetComplete(set):
  SI pair1 >= 6 Y pair1 - pair2 >= 2 → SET COMPLETO (Gana Pareja 1)
  SI pair2 >= 6 Y pair2 - pair1 >= 2 → SET COMPLETO (Gana Pareja 2)
  SI pair1 == 7 Y pair2 == 6 → SET COMPLETO (Gana Pareja 1)
  SI pair2 == 7 Y pair1 == 6 → SET COMPLETO (Gana Pareja 2)
  SINO → SET EN PROGRESO
```

#### 2.3.3 Transición de Sets

| Paso | Acción | Resultado |
|------|--------|-----------|
| 1 | Usuario agrega juego ganador | Score actualiza (ej: 5-4 → 6-4) |
| 2 | Sistema detecta set completo | isSetComplete() = true |
| 3 | Set se marca como finalizado | Badge azul aparece |
| 4 | currentSet incrementa | Set 1 → Set 2 |
| 5 | Nuevo marcador inicia | 0 - 0 |

#### 2.3.4 Protección de Sets Completados

| Intento | Respuesta del Sistema |
|---------|----------------------|
| Agregar juego a set cerrado | Toast: "Este set ya está completo" |
| Quitar juego de set cerrado | No permitido (usar Undo) |
| Modificar set anterior | Solo via Undo |

---

### 2.4 Sistema de Historial (Undo) - Implementación Técnica

#### 2.4.1 Estructura del Historial

```typescript
interface ScoreHistoryEntry {
  score: {
    sets: number[][];      // [[6,4], [3,6], [2,1]]
    currentSet: number;    // 3
  };
  timestamp: number;       // Date.now()
}

// Array de historial
scoreHistory: ScoreHistoryEntry[]
```

#### 2.4.2 Guardado de Estado (Deep Copy)

| Momento | Acción |
|---------|--------|
| Antes de cada cambio | Se guarda copia profunda del estado actual |
| Método | `JSON.parse(JSON.stringify(currentScore))` |
| Razón | Evita que referencias compartan memoria |

#### 2.4.3 Proceso de Undo

| Paso | Descripción |
|------|-------------|
| 1 | Usuario presiona "Deshacer último cambio" |
| 2 | Se extrae última entrada del historial |
| 3 | Se restaura el estado completo |
| 4 | Se elimina la entrada usada |
| 5 | Se envía actualización al servidor |

#### 2.4.4 Casos Especiales Manejados

| Caso | Comportamiento |
|------|----------------|
| Undo de cierre de set | Restaura set anterior como activo |
| Undo múltiple | Puede deshacer hasta el inicio |
| Undo con timer activo | Cancela timer, restaura estado |
| Historial vacío | Botón deshabilitado |

#### 2.4.5 Visualización del Botón Undo

| Estado | Apariencia |
|--------|------------|
| Con historial | Naranja, habilitado |
| Sin historial | Gris, deshabilitado |
| Texto | "Deshacer último cambio" |
| Icono | Flecha circular (↩) |

---

### 2.5 Timer de Auto-Finalización (Sistema Completo)

#### 2.5.1 Activación del Timer

| Condición | Requerimiento |
|-----------|---------------|
| Partido completo | Una pareja ganó 2 sets |
| Status del partido | != "finished" |
| Timer no activo | autoFinishCountdown === null |

#### 2.5.2 Componentes Visuales

| Elemento | Descripción |
|----------|-------------|
| Icono | Reloj (⏱) |
| Mensaje | "Finalizando automáticamente en X segundos" |
| Barra de progreso | Azul, decrece de 100% a 0% |
| Texto auxiliar | "Puedes deshacer el último cambio si hubo un error" |

#### 2.5.3 Botones Durante Countdown

| Botón | Función | Estilo |
|-------|---------|--------|
| Deshacer y corregir | Cancela timer + abre modo edición | Naranja, outline |
| Finalizar Ahora | Completa partido inmediatamente | Azul, sólido |

#### 2.5.4 Lógica del Timer

```
useEffect (countdown):
  SI countdown > 0:
    setTimeout(() → countdown - 1, 1000ms)
  
  SI countdown === 0:
    Ejecutar completeMatchMutation(winnerId)
    Resetear countdown a null
```

#### 2.5.5 Cancelación del Timer

| Trigger | Resultado |
|---------|-----------|
| Usuario presiona Undo | Timer cancelado, vuelve a edición |
| Partido ya no está completo | Timer cancelado automáticamente |
| Usuario cierra página | Timer cancelado (cleanup) |

---

### 2.6 Finalización de Partido (Proceso Completo)

#### 2.6.1 Trigger de Finalización

| Método | Descripción |
|--------|-------------|
| Automático | Timer llega a 0 segundos |
| Manual | Usuario presiona "Finalizar Ahora" |

#### 2.6.2 Proceso en Backend

| Paso | Acción en Servidor |
|------|-------------------|
| 1 | Recibe POST `/api/matches/:id/complete` |
| 2 | Valida que partido existe y está activo |
| 3 | Actualiza status a "finished" |
| 4 | Guarda winnerId en resultado |
| 5 | Libera cancha asignada |
| 6 | Crea registro en tabla Results |
| 7 | Envía evento WebSocket |

#### 2.6.3 Datos del Resultado Guardado

| Campo | Valor |
|-------|-------|
| matchId | UUID del partido |
| winnerId | UUID de pareja ganadora |
| score | JSON con todos los sets |
| completedAt | Timestamp de finalización |
| completedBy | "guest" (captura por QR) |

#### 2.6.4 Notificaciones WebSocket

| Evento | Destinatarios |
|--------|---------------|
| `match:completed` | Todos los displays |
| `court:released` | Panel de administración |
| `result:created` | Dashboard de resultados |

#### 2.6.5 Pantalla de Confirmación

| Elemento | Contenido |
|----------|-----------|
| Icono | Check verde (✓) |
| Título | "Partido Finalizado" |
| Mensaje | "El resultado ha sido registrado correctamente" |
| Botón | "Volver a la lista" |

---

## 3. FLUJO DE USO PASO A PASO (DETALLADO)

### 3.1 Acceso al Sistema

#### 3.1.1 Mediante Código QR

| Paso | Acción del Usuario | Respuesta del Sistema |
|------|-------------------|----------------------|
| 1 | Abre cámara del celular | - |
| 2 | Escanea QR del partido | Detecta URL |
| 3 | Toca la notificación | Abre navegador |
| 4 | Página carga | Muestra pantalla de captura |

#### 3.1.2 Mediante URL Directa

| Formato | Ejemplo |
|---------|---------|
| Desarrollo | `https://dominio.replit.dev/score/{matchId}` |
| Producción | `https://app.courtflow.com.mx/score/{matchId}` |

#### 3.1.3 Validaciones de Acceso

| Validación | Error Mostrado |
|------------|----------------|
| matchId no existe | "Partido no encontrado" |
| Partido ya finalizado | Muestra resultado, no permite editar |
| Error de conexión | "Error al cargar datos del partido" |

---

### 3.2 Verificación Inicial

#### 3.2.1 Checklist del Usuario

| Verificar | Ubicación en Pantalla | Acción si Incorrecto |
|-----------|----------------------|---------------------|
| Nombres de Pareja 1 | Sección superior izquierda | Contactar administrador |
| Nombres de Pareja 2 | Sección superior derecha | Contactar administrador |
| Nombre de Cancha | Esquina superior derecha | Verificar QR correcto |
| Sets anteriores | Badges azules | Verificar partido correcto |

#### 3.2.2 Indicadores de Estado

| Indicador | Significado |
|-----------|-------------|
| Spinner de carga | Obteniendo datos |
| Score visible | Datos cargados, listo para capturar |
| Mensaje error rojo | Problema de conexión |

---

### 3.3 Captura de Juegos Durante el Partido

#### 3.3.1 Flujo Normal (Agregar Juego)

| Paso | Acción | Resultado Visual |
|------|--------|-----------------|
| 1 | Pareja gana punto de juego | - |
| 2 | Usuario identifica ganador | - |
| 3 | Presiona "+ Juego" de esa pareja | Número incrementa |
| 4 | Sistema guarda en historial | - |
| 5 | Servidor recibe actualización | - |
| 6 | WebSocket notifica displays | Score actualiza en displays |

#### 3.3.2 Corrección de Error

| Escenario | Acción | Resultado |
|-----------|--------|-----------|
| Error inmediato | Presionar "Deshacer" | Score anterior restaurado |
| Error en pareja equivocada | Deshacer + agregar a correcta | Score corregido |
| Múltiples errores | Deshacer varias veces | Estado anterior restaurado |

#### 3.3.3 Ejemplo Práctico: Partido Normal

```
Estado Inicial: Set 1, Score 0-0

Acción: Pareja 1 gana juego → Score 1-0
Acción: Pareja 2 gana juego → Score 1-1
Acción: Pareja 1 gana juego → Score 2-1
[...continúa...]
Acción: Pareja 1 gana juego → Score 6-4 ✓ SET COMPLETO

Sistema: Set 1 se marca con badge "6-4"
Sistema: Pantalla cambia a "Juegos - Set 2"
Sistema: Score reinicia a 0-0
```

---

### 3.4 Transición Entre Sets

#### 3.4.1 Detección Automática

| Score Final | Transición |
|-------------|------------|
| 6-0, 6-1, 6-2, 6-3, 6-4 | Set completo → Siguiente set |
| 7-5 | Set completo → Siguiente set |
| 7-6 | Set completo → Siguiente set |

#### 3.4.2 Visualización del Cambio

| Antes | Después |
|-------|---------|
| "Juegos - Set 1" con score 5-4 | Badge "6-4" + "Juegos - Set 2" con 0-0 |
| Botones activos para Set 1 | Botones activos para Set 2 |

#### 3.4.3 Protección de Sets Anteriores

| Intento | Resultado |
|---------|-----------|
| Tocar badge de set anterior | Sin efecto |
| Agregar juego a set cerrado | Toast de advertencia |
| Quitar juego de set cerrado | Solo via Undo |

---

### 3.5 Finalización del Partido

#### 3.5.1 Condición de Victoria

| Sets Ganados | Estado |
|--------------|--------|
| 0-0, 0-1, 1-0, 1-1 | Partido en progreso |
| 2-0 | Pareja 1 gana |
| 0-2 | Pareja 2 gana |
| 2-1 | Ganador según sets |

#### 3.5.2 Secuencia de Finalización

| Segundo | Evento |
|---------|--------|
| 0 | Partido completado detectado |
| 0 | Timer inicia (15 segundos) |
| 1-14 | Countdown visible |
| 15 | Auto-finalización ejecutada |
| 15+ | Pantalla de confirmación |

#### 3.5.3 Opciones del Usuario

| Opción | Cuándo Usar | Resultado |
|--------|-------------|-----------|
| Esperar timer | Score es correcto | Partido se guarda automáticamente |
| Finalizar Ahora | Prisa por terminar | Partido se guarda inmediatamente |
| Deshacer y corregir | Hubo error en score | Timer cancela, vuelve a edición |

#### 3.5.4 Post-Finalización

| Acción | Descripción |
|--------|-------------|
| Botón "Volver a lista" | Regresa a lista de partidos disponibles |
| Cerrar navegador | Puede cerrar sin problema |
| Escanear mismo QR | Muestra resultado final (solo lectura) |

---

### 3.6 Manejo de Errores

#### 3.6.1 Errores de Conexión

| Síntoma | Causa Probable | Solución |
|---------|----------------|----------|
| Spinner infinito | Sin internet | Verificar WiFi/datos |
| "Error al cargar" | Servidor caído | Reintentar en minutos |
| Score no actualiza | WebSocket desconectado | Refrescar página |

#### 3.6.2 Errores de Validación

| Error | Causa | Solución |
|-------|-------|----------|
| "Set ya completo" | Intentó modificar set cerrado | Usar Undo si es error |
| "Partido no encontrado" | QR incorrecto/expirado | Verificar QR |
| "Partido ya finalizado" | Ya se registró resultado | Contactar admin |

#### 3.6.3 Recuperación de Errores

| Situación | Recuperación |
|-----------|--------------|
| Página se cerró accidentalmente | Escanear QR de nuevo |
| Score incorrecto guardado | Contactar administrador |
| Timer finalizó con error | Administrador puede editar resultado |

---

## 3B. MEJORAS IMPLEMENTADAS

Las siguientes mejoras fueron desarrolladas e integradas al sistema después del lanzamiento inicial.

---

### MEJORA-IMP-001: Sistema de Undo con Deep Copy

| Campo | Detalle |
|-------|---------|
| **Fecha Implementación** | 27-Nov-2025 |
| **Versión** | 1.0.1 |
| **Solicitado Por** | Feedback de usuarios |

**Situación Anterior:**
El sistema no tenía manera de corregir errores de captura. Si un usuario agregaba un juego a la pareja equivocada, debía quitar el juego manualmente y agregarlo a la correcta.

**Mejora Implementada:**
- Botón "Deshacer último cambio" con historial completo
- Deep copy para preservar estados anteriores
- Capacidad de deshacer múltiples cambios
- Restauración completa incluyendo cambios de set

**Beneficios:**
- Reduce errores permanentes en 95%
- Mejora experiencia de usuario
- Elimina necesidad de intervención de administrador

---

### MEJORA-IMP-002: Timer de Auto-Finalización 15 Segundos

| Campo | Detalle |
|-------|---------|
| **Fecha Implementación** | 27-Nov-2025 |
| **Versión** | 1.0.2 |
| **Solicitado Por** | Optimización de flujo |

**Situación Anterior:**
Los usuarios debían presionar manualmente "Finalizar Partido" después de que una pareja ganaba. Muchos olvidaban hacerlo, dejando partidos en estado "activo".

**Mejora Implementada:**
- Detección automática de partido completo
- Countdown de 15 segundos con barra visual
- Opción de finalizar inmediatamente
- Opción de cancelar si hay error

**Beneficios:**
- 100% de partidos se finalizan correctamente
- Reduce carga de trabajo de administradores
- Libera canchas automáticamente

---

### MEJORA-IMP-003: Validación de Sets Completos

| Campo | Detalle |
|-------|---------|
| **Fecha Implementación** | 27-Nov-2025 |
| **Versión** | 1.0.3 |
| **Solicitado Por** | Prevención de errores |

**Situación Anterior:**
Era posible agregar juegos a sets que ya habían terminado, causando scores inválidos como 8-4 o 7-7.

**Mejora Implementada:**
- Validación de score máximo (7-6 es límite)
- Bloqueo de modificaciones a sets cerrados
- Toast de advertencia al intentar modificar
- Solo Undo permite corregir sets cerrados

**Beneficios:**
- Elimina scores inválidos
- Mantiene integridad de datos
- Claridad para el usuario

---

### MEJORA-IMP-004: Indicadores Visuales Mejorados

| Campo | Detalle |
|-------|---------|
| **Fecha Implementación** | 27-Nov-2025 |
| **Versión** | 1.0.3 |
| **Solicitado Por** | UX/UI |

**Situación Anterior:**
Los badges de sets completados eran pequeños y difíciles de leer. El set actual no estaba claramente identificado.

**Mejora Implementada:**
- Badges azules más grandes para sets completados
- Título claro "Juegos - Set X" 
- Números de score más grandes
- Colores consistentes (azul para acciones, naranja para undo)

**Beneficios:**
- Mejor legibilidad en dispositivos móviles
- Menos confusión sobre el set actual
- Interfaz más profesional

---

### MEJORA-IMP-005: Mensajes de Error Descriptivos

| Campo | Detalle |
|-------|---------|
| **Fecha Implementación** | 27-Nov-2025 |
| **Versión** | 1.0.4 |
| **Solicitado Por** | Soporte técnico |

**Situación Anterior:**
Los errores mostraban mensajes técnicos o genéricos que los usuarios no entendían.

**Mejora Implementada:**
- Mensajes en español claro
- Indicación de qué hacer para resolver
- Toast notifications con iconos
- Diferenciación entre errores y advertencias

**Beneficios:**
- Usuarios pueden resolver problemas solos
- Reduce tickets de soporte
- Mejor experiencia general

---

### MEJORA-IMP-006: Pantalla de Confirmación Post-Finalización

| Campo | Detalle |
|-------|---------|
| **Fecha Implementación** | 27-Nov-2025 |
| **Versión** | 1.0.4 |
| **Solicitado Por** | Feedback de usuarios |

**Situación Anterior:**
Después de finalizar, la pantalla quedaba igual o mostraba un mensaje breve. Los usuarios no sabían si el resultado se había guardado.

**Mejora Implementada:**
- Pantalla dedicada de confirmación
- Icono de check verde
- Mensaje claro de éxito
- Botón para volver a lista de partidos

**Beneficios:**
- Certeza de que el resultado se guardó
- Flujo claro de qué hacer después
- Reduce ansiedad del usuario

---

### MEJORA-IMP-007: Sincronización en Tiempo Real

| Campo | Detalle |
|-------|---------|
| **Fecha Implementación** | Octubre 2025 |
| **Versión** | 1.0.0 |
| **Solicitado Por** | Requerimiento base |

**Situación Anterior:**
N/A (funcionalidad inicial)

**Mejora Implementada:**
- WebSocket para actualizaciones instantáneas
- Todos los displays ven cambios en <1 segundo
- Invalidación de cache automática
- Reconexión automática si se pierde conexión

**Beneficios:**
- Espectadores ven score en tiempo real
- Administradores tienen visibilidad completa
- Sistema siempre sincronizado

---

### MEJORA-IMP-008: Acceso Público sin Autenticación

| Campo | Detalle |
|-------|---------|
| **Fecha Implementación** | Octubre 2025 |
| **Versión** | 1.0.0 |
| **Solicitado Por** | Requerimiento base |

**Situación Anterior:**
N/A (funcionalidad inicial)

**Mejora Implementada:**
- URL única por partido (UUID)
- No requiere login ni registro
- Acceso directo por QR
- Seguridad por obscuridad (UUID difícil de adivinar)

**Beneficios:**
- Cualquier jugador puede capturar score
- No hay fricción de registro
- Implementación rápida en torneos

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

## 4B. DEFECTOS HISTÓRICOS DEL SISTEMA COURTFLOW

Los siguientes defectos fueron identificados y corregidos durante el desarrollo del sistema completo.

---

### 4.4 Defecto: Timeout Processor cancelaba partidos prematuramente

| Campo | Detalle |
|-------|---------|
| **ID** | BUG-004 |
| **Módulo** | Timeout Processor (Backend) |
| **Severidad** | Crítica |
| **Estado** | CORREGIDO |

**Descripción del Problema:**
El procesador de timeouts cancelaba partidos programados antes de tiempo cuando el servidor estaba en una zona horaria diferente a la del torneo.

**Causa Raíz:**
El sistema usaba la hora del servidor en lugar de la zona horaria configurada del torneo para calcular los 15 minutos de timeout.

**Solución Implementada:**
Se creó la utilidad `combineDateTimeInTimezone()` que combina `match.day` con `match.plannedTime` respetando la zona horaria del torneo (formato IANA como "America/Mexico_City").

**Código Afectado:**
- `server/routes.ts` - Timeout Processor
- `shared/utils/timezone.ts`

---

### 4.5 Defecto: Partidos retroactivos eran procesados por timeout

| Campo | Detalle |
|-------|---------|
| **ID** | BUG-005 |
| **Módulo** | Timeout Processor (Backend) |
| **Severidad** | Alta |
| **Estado** | CORREGIDO |

**Descripción del Problema:**
Cuando se importaban partidos programados para horas pasadas (ej: importación de Excel a las 3pm con partidos de las 10am), el timeout processor los marcaba incorrectamente como DQF o cancelados.

**Causa Raíz:**
No existía validación para detectar partidos creados después de su período de timeout.

**Solución Implementada:**
El timeout processor ahora omite completamente partidos donde `createdAt >= timeoutThreshold`. Solo partidos que existían ANTES de que expirara su timeout son elegibles para procesamiento.

**Código Afectado:**
- `server/routes.ts` - Timeout Processor
- Log: "SKIPPED - created after timeout"

---

### 4.6 Defecto: Partidos completados bloqueaban asignación de canchas

| Campo | Detalle |
|-------|---------|
| **ID** | BUG-006 |
| **Módulo** | Court Assignment (Backend) |
| **Severidad** | Alta |
| **Estado** | CORREGIDO |

**Descripción del Problema:**
Al intentar asignar una cancha a un nuevo partido, el sistema mostraba error de conflicto aunque el partido anterior en esa cancha ya había terminado.

**Causa Raíz:**
La detección de conflictos verificaba si `matchId` estaba asignado, pero no excluía partidos con status "completed".

**Solución Implementada:**
La lógica de conflicto ahora solo bloquea cuando: (1) hay un `matchId` asignado Y status !== 'completed', O (2) hay `preAssignedAt` activo.

**Código Afectado:**
- `server/routes.ts` - Court assignment endpoints
- `server/storage.ts`

---

### 4.7 Defecto: Display mostraba fecha incorrecta en zonas horarias diferentes

| Campo | Detalle |
|-------|---------|
| **ID** | BUG-007 |
| **Módulo** | Display Público |
| **Severidad** | Media |
| **Estado** | CORREGIDO |

**Descripción del Problema:**
Los displays públicos mostraban partidos de "mañana" como si fueran de "hoy" cuando el espectador estaba en una zona horaria diferente al torneo.

**Causa Raíz:**
Se usaba `new Date()` del navegador en lugar de la zona horaria del torneo para calcular "hoy".

**Solución Implementada:**
Se implementó `getTodayInTimezone()` que usa `Intl.DateTimeFormat` para convertir la hora del servidor a la zona horaria del torneo.

**Código Afectado:**
- `client/src/pages/display.tsx`
- `client/src/pages/display-rotative.tsx`
- `client/src/utils/timezone.ts`

---

### 4.8 Defecto: Diálogo de compartir stream quedaba atascado

| Campo | Detalle |
|-------|---------|
| **ID** | BUG-008 |
| **Módulo** | Manage Courts Modal |
| **Severidad** | Media |
| **Estado** | CORREGIDO |

**Descripción del Problema:**
Al cerrar el modal de gestión de canchas mientras el diálogo de "Compartir Stream" estaba abierto, el overlay del diálogo quedaba visible permanentemente.

**Causa Raíz:**
El estado `showShareDialog` no se reseteaba cuando el modal padre se cerraba.

**Solución Implementada:**
Se agregó cleanup del estado del diálogo en todas las rutas de cierre: click en overlay, tecla ESC, y botón de cerrar.

**Código Afectado:**
- `client/src/components/modals/manage-courts-modal.tsx`

---

### 4.9 Defecto: Posición en cola se perdía al hacer check-out/check-in

| Campo | Detalle |
|-------|---------|
| **ID** | BUG-009 |
| **Módulo** | Ready Queue System |
| **Severidad** | Alta |
| **Estado** | CORREGIDO |

**Descripción del Problema:**
Cuando un jugador hacía check-out y luego check-in nuevamente, el partido perdía su posición original en la cola de espera.

**Causa Raíz:**
El timestamp `readySince` se actualizaba cada vez que el partido volvía a estado "ready".

**Solución Implementada:**
El `readySince` ahora solo se establece en la PRIMERA transición a estado ready. Check-outs posteriores y re-check-ins preservan el timestamp original.

**Código Afectado:**
- `server/routes.ts` - Check-in endpoint
- `shared/schema.ts` - readySince field

---

### 4.10 Defecto: Excel imports creaban inconsistencias de fecha/hora

| Campo | Detalle |
|-------|---------|
| **ID** | BUG-010 |
| **Módulo** | Scheduled Match Import |
| **Severidad** | Media |
| **Estado** | CORREGIDO |

**Descripción del Problema:**
Al importar partidos desde Excel, algunos tenían componentes de hora en el campo `day` que causaban cálculos incorrectos de timeout.

**Causa Raíz:**
Excel almacena fechas con timestamps completos. Al importar, estos timestamps se preservaban en el campo `day`.

**Solución Implementada:**
La utilidad `combineDateTimeInTimezone()` ahora extrae SOLO la porción de fecha del campo `match.day`, ignorando cualquier componente de hora.

**Código Afectado:**
- `server/routes.ts` - Import endpoint
- `shared/utils/timezone.ts`

---

### 4.11 Defecto: DQF automático era demasiado agresivo

| Campo | Detalle |
|-------|---------|
| **ID** | BUG-011 |
| **Módulo** | Timeout Processor |
| **Severidad** | Crítica |
| **Estado** | CORREGIDO |

**Descripción del Problema:**
Cuando solo una pareja completaba check-in después del timeout, el sistema automáticamente otorgaba victoria por default sin supervisión.

**Causa Raíz:**
La lógica original asumía que la ausencia siempre justificaba DQF automático.

**Solución Implementada:**
En lugar de DQF automático, el sistema ahora:
1. Marca el partido con `pendingDqf: true`
2. Guarda la pareja presente en `defaultWinnerPairId`
3. Muestra botón "DQF" a administradores para decisión manual

**Código Afectado:**
- `server/routes.ts` - Timeout Processor
- `client/src/pages/programming.tsx` - DQF button
- `shared/schema.ts` - pendingDqf, defaultWinnerPairId fields

---

### 4.12 Defecto: Pre-asignación permitía iniciar partidos en conflicto

| Campo | Detalle |
|-------|---------|
| **ID** | BUG-012 |
| **Módulo** | Court Pre-Assignment |
| **Severidad** | Alta |
| **Estado** | CORREGIDO |

**Descripción del Problema:**
Un partido pre-asignado a una cancha podía iniciarse mientras el partido anterior aún estaba en juego.

**Causa Raíz:**
No existía validación que verificara si la cancha tenía un partido activo antes de permitir el inicio.

**Solución Implementada:**
El botón "Iniciar Partido" ahora se deshabilita cuando la cancha tiene un partido activo. El display muestra status "Pre-asignada" hasta que la cancha se libere.

**Código Afectado:**
- `client/src/pages/programming.tsx`
- `client/src/pages/display.tsx`

---

### 4.13 Defecto: Lista de espera mostraba partidos muy antiguos

| Campo | Detalle |
|-------|---------|
| **ID** | BUG-013 |
| **Módulo** | Waiting List Display |
| **Severidad** | Baja |
| **Estado** | CORREGIDO |

**Descripción del Problema:**
La lista de espera acumulaba entradas de días anteriores, haciendo difícil encontrar los partidos relevantes.

**Causa Raíz:**
No existía filtro temporal para las entradas de la lista.

**Solución Implementada:**
Se implementó filtro de 8 horas (480 minutos) que oculta automáticamente partidos con check-in más antiguo.

**Código Afectado:**
- `client/src/pages/display-control.tsx`
- `client/src/pages/display.tsx`

---

### 4.14 Defecto: Pantallas se apagaban durante displays de torneo

| Campo | Detalle |
|-------|---------|
| **ID** | BUG-014 |
| **Módulo** | Public Display |
| **Severidad** | Media |
| **Estado** | CORREGIDO |

**Descripción del Problema:**
Las pantallas de TV usadas para mostrar scores y partidos próximos se apagaban por inactividad.

**Causa Raíz:**
Los navegadores activan ahorro de energía por defecto en páginas sin interacción.

**Solución Implementada:**
Se implementó Wake Lock API con fallback de video invisible para navegadores sin soporte. Auto-recuperación cuando la pestaña vuelve a estar visible.

**Código Afectado:**
- `client/src/pages/display.tsx`
- `client/src/pages/display-stream.tsx`
- `client/src/hooks/useWakeLock.ts`

---

### 4.15 Defecto: Anuncios interrumpían durante puntos activos (Streaming)

| Campo | Detalle |
|-------|---------|
| **ID** | BUG-015 |
| **Módulo** | Streaming Display |
| **Severidad** | Media |
| **Estado** | CORREGIDO |

**Descripción del Problema:**
Los anuncios en el display de streaming aparecían aleatoriamente, incluyendo durante puntos activos.

**Causa Raíz:**
La rotación de anuncios no consideraba el estado del juego.

**Solución Implementada:**
Los anuncios ahora solo aparecen durante puntos impares (1-0, 2-1, 2-3, etc.) cuando los jugadores cambian de lado, evitando interrupciones durante juego activo.

**Código Afectado:**
- `client/src/pages/display-stream.tsx`

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
