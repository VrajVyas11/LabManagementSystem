// src/hooks/useNotificationHub.js
import { useEffect, useState, useRef, useCallback } from "react";
import * as signalR from "@microsoft/signalr";
// const BASE_HOST = "http://localhost:5036"
const BASE_HOST="/"
export default function useNotificationHub(token) {
  const [notifications, setNotifications] = useState([]);
  const connectionRef = useRef(null);

  const addNotification = useCallback((notification) => {
    setNotifications((prev) => [notification, ...prev]);
  }, []);

  useEffect(() => {
    if (!token) return;

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(`${BASE_HOST}/hubs/notifications`, {
        accessTokenFactory: () => token,
      })
      .withAutomaticReconnect()
      .build();

    connectionRef.current = connection;

    connection.start()
      .then(() => console.log("SignalR connected"))
      .catch((err) => console.error("SignalR connection error:", err));

    connection.on("ReceiveNotification", (notification) => {
      addNotification(notification);
    });

    return () => {
      connection.stop();
    };
  }, [token, addNotification]);

  return { notifications, setNotifications };
}