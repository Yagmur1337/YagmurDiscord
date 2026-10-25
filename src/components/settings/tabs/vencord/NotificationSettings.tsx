/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { openNotificationLogModal } from "@api/Notifications/notificationLog";
import { useSettings } from "@api/Settings";
import { ErrorCard } from "@components/ErrorCard";
import { Flex } from "@components/Flex";
import { yagmurMelekTranslate } from "@utils/yagmurMelekLanguage";
import { Margins } from "@utils/margins";
import { identity } from "@utils/misc";
import { Button, Forms, Modal,openModal, Select, Slider } from "@webpack/common";

export function NotificationSection() {
    return (
        <section className={Margins.top16}>
            <Forms.FormTitle tag="h5">{yagmurMelekTranslate("Notifications")}</Forms.FormTitle>
            <Forms.FormText className={Margins.bottom8}>
                {yagmurMelekTranslate("Settings for Notifications sent by Vencord. This does NOT include Discord notifications (messages, etc)")}</Forms.FormText>
            <Flex>
                <Button onClick={openNotificationSettingsModal}>
                    {yagmurMelekTranslate("Notification Settings")}</Button>
                <Button onClick={openNotificationLogModal}>
                    {yagmurMelekTranslate("View Notification Log")}</Button>
            </Flex>
        </section>
    );
}

export function openNotificationSettingsModal() {
    openModal(props => (
        <Modal
            {...props}
            size="lg"
            title={yagmurMelekTranslate("Notification Settings")}
        >
            <NotificationSettings />
        </Modal>
    ));
}

function NotificationSettings() {
    const settings = useSettings(["notifications.*"]).notifications;

    return (
        <>
            <Forms.FormTitle tag="h5">{yagmurMelekTranslate("Notification Style")}</Forms.FormTitle>
            {settings.useNative !== "never" && Notification?.permission === "denied" && (
                <ErrorCard style={{ padding: "1em" }} className={Margins.bottom8}>
                    <Forms.FormTitle tag="h5">{yagmurMelekTranslate("Desktop Notification Permission denied")}</Forms.FormTitle>
                    <Forms.FormText>{yagmurMelekTranslate("You have denied Notification Permissions. Thus, Desktop notifications will not work!")}</Forms.FormText>
                </ErrorCard>
            )}
            <Forms.FormText className={Margins.bottom8}>
                {yagmurMelekTranslate("Some plugins may show you notifications. These come in two styles:")}<ul>
                    <li><strong>{yagmurMelekTranslate("Vencord Notifications")}</strong>{yagmurMelekTranslate(": These are in-app notifications")}</li>
                    <li><strong>{yagmurMelekTranslate("Desktop Notifications")}</strong>{yagmurMelekTranslate(": Native Desktop notifications (like when you get a ping)")}</li>
                </ul>
            </Forms.FormText>
            <Select
                placeholder={yagmurMelekTranslate("Notification Style")}
                options={[
                    { label: yagmurMelekTranslate("Only use Desktop notifications when Discord is not focused"), value: "not-focused", default: true },
                    { label: yagmurMelekTranslate("Always use Desktop notifications"), value: "always" },
                    { label: yagmurMelekTranslate("Always use Vencord notifications"), value: "never" },
                ] satisfies Array<{ value: typeof settings["useNative"]; } & Record<string, any>>}
                closeOnSelect={true}
                select={v => settings.useNative = v}
                isSelected={v => v === settings.useNative}
                serialize={identity}
            />

            <Forms.FormTitle tag="h5" className={Margins.top16 + " " + Margins.bottom8}>{yagmurMelekTranslate("Notification Position")}</Forms.FormTitle>
            <Select
                isDisabled={settings.useNative === "always"}
                placeholder={yagmurMelekTranslate("Notification Position")}
                options={[
                    { label: yagmurMelekTranslate("Bottom Right"), value: "bottom-right", default: true },
                    { label: yagmurMelekTranslate("Top Right"), value: "top-right" },
                ] satisfies Array<{ value: typeof settings["position"]; } & Record<string, any>>}
                select={v => settings.position = v}
                isSelected={v => v === settings.position}
                serialize={identity}
            />

            <Forms.FormTitle tag="h5" className={Margins.top16 + " " + Margins.bottom8}>{yagmurMelekTranslate("Notification Timeout")}</Forms.FormTitle>
            <Forms.FormText className={Margins.bottom16}>{yagmurMelekTranslate("Set to 0s to never automatically time out")}</Forms.FormText>
            <Slider
                disabled={settings.useNative === "always"}
                markers={[0, 1000, 2500, 5000, 10_000, 20_000]}
                minValue={0}
                maxValue={20_000}
                initialValue={settings.timeout}
                onValueChange={v => settings.timeout = v}
                onValueRender={v => (v / 1000).toFixed(2) + "s"}
                onMarkerRender={v => (v / 1000) + "s"}
                stickToMarkers={false}
            />

            <Forms.FormTitle tag="h5" className={Margins.top16 + " " + Margins.bottom8}>{yagmurMelekTranslate("Notification Log Limit")}</Forms.FormTitle>
            <Forms.FormText className={Margins.bottom16}>
                {yagmurMelekTranslate("The amount of notifications to save in the log until old ones are removed. Set to") + " "}<code>0</code> {yagmurMelekTranslate("to disable Notification log and") + " "}<code>∞</code> {yagmurMelekTranslate("to never automatically remove old Notifications")}</Forms.FormText>
            <Slider
                markers={[0, 25, 50, 75, 100, 200]}
                minValue={0}
                maxValue={200}
                stickToMarkers={true}
                initialValue={settings.logLimit}
                onValueChange={v => settings.logLimit = v}
                onValueRender={v => v === 200 ? "∞" : v}
                onMarkerRender={v => v === 200 ? "∞" : v}
            />
        </>
    );
}
