import React, { useEffect, useRef, useState } from "react";
import Guacamole from "guacamole-common-js";

export default function RDPViewer({ host, username, password, onClose }) {
  const displayRef = useRef(null);
  const [status, setStatus] = useState("Connecting...");
  const clientRef = useRef(null);

  useEffect(() => {
    if (!displayRef.current) return;

    // Use ws:// for unencrypted or wss:// if hosted behind HTTPS. 
    // Assuming proxy runs on the same hostname at port 3002.
    const wsUrl = `ws://${window.location.hostname}:3002`;
    
    // Create Guacamole HTTP/WebSocket tunnel
    const tunnel = new Guacamole.WebSocketTunnel(wsUrl);
    const client = new Guacamole.Client(tunnel);
    clientRef.current = client;

    // Add client display to DOM
    displayRef.current.appendChild(client.getDisplay().getElement());

    client.onerror = (error) => {
      setStatus(`Error: ${error.message || "Connection failed"}`);
      console.error(error);
    };

    client.onstatechange = (state) => {
      switch (state) {
        case 0: setStatus("Idle"); break;
        case 1: setStatus("Connecting..."); break;
        case 2: setStatus("Waiting..."); break;
        case 3: setStatus("Connected"); break;
        case 4: setStatus("Disconnecting..."); break;
        case 5: setStatus("Disconnected"); break;
        default: setStatus(`Unknown state: ${state}`); break;
      }
    };

    fetch('/api/rdp-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ host, username, password })
    })
      .then(res => res.json())
      .then(data => {
        if (data.token) {
          client.connect(`token=${data.token}`);
        } else {
          setStatus("Error getting connection token");
        }
      })
      .catch(err => {
        setStatus(`Error fetching token: ${err.message}`);
      });

    // Handle mouse events
    const mouse = new Guacamole.Mouse(client.getDisplay().getElement());
    mouse.onmousedown = mouse.onmouseup = mouse.onmousemove = (mouseState) => {
      client.sendMouseState(mouseState);
    };

    // Handle keyboard events
    const keyboard = new Guacamole.Keyboard(document);
    keyboard.onkeydown = (keysym) => {
      client.sendKeyEvent(1, keysym);
    };
    keyboard.onkeyup = (keysym) => {
      client.sendKeyEvent(0, keysym);
    };

    return () => {
      client.disconnect();
      if (displayRef.current) {
        displayRef.current.innerHTML = '';
      }
      keyboard.onkeydown = null;
      keyboard.onkeyup = null;
    };
  }, [host, username, password]);

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-xs z-[70] flex flex-col p-4 sm:p-8">
      <div className="flex justify-between items-center bg-theme-900 border border-theme-300/20 rounded-t-lg px-4 py-2 shadow-2xl">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-bold text-theme-200">
            RDP: {username}@{host}
          </h3>
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${
              status === "Connected"
                ? "bg-emerald-500/20 text-emerald-400"
                : status.includes("Error") || status.includes("Disconnected")
                ? "bg-rose-500/20 text-rose-400"
                : "bg-amber-500/20 text-amber-400"
            }`}
          >
            {status}
          </span>
        </div>
        <button
          onClick={onClose}
          className="px-3 py-1 rounded bg-theme-100/10 text-xs text-theme-300 hover:text-white cursor-pointer hover:bg-rose-500/20 hover:text-rose-300 transition-colors"
        >
          Close
        </button>
      </div>
      <div
        ref={displayRef}
        className="flex-1 bg-black border border-t-0 border-theme-300/20 rounded-b-lg p-2 shadow-2xl overflow-hidden flex justify-center items-center"
      ></div>
    </div>
  );
}
