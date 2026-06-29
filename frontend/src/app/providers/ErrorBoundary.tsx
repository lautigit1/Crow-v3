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
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
          fontFamily: "DM Sans, system-ui, sans-serif",
          background: "#F8FAFC",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: "#FEE2E2",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 28,
            marginBottom: 24,
          }}
        >
          ⚠️
        </div>

        <h1
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: "#07111F",
            marginBottom: 8,
          }}
        >
          Algo salió mal
        </h1>

        <p
          style={{
            fontSize: 14,
            color: "#64748B",
            maxWidth: 380,
            lineHeight: 1.6,
            marginBottom: 24,
          }}
        >
          Ocurrió un error inesperado en {section}. Podés intentar recargar la
          página. Si el problema persiste, contactá al administrador.
        </p>

        {this.state.error && (
          <pre
            style={{
              background: "#1E293B",
              color: "#F1F5F9",
              fontSize: 11,
              padding: "12px 16px",
              borderRadius: 8,
              maxWidth: 480,
              width: "100%",
              overflowX: "auto",
              textAlign: "left",
              marginBottom: 24,
            }}
          >
            {this.state.error.message}
          </pre>
        )}

        <div style={{ display: "flex", gap: 12 }}>
          <button
            onClick={this.handleReset}
            style={{
              padding: "10px 20px",
              borderRadius: 8,
              border: "1.5px solid #0057D9",
              background: "transparent",
              color: "#0057D9",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Reintentar
          </button>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: "10px 20px",
              borderRadius: 8,
              border: "none",
              background: "#0057D9",
              color: "#fff",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Recargar página
          </button>
        </div>
      </div>
    );
  }
}
