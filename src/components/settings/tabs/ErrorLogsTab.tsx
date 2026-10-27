/*
 * Yağmur Discord - Error Logs Settings Tab
 */

import { SettingsTab, wrapTab } from "@components/settings/tabs/BaseTab";
import { ErrorLogsViewer } from "@utils/yagmurMelekCrashReporter";

function ErrorLogsTab() {
    return (
        <SettingsTab>
            <ErrorLogsViewer />
        </SettingsTab>
    );
}

export default wrapTab(ErrorLogsTab, "Hata Günlükleri");
