import classNames from "classnames";
import ResolvedIcon from "components/resolvedicon";
import { useContext, useState, Fragment } from "react";
import { SettingsContext } from "utils/contexts/settings";
import Docker from "widgets/docker/component";
import Kubernetes from "widgets/kubernetes/component";
import ProxmoxVM from "widgets/proxmoxvm/component";
import { Menu, Transition } from "@headlessui/react";
import useSWR, { useSWRConfig } from "swr";

import KubernetesStatus from "./kubernetes-status";
import Ping from "./ping";
import ProxmoxStatus from "./proxmox-status";
import SiteMonitor from "./site-monitor";
import Status from "./status";
import Widget from "./widget";

export default function Item({ service, groupName, useEqualHeights }) {
  const hasLink = service.href && service.href !== "#";
  const { settings } = useContext(SettingsContext);
  const showStats = service.showStats === false ? false : settings.showStats;
  const statusStyle = service.statusStyle !== undefined ? service.statusStyle : settings.statusStyle;
  const [statsOpen, setStatsOpen] = useState(service.showStats);
  const [statsClosing, setStatsClosing] = useState(false);

  const [showLogsModal, setShowLogsModal] = useState(false);
  const [logsText, setLogsText] = useState("");
  const [confirmAction, setConfirmAction] = useState(null);

  const statusKey = service.container ? `/api/docker/status/${service.container}/${service.server || ""}` : null;
  const { data: statusData } = useSWR(statusKey);
  const isRunning = statusData?.status?.includes("running") || statusData?.status?.includes("partial");

  const { mutate } = useSWRConfig();

  // set stats to closed after 300ms
  const closeStats = () => {
    if (statsOpen) {
      setStatsClosing(true);
      setTimeout(() => {
        setStatsOpen(false);
        setStatsClosing(false);
      }, 300);
    }
  };

  const handleDockerAction = async (action) => {
    if (action === "logs") {
      setShowLogsModal(true);
      setLogsText("Loading logs...");
      try {
        const res = await fetch(`/api/docker/control/${service.container}/${service.server || ""}?action=logs`);
        const data = await res.json();
        setLogsText(data.logs || "No logs available.");
      } catch (err) {
        setLogsText("Error loading logs: " + err.message);
      }
      return;
    }

    try {
      await fetch(`/api/docker/control/${service.container}/${service.server || ""}?action=${action}`, {
        method: "POST"
      });
      // Force refresh status and stats after action
      mutate(statusKey);
      mutate(`/api/docker/stats/${service.container}/${service.server || ""}`);
    } catch (err) {
      alert("Docker action failed: " + err.message);
    }
  };

  return (
    <li key={service.name} id={service.id} className="service" data-name={service.name || ""}>
      <div
        className={classNames(
          settings.cardBlur !== undefined && `backdrop-blur${settings.cardBlur.length ? "-" : ""}${settings.cardBlur}`,
          useEqualHeights && "h-[calc(100%-0.5rem)]",
          "transition-all mb-2 p-1 rounded-md font-medium text-theme-700 dark:text-theme-200 dark:hover:text-theme-300 shadow-md shadow-theme-900/10 dark:shadow-theme-900/20 bg-theme-100/20 hover:bg-theme-300/20 dark:bg-white/5 dark:hover:bg-white/10 relative overflow-visible service-card",
        )}
      >
        <div className="flex select-none z-0 service-title">
          {service.icon &&
            (hasLink ? (
              <a
                href={service.href}
                target={service.target ?? settings.target ?? "_blank"}
                rel="noreferrer"
                className="shrink-0 flex items-center justify-center p-2 rounded-md bg-theme-500/10 dark:bg-theme-900/50 hover:bg-theme-500/20 dark:hover:bg-theme-900/80 service-icon-link"
              >
                <ResolvedIcon icon={service.icon} alt={service.name} />
              </a>
            ) : (
              <div className="shrink-0 flex items-center justify-center p-2 rounded-md bg-theme-500/10 dark:bg-theme-900/50 service-icon">
                <ResolvedIcon icon={service.icon} alt={service.name} />
              </div>
            ))}

          <div className="flex flex-col pl-3 pr-2 py-1 truncate w-full service-info">
            <div className="flex flex-row items-center w-full service-title-header">
              {hasLink ? (
                <a
                  href={service.href}
                  target={service.target ?? settings.target ?? "_blank"}
                  rel="noreferrer"
                  className="text-sm font-semibold truncate hover:text-white service-name-link"
                >
                  {service.name}
                </a>
              ) : (
                <span className="text-sm font-semibold truncate service-name">{service.name}</span>
              )}
            </div>
            {service.description && (
              <div className="flex flex-row items-center w-full mt-0.5 service-description-container">
                <p className="text-theme-500 dark:text-theme-300 text-xs font-light service-description">
                  {service.description}
                </p>
              </div>
            )}
          </div>
        </div>

        <div
          className={`absolute top-0 right-0 flex flex-row justify-end ${
            statusStyle === "dot" ? "gap-0" : "gap-2 mr-2"
          } z-10 service-tags`}
        >
          {service.ping && (
            <div className="shrink-0 flex items-center justify-center service-tag service-ping">
              <Ping groupName={groupName} serviceName={service.name} style={statusStyle} />
              <span className="sr-only">Ping status</span>
            </div>
          )}

          {service.siteMonitor && (
            <div className="shrink-0 flex items-center justify-center service-tag service-site-monitor">
              <SiteMonitor groupName={groupName} serviceName={service.name} style={statusStyle} />
              <span className="sr-only">Site monitor status</span>
            </div>
          )}

          {service.container && (
            <Menu as="div" className="relative inline-block text-left z-20">
              <div>
                <Menu.Button className="shrink-0 flex items-center justify-center cursor-pointer service-tag service-container-stats focus:outline-hidden">
                  <Status service={service} style={statusStyle} />
                  <span className="sr-only">Open container actions</span>
                </Menu.Button>
              </div>
              <Transition
                as={Fragment}
                enter="transition ease-out duration-100"
                enterFrom="transform opacity-0 scale-95"
                enterTo="transform opacity-100 scale-100"
                leave="transition ease-in duration-75"
                leaveFrom="transform opacity-100 scale-100"
                leaveTo="transform opacity-0 scale-95"
              >
                <Menu.Items className="absolute right-0 mt-1 w-44 origin-top-right rounded-md bg-theme-900 border border-theme-300/20 shadow-2xl focus:outline-hidden text-theme-200 text-xs z-50 overflow-hidden">
                  <div className="py-1">
                    <Menu.Item>
                      {({ active }) => (
                        <button
                          onClick={() => (statsOpen ? closeStats() : setStatsOpen(true))}
                          className={classNames(
                            active ? "bg-theme-100/10 text-white" : "text-theme-300",
                            "group flex w-full items-center px-3 py-2 text-left"
                          )}
                        >
                          {statsOpen ? "Collapse Stats" : "Expand Stats"}
                        </button>
                      )}
                    </Menu.Item>
                    {isRunning ? (
                      <Menu.Item>
                        {({ active }) => (
                          <button
                            onClick={() => setConfirmAction("stop")}
                            className={classNames(
                              active ? "bg-rose-500/20 text-rose-300" : "text-rose-400",
                              "group flex w-full items-center px-3 py-2 text-left"
                            )}
                          >
                            Stop Container
                          </button>
                        )}
                      </Menu.Item>
                    ) : (
                      <Menu.Item>
                        {({ active }) => (
                          <button
                            onClick={() => setConfirmAction("start")}
                            className={classNames(
                              active ? "bg-emerald-500/20 text-emerald-300" : "text-emerald-400",
                              "group flex w-full items-center px-3 py-2 text-left"
                            )}
                          >
                            Start Container
                          </button>
                        )}
                      </Menu.Item>
                    )}
                    <Menu.Item>
                      {({ active }) => (
                        <button
                          onClick={() => setConfirmAction("restart")}
                          className={classNames(
                            active ? "bg-blue-500/20 text-blue-300" : "text-blue-400",
                            "group flex w-full items-center px-3 py-2 text-left"
                          )}
                        >
                          Restart Container
                        </button>
                      )}
                    </Menu.Item>
                    <Menu.Item>
                      {({ active }) => (
                        <button
                          onClick={() => handleDockerAction("logs")}
                          className={classNames(
                            active ? "bg-amber-500/20 text-amber-300" : "text-amber-400",
                            "group flex w-full items-center px-3 py-2 text-left"
                          )}
                        >
                          View Logs
                        </button>
                      )}
                    </Menu.Item>
                  </div>
                </Menu.Items>
              </Transition>
            </Menu>
          )}
          {service.app && !service.external && (
            <button
              type="button"
              onClick={() => (statsOpen ? closeStats() : setStatsOpen(true))}
              className="shrink-0 flex items-center justify-center cursor-pointer service-tag service-app"
            >
              <KubernetesStatus service={service} style={statusStyle} />
              <span className="sr-only">View container stats</span>
            </button>
          )}
          {service.proxmoxNode && service.proxmoxVMID && (
            <button
              type="button"
              onClick={() => (statsOpen ? closeStats() : setStatsOpen(true))}
              className="shrink-0 flex items-center justify-center cursor-pointer service-tag service-proxmoxstatus"
            >
              <ProxmoxStatus service={service} style={statusStyle} />
              <span className="sr-only">View Proxmox stats</span>
            </button>
          )}
        </div>
      </div>

      {service.container && service.server && (
        <div
          className={classNames(
            showStats || (statsOpen && !statsClosing) ? "max-h-[110px] opacity-100" : " max-h-0 opacity-0",
            "w-full overflow-hidden transition-all duration-300 ease-in-out service-stats",
          )}
        >
          {(showStats || statsOpen) && (
            <Docker service={{ widget: { container: service.container, server: service.server } }} />
          )}
        </div>
      )}
      {service.app && (
        <div
          className={classNames(
            showStats || (statsOpen && !statsClosing) ? "max-h-[55px] opacity-100" : " max-h-0 opacity-0",
            "w-full overflow-hidden transition-all duration-300 ease-in-out service-stats",
          )}
        >
          {(showStats || statsOpen) && (
            <Kubernetes
              service={{
                widget: { namespace: service.namespace, app: service.app, podSelector: service.podSelector },
              }}
            />
          )}
        </div>
      )}
      {service.proxmoxNode && service.proxmoxVMID && (
        <div
          className={classNames(
            showStats || (statsOpen && !statsClosing) ? "max-h-[110px] opacity-100" : " max-h-0 opacity-0",
            "w-full overflow-hidden transition-all duration-300 ease-in-out service-stats",
          )}
        >
          {(showStats || statsOpen) && (
            <ProxmoxVM
              service={{
                widget: {
                  node: service.proxmoxNode,
                  vmid: service.proxmoxVMID,
                  type: service.proxmoxType,
                },
              }}
            />
          )}
        </div>
      )}

      {service.widgets.map((widget) => (
        <Widget widget={widget} service={service} key={widget.index} />
      ))}


      {confirmAction && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-[60] flex items-center justify-center p-4">
          <div className="bg-theme-900 border border-theme-300/20 rounded-lg p-6 max-w-sm w-full shadow-2xl text-center">
            <div className="text-amber-400 text-3xl mb-3">⚠️</div>
            <h3 className="text-sm font-bold text-theme-200 mb-2">
              Confirm: {confirmAction.charAt(0).toUpperCase() + confirmAction.slice(1)} Container
            </h3>
            <p className="text-xs text-theme-400 mb-5">
              Are you sure you want to <span className="text-theme-200 font-semibold">{confirmAction}</span> container <span className="text-theme-200 font-semibold">{service.container}</span>?
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => setConfirmAction(null)}
                className="px-4 py-2 rounded bg-theme-100/10 text-xs text-theme-300 hover:text-white hover:bg-theme-100/20 cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleDockerAction(confirmAction);
                  setConfirmAction(null);
                }}
                className={classNames(
                  "px-4 py-2 rounded text-xs font-semibold cursor-pointer transition-colors",
                  confirmAction === "stop" ? "bg-rose-500/20 text-rose-300 hover:bg-rose-500/40" :
                  confirmAction === "start" ? "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/40" :
                  "bg-blue-500/20 text-blue-300 hover:bg-blue-500/40"
                )}
              >
                Yes, {confirmAction}
              </button>
            </div>
          </div>
        </div>
      )}

      {showLogsModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-theme-900 border border-theme-300/20 rounded-lg max-w-3xl w-full p-4 flex flex-col h-[75vh] shadow-2xl">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-bold text-theme-200">Logs: {service.container}</h3>
              <button
                onClick={() => setShowLogsModal(false)}
                className="px-3 py-1 rounded bg-theme-100/10 text-xs text-theme-300 hover:text-white cursor-pointer"
              >
                Close
              </button>
            </div>
            <pre className="flex-1 bg-black/50 p-3 rounded text-[11px] font-mono overflow-auto whitespace-pre-wrap text-left select-text text-theme-300 border border-theme-300/10">
              {logsText}
            </pre>
          </div>
        </div>
      )}
    </li>
  );
}

