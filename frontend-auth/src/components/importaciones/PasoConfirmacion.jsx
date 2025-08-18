export default function PasoConfirmacion({ resumen }) {
  return (
    <div>
      <h3>Resultados guardados</h3>
      <p>{resumen.inserted} insertados, {resumen.updated} actualizados, {resumen.incidents} incidencias.</p>
    </div>
  );
}
