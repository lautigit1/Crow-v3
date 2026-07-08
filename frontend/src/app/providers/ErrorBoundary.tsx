import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  /** Nombre de sección para el mensaje de error (ej: "el panel admin"). */
  section?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary global.
 * Captura cualquier error no manejado en el árbol hijo y muestra
 * una UI de fallback en lugar de pantalla en blanco.
 *
 * Uso:
 *   <ErrorBoundary>
 *     <App />
 *   </ErrorBoundary>
 *
 *   <ErrorBoundary section="el panel admin">
 *     <AdminLayout />
 *   </ErrorBoundary>
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // En el futuro se puede enviar a Sentry aquí:
    // Sentry.captureException(error, { extra: info });
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const section = this.props.section ?? "la aplicación";

    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 font-body bg-surface text-center">
        <div className="w-14 h-14 rounded-full bg-dangerSoft flex items-center justify-center text-[28px] mb-6">
          ⚠️
        </div>

        <h1 className="text-[22px] font-bold text-ink900 mb-2">
          Algo salió mal
        </h1>

        <p className="text-sm text-textFaint max-w-[380px] leading-[1.6] mb-6">
          Ocurrió un error inesperado en {section}. Podés intentar recargar la
          página. Si el problema persiste, contactá al administrador.
        </p>

        {this.state.error && (
          <pre className="bg-ink700 text-[#F1F5F9] text-[11px] py-3 px-4 rounded-md max-w-[480px] w-full overflow-x-auto text-left mb-6">
            {this.state.error.message}
          </pre>
        )}

        <div className="flex gap-3">
          <button
            onClick={this.handleReset}
            className="py-2.5 px-5 rounded-md border-[1.5px] border-primary bg-transparent text-primary text-sm font-semibold cursor-pointer"
          >
            Reintentar
          </button>
          <button
            onClick={() => window.location.reload()}
            className="py-2.5 px-5 rounded-md border-none bg-primary text-white text-sm font-semibold cursor-pointer"
          >
            Recargar página
          </button>
        </div>
      </div>
    );
  }
}
