import JsBarcode from "jsbarcode";
import { jsPDF } from "jspdf";

function buildBarcodeValue(item) {
  return (item.serialNumber || item.id || "SIN-SERIE").toUpperCase();
}

function createBarcodeDataUrl(item) {
  const canvas = document.createElement("canvas");
  JsBarcode(canvas, buildBarcodeValue(item), {
    format: "CODE128",
    displayValue: true,
    fontSize: 14,
    height: 56,
    width: 1.6,
    margin: 0,
    background: "#ffffff",
    lineColor: "#111827",
  });
  return canvas.toDataURL("image/png");
}

export function generateInventoryLabelPdf(item) {
  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: [62, 100],
  });
  const barcodeImage = createBarcodeDataUrl(item);
  const serial = buildBarcodeValue(item);

  pdf.setFillColor(255, 255, 255);
  pdf.rect(0, 0, 100, 62, "F");

  pdf.setDrawColor(30, 91, 181);
  pdf.setLineWidth(0.6);
  pdf.roundedRect(3, 3, 94, 56, 3, 3, "S");

  pdf.setFillColor(30, 91, 181);
  pdf.roundedRect(3, 3, 94, 10, 3, 3, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  pdf.text("Etiqueta de Inventario TI", 6, 9.5);

  pdf.setTextColor(15, 42, 94);
  pdf.setFontSize(9);
  pdf.text(`Equipo: ${item.assetName || "Sin nombre"}`, 6, 18);
  pdf.text(`Modelo: ${item.model || "Sin modelo"}`, 6, 23);
  pdf.text(`Serie: ${serial}`, 6, 28);
  pdf.text(`Marca: ${item.brand || "Sin marca"}`, 6, 33);

  pdf.addImage(barcodeImage, "PNG", 8, 36, 84, 16);

  pdf.setDrawColor(204, 224, 255);
  pdf.line(6, 54, 94, 54);
  pdf.setFontSize(7);
  pdf.text("Uso interno. Colocar esta etiqueta en una zona visible del equipo.", 6, 58);

  pdf.save(`etiqueta-${serial}.pdf`);
}
