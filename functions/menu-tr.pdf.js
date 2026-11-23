// /menu-tr.pdf: the Turkish menu the manager uploaded at /admin, or else the
// menu-tr.pdf that came with the site. See _lib/menu.js.
import { serveMenu } from "./_lib/menu.js";

export const onRequestGet = (context) => serveMenu(context, "tr");
