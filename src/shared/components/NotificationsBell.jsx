import { Bell } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from "../../services/notifications/use-notifications.js";

function formatRelativeDate(value) {
  if (!value) return "";
  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(1, Math.floor(diffMs / 60000));
  if (diffMinutes < 60) return `hace ${diffMinutes} min`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `hace ${diffHours} h`;
  const diffDays = Math.floor(diffHours / 24);
  return `hace ${diffDays} d`;
}

function dispatchNotificationOpen(item) {
  if (!item?.entityId || item.entityType !== "ticket") return;

  window.dispatchEvent(
    new CustomEvent("ticketweb:open-ticket", {
      detail: {
        ticketId: item.entityId,
      },
    }),
  );
}

function canUseBrowserNotifications() {
  return typeof window !== "undefined" && "Notification" in window;
}

function playNotificationSound() {
  if (typeof window === "undefined" || typeof window.AudioContext === "undefined") return;

  const audioContext = new window.AudioContext();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(660, audioContext.currentTime + 0.16);

  gainNode.gain.setValueAtTime(0.0001, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.045, audioContext.currentTime + 0.02);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.28);

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  oscillator.start();
  oscillator.stop(audioContext.currentTime + 0.3);

  oscillator.onended = () => {
    audioContext.close().catch(() => {});
  };
}

export default function NotificationsBell({ compact = false }) {
  const { data, error } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const items = useMemo(() => data?.items || [], [data]);
  const unreadCount = Number(data?.unreadCount || 0);
  const panelWidth = compact ? "min(84vw, 320px)" : "min(92vw, 360px)";
  const isMobilePanel = compact;
  const seenIdsRef = useRef(new Set());
  const [permission, setPermission] = useState(() =>
    canUseBrowserNotifications() ? window.Notification.permission : "unsupported",
  );
  const permissionMessage = useMemo(() => {
    if (permission === "granted") return "Alertas del navegador activadas";
    if (permission === "denied") return "Las alertas del navegador están bloqueadas";
    if (permission === "unsupported") return "Tu navegador no soporta alertas nativas";
    return "Activa alertas del navegador";
  }, [permission]);

  useEffect(() => {
    if (!items.length) return;

    if (seenIdsRef.current.size === 0) {
      items.forEach((item) => seenIdsRef.current.add(item.id));
      return;
    }

    const newItems = items.filter((item) => !seenIdsRef.current.has(item.id));
    newItems.forEach((item) => seenIdsRef.current.add(item.id));

    if (!newItems.length) return;

    const unreadNewItems = newItems.filter((item) => !item.readAt);
    if (unreadNewItems.length) {
      playNotificationSound();
    }

    if (permission !== "granted") return;

    unreadNewItems
      .forEach((item) => {
        const notification = new window.Notification(item.title, {
          body: item.message,
          tag: item.id,
        });

        notification.onclick = () => {
          window.focus();
          dispatchNotificationOpen(item);
          notification.close();
        };
      });
  }, [items, permission]);

  const requestBrowserPermission = async () => {
    if (!canUseBrowserNotifications()) return;
    const result = await window.Notification.requestPermission();
    setPermission(result);
  };

  return (
    <details style={{ position: "relative" }}>
      <summary
        style={{
          listStyle: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: compact ? 38 : 42,
          height: compact ? 38 : 42,
          borderRadius: 12,
          border: "1px solid rgba(255,255,255,0.2)",
          background: compact ? "rgba(255,255,255,0.12)" : "#ffffff",
          color: compact ? "#ffffff" : "#1e5bb5",
          position: "relative",
        }}
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: 4,
              right: 4,
              minWidth: 18,
              height: 18,
              borderRadius: 999,
              background: "#ef4444",
              color: "#ffffff",
              fontSize: 10,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0 5px",
            }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </summary>

      <div
        style={{
          position: "absolute",
          top: compact ? 46 : 48,
          right: isMobilePanel ? "50%" : 0,
          left: isMobilePanel ? "auto" : undefined,
          transform: isMobilePanel ? "translateX(50%)" : "none",
          width: panelWidth,
          maxWidth: isMobilePanel ? "calc(100vw - 24px)" : panelWidth,
          maxHeight: isMobilePanel ? "min(62vh, 460px)" : "min(70vh, 520px)",
          overflowY: "auto",
          background: "#ffffff",
          border: "1px solid #dbeafe",
          borderRadius: 16,
          boxShadow: "0 20px 40px rgba(15,42,94,0.18)",
          zIndex: 80,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 16px",
            borderBottom: "1px solid #dbeafe",
          }}
        >
          <div>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: "#0f2a5e" }}>Notificaciones</p>
            <p style={{ margin: "3px 0 0", fontSize: 11, color: "#8aafd4" }}>{unreadCount} sin leer</p>
          </div>
          <button
            type="button"
            onClick={() => markAllRead.mutate()}
            disabled={!unreadCount || markAllRead.isPending}
            style={{
              border: "none",
              background: "transparent",
              color: unreadCount ? "#1e5bb5" : "#8aafd4",
              fontSize: 12,
              fontWeight: 700,
              cursor: unreadCount ? "pointer" : "default",
            }}
          >
            Marcar todas
          </button>
        </div>

        <div style={{ padding: 8 }}>
          {error && (
            <div
              style={{
                border: "1px solid #fecaca",
                background: "#fef2f2",
                color: "#b91c1c",
                borderRadius: 12,
                padding: "12px 12px",
                marginBottom: 8,
                fontSize: 12,
                lineHeight: 1.5,
              }}
            >
              No se pudieron cargar las notificaciones.
            </div>
          )}

          {permission !== "granted" && (
            <div
              style={{
                border: "1px solid #dbeafe",
                background: "#f8fbff",
                borderRadius: 12,
                padding: "12px 12px",
                marginBottom: 8,
              }}
            >
              <p style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 700, color: "#0f2a5e" }}>
                {permissionMessage}
              </p>
              {permission === "default" && (
                <button
                  type="button"
                  onClick={requestBrowserPermission}
                  style={{
                    border: "none",
                    background: "#1e5bb5",
                    color: "#ffffff",
                    fontSize: 12,
                    fontWeight: 700,
                    borderRadius: 10,
                    padding: "8px 10px",
                    cursor: "pointer",
                  }}
                >
                  Permitir alertas
                </button>
              )}
            </div>
          )}

          {items.length === 0 && (
            <div style={{ padding: "18px 12px", textAlign: "center", color: "#8aafd4", fontSize: 13 }}>
              No hay notificaciones
            </div>
          )}

          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                if (!item.readAt) {
                  markRead.mutate(item.id);
                }
                dispatchNotificationOpen(item);
              }}
              style={{
                width: "100%",
                textAlign: "left",
                border: "1px solid #dbeafe",
                background: item.readAt ? "#ffffff" : "#f0f7ff",
                borderRadius: 12,
                padding: "12px 12px",
                marginBottom: 8,
                cursor: item.readAt ? "default" : "pointer",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: item.readAt ? "#dbeafe" : "#1e5bb5",
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontSize: 13, fontWeight: 700, color: "#0f2a5e" }}>{item.title}</span>
                <span style={{ marginLeft: "auto", fontSize: 10, color: "#8aafd4", whiteSpace: "nowrap" }}>
                  {formatRelativeDate(item.createdAt)}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: 12, color: "#4a6fa5", lineHeight: 1.5 }}>
                {item.message}
              </p>
            </button>
          ))}
        </div>
      </div>
    </details>
  );
}
