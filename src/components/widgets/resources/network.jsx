import { useTranslation } from "next-i18next/pages";
import { FaNetworkWired } from "react-icons/fa";
import useSWR from "swr";

import Error from "../widget/error";
import Resource from "../widget/resource";

export default function Network({ options, refresh = 1500 }) {
  const { t } = useTranslation();
  // eslint-disable-next-line no-param-reassign
  if (options.network === true) options.network = "default";

  const { data, error } = useSWR(`/api/widgets/resources?type=network&interfaceName=${options.network}`, {
    refreshInterval: refresh,
  });

  const { data: trafficData } = useSWR("/api/traffic", { refreshInterval: 60000 });


  if (error || data?.error) {
    return <Error />;
  }

  if (!data || !data.network || !data.network.rx_sec || !data.network.tx_sec) {
    return (
      <Resource
        icon={FaNetworkWired}
        value="- ↑"
        label="- ↓"
        expandedValue="- ↑"
        expandedLabel="- ↓"
        percentage="0"
        wide
      />
    );
  }

  const homeTraffic = trafficData && trafficData["Home Server"] ? trafficData["Home Server"].split(" | ") : null;
  const monthTraffic = homeTraffic ? homeTraffic.find(t => t.startsWith("Month:")) : null;

  return (
    <Resource
      icon={FaNetworkWired}
      value={`${t("common.byterate", { value: data.network.tx_sec })} ↑`}
      label={`${t("common.byterate", { value: data.network.rx_sec })} ↓`}
      expandedValue={`${t("common.bytes", { value: data.network.tx_bytes })} ↑`}
      expandedLabel={`${t("common.bytes", { value: data.network.rx_bytes })} ↓`}
      expanded={options.expanded}
      wide
      percentage={(100 * data.network.rx_sec) / (data.network.rx_sec + data.network.tx_sec)}
    >
      {monthTraffic && (
        <div className="text-theme-500 dark:text-theme-400 text-[10px] mt-1 font-medium tracking-wide">
          {monthTraffic.replace("Month:", "Месяц:")}
        </div>
      )}
    </Resource>
  );
}
