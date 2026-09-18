#!/usr/bin/env node
/**
 * Local qnm-node radio status. LIVE-when-HW-present / refuse-when-absent.
 * No mock. Worker channel_plane stays cite-only.
 * Author: Aziel Eliab only.
 */
import { radioStatus } from "./bearers/radio.js";

console.log(JSON.stringify(radioStatus(), null, 2));
