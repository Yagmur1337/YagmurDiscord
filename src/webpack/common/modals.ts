/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as t from "@vencord/discord-types";
import { filters, findByCodeLazy, findComponentByCodeLazy, mapMangledModuleLazy } from "@webpack";

import { React } from "./react";

const DiscordModal: t.Modal = findComponentByCodeLazy("actionBarInputLayout", "scrollerRef");

export const Modal: t.Modal = ((props: t.ModalProps) => {
    let safeProps = props;
    if (props?.listProps && !props.listProps.sections) {
        safeProps = {
            ...props,
            listProps: {
                sections: [0],
                sectionHeight: 0,
                rowHeight: 0,
                ...props.listProps
            }
        };
    }
    return React.createElement(DiscordModal, safeProps);
}) as any;

export const ConfirmModal: t.ConfirmModal = findComponentByCodeLazy('parentComponent:"ConfirmModal"');

// Modal key: "Media Viewer Modal"
export const openMediaModal: (props: t.MediaModalProps) => void = findByCodeLazy("hasMediaOptions", "shouldHideMediaOptions");

const ModalAPI: t.ModalAPI = mapMangledModuleLazy(".modalKey?", {
    openModalLazy: filters.byCode(".modalKey?"),
    openModal: filters.byCode(",instant:"),
    closeModal: filters.byCode(".onCloseCallback()"),
    closeAllModals: filters.byCode(".getState();for")
});

export const { openModalLazy, openModal, closeModal, closeAllModals } = ModalAPI;
