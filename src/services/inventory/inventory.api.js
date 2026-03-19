import { apiRequest, isBackendEnabled } from "../api/http-client.js";
import { inventoryRepository } from "./inventory.repository.local.js";

function toAbsoluteUploadPath(pathValue) {
  const base = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
  if (!base || !pathValue) return null;
  if (String(pathValue).startsWith("http")) return pathValue;
  return `${base}/uploads/${String(pathValue).replace(/^\/+/, "")}`;
}

function normalizeInventoryItem(item) {
  const comments = Array.isArray(item.commentsJson)
    ? item.commentsJson
    : Array.isArray(item.comments)
      ? item.comments
      : [];

  const responsiva = item.responsivaPath
    ? {
        id: `server-${item.id}`,
        name: item.responsivaName || "responsiva.pdf",
        size: item.responsivaSize || 0,
        type: item.responsivaMime || "application/pdf",
        uploadedAt: item.updatedAt,
        path: toAbsoluteUploadPath(item.responsivaPath),
      }
    : item.responsiva || null;

  return {
    ...item,
    comments,
    responsiva,
  };
}

async function toBase64(file) {
  const buffer = await file.arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export const inventoryApi = {
  getAll: async () => {
    if (!isBackendEnabled()) {
      return inventoryRepository.getAll();
    }
    const rows = await apiRequest("/api/inventory");
    return rows.map(normalizeInventoryItem);
  },

  create: async (data) => {
    if (!isBackendEnabled()) {
      return inventoryRepository.create(data);
    }
    const created = await apiRequest("/api/inventory", {
      method: "POST",
      body: JSON.stringify(data),
    });
    return normalizeInventoryItem(created);
  },

  update: async (id, updates) => {
    if (!isBackendEnabled()) {
      return inventoryRepository.update(id, updates);
    }
    const updated = await apiRequest(`/api/inventory/${id}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    });
    return normalizeInventoryItem(updated);
  },

  addComment: async (id, comment) => {
    if (!isBackendEnabled()) {
      return inventoryRepository.addComment(id, comment);
    }
    const updated = await apiRequest(`/api/inventory/${id}/comments`, {
      method: "POST",
      body: JSON.stringify(comment),
    });
    return normalizeInventoryItem(updated);
  },

  uploadResponsiva: async (id, file) => {
    if (!isBackendEnabled()) {
      return null;
    }
    const base64 = await toBase64(file);
    const updated = await apiRequest(`/api/inventory/${id}/responsiva`, {
      method: "PUT",
      body: JSON.stringify({
        fileName: file.name,
        mimeType: file.type || "application/pdf",
        sizeBytes: file.size,
        base64,
      }),
    });
    return normalizeInventoryItem(updated);
  },
};

