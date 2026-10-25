/* eslint-disable simple-header/header */
import { yagmurMelekTranslate } from "@utils/yagmurMelekLanguage";
import React from "react";

const handleClick = async () =>
    console.log((await import("@utils/clipboard")).copyToClipboard("\u200b"));

export const Example: React.FC<{
    real: boolean,
    shigged?: number,
}> = ({ real, shigged }) => <>
    <p>{`Shigg${real ? `ies${shigged === 0x1B ? "t" : ""}` : "y"}`}</p>
    <button onClick={handleClick}>{yagmurMelekTranslate("Click Me")}</button>
</>;
