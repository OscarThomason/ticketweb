import * as XLSX from "xlsx";

export function exportTicketsToCsv(tickets, users = [], teams = [], filename = "historial-tickets.xlsx") {
  const rows = tickets.map((ticket) => {
    const creator = users.find((user) => user.id === ticket.createdBy);
    const team = teams.find((item) => item.memberIds?.includes(ticket.createdBy));

    return {
      id: ticket.id,
      titulo: ticket.title,
      solicitante: creator?.name || ticket.createdBy || "",
      equipo: team?.name || "",
      categoria: ticket.category,
      actividad: ticket.activity,
      prioridad: ticket.priority,
      estado: ticket.status,
      fecha_creacion: new Date(ticket.createdAt).toLocaleString("es-MX"),
      ultima_actualizacion: new Date(ticket.updatedAt || ticket.createdAt).toLocaleString("es-MX"),
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Historial");

  worksheet["!cols"] = [
    { wch: 18 },
    { wch: 36 },
    { wch: 24 },
    { wch: 24 },
    { wch: 18 },
    { wch: 12 },
    { wch: 14 },
    { wch: 14 },
    { wch: 22 },
    { wch: 22 },
  ];

  XLSX.writeFile(workbook, filename);
}
