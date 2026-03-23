"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

import { translateLegacyText } from "@/lib/legacy-locale";
import { getLocaleFromPath } from "@/lib/locale-routing";

const ATTRIBUTE_NAMES = ["placeholder", "title", "aria-label"];
const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT"]);

function translateNodeTree(root: Node, locale: "ar" | "en") {
  if (locale !== "en") return;

  const textWalker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let currentText = textWalker.nextNode();
  while (currentText) {
    const textNode = currentText as Text;
    const parentTag = textNode.parentElement?.tagName ?? "";
    if (!SKIP_TAGS.has(parentTag)) {
      const nextValue = translateLegacyText(textNode.nodeValue || "", locale);
      if (nextValue !== textNode.nodeValue) {
        textNode.nodeValue = nextValue;
      }
    }
    currentText = textWalker.nextNode();
  }

  if (!(root instanceof Element) && !(root instanceof Document)) {
    return;
  }

  const elements =
    root instanceof Document ? Array.from(root.querySelectorAll("*")) : [root, ...Array.from(root.querySelectorAll("*"))];

  elements.forEach((element) => {
    ATTRIBUTE_NAMES.forEach((attributeName) => {
      const value = element.getAttribute(attributeName);
      if (!value) return;
      const nextValue = translateLegacyText(value, locale);
      if (nextValue !== value) {
        element.setAttribute(attributeName, nextValue);
      }
    });
  });
}

export function LegacyLocaleBridge() {
  const pathname = usePathname();
  const locale = getLocaleFromPath(pathname) === "en" ? "en" : "ar";

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === "en" ? "ltr" : "rtl";

    if (locale !== "en") return;

    const applyTranslations = () => translateNodeTree(document.body, locale);
    applyTranslations();

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => translateNodeTree(node, locale));
        if (mutation.type === "characterData" && mutation.target) {
          translateNodeTree(mutation.target, locale);
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ATTRIBUTE_NAMES,
    });

    return () => observer.disconnect();
  }, [locale, pathname]);

  return null;
}
