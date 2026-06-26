type EscanerCallback = (codigo: string) => void;

const TIEMPO_MAXIMO_ENTRE_TECLAS_MS = 50;

function esElementoEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tagName = target.tagName.toLowerCase();
  return tagName === 'input' || tagName === 'textarea' || tagName === 'select' || target.isContentEditable;
}

class EscanerFisico {
  private buffer = '';
  private ultimaTecla = 0;
  private secuenciaRapida = true;
  private callback: EscanerCallback | null = null;
  private escuchando = false;

  iniciar(callback: EscanerCallback) {
    this.callback = callback;

    if (this.escuchando || typeof document === 'undefined') return;

    document.addEventListener('keydown', this.handleKeyDown);
    this.escuchando = true;
  }

  detener() {
    if (typeof document !== 'undefined' && this.escuchando) {
      document.removeEventListener('keydown', this.handleKeyDown);
    }

    this.buffer = '';
    this.ultimaTecla = 0;
    this.secuenciaRapida = true;
    this.callback = null;
    this.escuchando = false;
  }

  private limpiarBuffer() {
    this.buffer = '';
    this.ultimaTecla = 0;
    this.secuenciaRapida = true;
  }

  private handleKeyDown = (event: KeyboardEvent) => {
    if (esElementoEditable(event.target)) {
      this.limpiarBuffer();
      return;
    }

    const ahora = Date.now();

    if (event.key === 'Enter') {
      const codigo = this.buffer.trim();
      const enterRapido = this.ultimaTecla > 0 && ahora - this.ultimaTecla < TIEMPO_MAXIMO_ENTRE_TECLAS_MS;
      if (codigo.length > 1 && this.secuenciaRapida && enterRapido) {
        this.callback?.(codigo);
      }
      this.limpiarBuffer();
      return;
    }

    if (event.key.length !== 1 || event.ctrlKey || event.altKey || event.metaKey) return;

    if (!this.buffer) {
      this.buffer = event.key;
      this.ultimaTecla = ahora;
      this.secuenciaRapida = true;
      return;
    }

    const diferencia = ahora - this.ultimaTecla;
    if (diferencia >= TIEMPO_MAXIMO_ENTRE_TECLAS_MS) {
      this.buffer = event.key;
      this.secuenciaRapida = true;
    } else {
      this.buffer += event.key;
    }

    this.ultimaTecla = ahora;
  };
}

const escanerFisico = new EscanerFisico();

export function iniciar(callback: EscanerCallback) {
  escanerFisico.iniciar(callback);
}

export function detener() {
  escanerFisico.detener();
}

export default escanerFisico;
