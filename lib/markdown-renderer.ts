import remarkGfm from "remark-gfm";
import { remarkLiteralHtml } from "./remark-literal-html.ts";

/** Shared remark plugins for all Portulan Markdown renderers. */
export const portulanRemarkPlugins = [remarkGfm, remarkLiteralHtml];
