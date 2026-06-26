type SerialPortLike = {
  readable: ReadableStream<Uint8Array> | null;
  open(options: { baudRate: number }): Promise<void>;
  close(): Promise<void>;
};

type NavigatorConSerial = Navigator & {
  serial?: {
    requestPort(): Promise<SerialPortLike>;
  };
};

const MENSAJE_SIN_SOPORTE = 'Tu navegador no soporta conexión de báscula. Usa Chrome o Edge.';
const BAUD_RATE_BASCULA = 9600;
const TIEMPO_MAXIMO_LECTURA_MS = 3000;

export function verificarSoporte(): boolean {
  return typeof navigator !== 'undefined' && 'serial' in navigator;
}

export async function conectarBascula(): Promise<SerialPortLike> {
  try {
    const navegador = navigator as NavigatorConSerial;

    if (!navegador.serial) {
      throw new Error(MENSAJE_SIN_SOPORTE);
    }

    const puerto = await navegador.serial.requestPort();
    await puerto.open({ baudRate: BAUD_RATE_BASCULA });
    return puerto;
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('No se pudo conectar la báscula.');
  }
}

function parsearPeso(texto: string): number | null {
  const coincidencia = texto.replace(',', '.').match(/-?\d+(?:\.\d+)?/);
  if (!coincidencia) return null;

  const peso = Number(coincidencia[0]);
  return Number.isFinite(peso) ? peso : null;
}

export async function leerPeso(puerto: SerialPortLike): Promise<number> {
  try {
    if (!puerto.readable) {
      throw new Error('La báscula no está lista para enviar datos.');
    }

    const reader = puerto.readable.getReader();
    const decoder = new TextDecoder();
    let textoRecibido = '';

    try {
      const inicio = Date.now();
      while (Date.now() - inicio < TIEMPO_MAXIMO_LECTURA_MS) {
        const restante = TIEMPO_MAXIMO_LECTURA_MS - (Date.now() - inicio);
        const resultado = await Promise.race([
          reader.read(),
          new Promise<{ timeout: true }>((resolve) => {
            setTimeout(() => resolve({ timeout: true }), restante);
          }),
        ]);

        if ('timeout' in resultado) break;
        if (resultado.done) break;

        if (resultado.value) {
          textoRecibido += decoder.decode(resultado.value, { stream: true });
          const peso = parsearPeso(textoRecibido);
          if (peso !== null) return peso;
        }
      }
    } finally {
      reader.releaseLock();
    }

    throw new Error('No se recibió un peso válido de la báscula.');
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('No se pudo leer el peso de la báscula.');
  }
}

export async function desconectarBascula(puerto: SerialPortLike): Promise<void> {
  try {
    await puerto.close();
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('No se pudo desconectar la báscula.');
  }
}
