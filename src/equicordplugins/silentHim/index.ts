/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { EquicordDevs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { React } from "@webpack/common";

export const settings = definePluginSettings({
    speakingColor: {
        type: OptionType.STRING,
        description: "Colore dell'icona quando l'utente con volume a 0 parla (es. red, #ff0000)",
        default: "red",
        onChange: val => {
            document.documentElement.style.setProperty("--silent-him-color", val);
        }
    },
});

const AudioEngine = findByPropsLazy("setLocalVolume");

export default definePlugin({
    name: "SilentHim",
    description: "Cambia il colore dell'indicatore di conversazione in rosso per gli utenti con volume impostato a 0%.",
    authors: [EquicordDevs.dpassaggio],
    settings,

    styles: `
        /* Forziamo il colore rosso ovunque per gli utenti silenziati */
        .silent-him-speaking {
            --status-green: var(--silent-him-color, red) !important;
            --status-speaking: var(--silent-him-color, red) !important;
            --voice-speaking: var(--silent-him-color, red) !important;
            --brand-experiment: var(--silent-him-color, red) !important;
            --green-360: var(--silent-him-color, red) !important;
        }

        .silent-him-speaking [class*="avatarSpeaking"],
        .silent-him-speaking [class*="speaking"],
        .silent-him-speaking [class*="avatar-"],
        .silent-him-speaking [class*="border-"],
        .silent-him-speaking [class*="wrapper-"] {
            box-shadow: 0 0 0 2px var(--silent-him-color, red) !important;
            border-color: var(--silent-him-color, red) !important;
        }

        .silent-him-speaking rect[fill*="green"],
        .silent-him-speaking circle[fill*="green"],
        .silent-him-speaking [fill*="var(--status-green)"] {
            fill: var(--silent-him-color, red) !important;
            stroke: var(--silent-him-color, red) !important;
        }

        .silent-him-speaking [style*="border-color: var(--status-green)"],
        .silent-him-speaking [style*="border-color:var(--status-green)"] {
            border-color: var(--silent-him-color, red) !important;
        }
    `,

    onStart() {
        this.updateColor();
    },

    updateColor() {
        document.documentElement.style.setProperty("--silent-him-color", settings.store.speakingColor);
    },

    // Metodo ufficiale per aggiungere voci al menu contestuale
    contextMenus: {
        "user-context": (children, { user }) => {
            if (!user) return;

            const MediaEngineStore = Vencord.Webpack.findStore("MediaEngineStore");
            const currentVolume = MediaEngineStore.getLocalVolume(user.id);
            const { MenuCheckboxItem, MenuGroup } = Vencord.Webpack.common.Menu;

            children.push(
                React.createElement(MenuGroup, {},
                    React.createElement(MenuCheckboxItem, {
                        id: "silent-him-toggle",
                        label: "SilentHim (Vol 0%)",
                        checked: currentVolume === 0,
                        action: () => {
                            if (currentVolume === 0) {
                                AudioEngine.setLocalVolume(user.id, 100);
                            } else {
                                AudioEngine.setLocalVolume(user.id, 0);
                            }
                        }
                    })
                )
            );
        }
    },

    patches: [
        {
            find: 'location:"VoiceUser"',
            replacement: {
                match: /speaking:(\i)/,
                replace: (match, speakingVar) => {
                    return `speaking:(() => {
                        try {
                            const userId = arguments[0]?.user?.id;
                            if (!userId) return ${speakingVar};

                            const MediaEngineStore = Vencord.Webpack.findStore("MediaEngineStore");
                            const isVol0 = MediaEngineStore.getLocalVolume(userId) === 0;

                            if (isVol0 && ${speakingVar}) {
                                if (arguments[0].className && !arguments[0].className.includes("silent-him-speaking")) {
                                    arguments[0].className += " silent-him-speaking";
                                } else if (!arguments[0].className) {
                                    arguments[0].className = "silent-him-speaking";
                                }
                            }
                        } catch (e) {}
                        return ${speakingVar};
                    })()`;
                }
            }
        }
    ]
});
