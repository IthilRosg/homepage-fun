import React, { useEffect, useRef, useState } from "react";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import "xterm/css/xterm.css";

export default function SSHTerminal({ host, port = 22, username, password, privateKey, onClose }) {
  const terminalRef = useRef(null);
  const [status, setStatus] = useState("Connecting...");
  const wsRef = useRef(null);

  useEffect(() => {
    if (!terminalRef.current) return;

    const term = new Terminal({
      cursorBlink: true,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      fontSize: 14,
      theme: {
        background: "#000000",
        foreground: "#ffffff",
      },
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(terminalRef.current);
    fitAddon.fit();

    const handleResize = () => {
      fitAddon.fit();
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: "resize",
            cols: term.cols,
            rows: term.rows,
            width: terminalRef.current.clientWidth,
            height: terminalRef.current.clientHeight,
          })
        );
      }
    };

    window.addEventListener("resize", handleResize);

    // Using window.location.hostname to connect to the proxy running on the same host
    // The port is hardcoded to 3001 as defined in our docker-compose
    const wsUrl = `ws://${window.location.hostname}:3001`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus("Connected to proxy. Establishing SSH...");
      ws.send(
        JSON.stringify({
          type: "connect",
          host,
          port,
          username,
          password,
          privateKey,
        })
      );
    };

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === "data") {
        term.write(msg.data);
      } else if (msg.type === "connected") {
        setStatus("Connected");
        term.focus();
        handleResize();
      } else if (msg.type === "error") {
        setStatus(`Error: ${msg.message}`);
        term.write(`\r\n\x1b[31m${msg.message}\x1b[0m\r\n`);
      } else if (msg.type === "closed") {
        setStatus("Connection closed");
        term.write("\r\n\x1b[33mConnection closed.\x1b[0m\r\n");
      }
    };

    ws.onerror = (err) => {
      setStatus("WebSocket connection error");
      term.write("\r\n\x1b[31mFailed to connect to SSH Proxy.\x1b[0m\r\n");
    };

    term.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "data", data }));
      }
    });

    return () => {
      window.removeEventListener("resize", handleResize);
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
      term.dispose();
    };
  }, [host, port, username, password, privateKey]);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-xs z-[70] flex flex-col p-4 sm:p-8">
      <div className="flex justify-between items-center bg-theme-900 border border-theme-300/20 rounded-t-lg px-4 py-2 shadow-2xl">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-bold text-theme-200">
            SSH: {username}@{host}
          </h3>
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${
              status === "Connected"
                ? "bg-emerald-500/20 text-emerald-400"
                : status.includes("Error") || status.includes("closed")
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
        ref={terminalRef}
        className="flex-1 bg-black border border-t-0 border-theme-300/20 rounded-b-lg p-2 shadow-2xl overflow-hidden"
      ></div>
    </div>
  );
}
