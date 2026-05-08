export function formatoAR(numero, decimales = 0) {
  return Number(numero).toLocaleString("es-AR", {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  });
}
