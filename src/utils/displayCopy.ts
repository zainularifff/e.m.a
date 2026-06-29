const SKIP_TAGS = "script,style,noscript,textarea,input,select,option,code,pre,kbd,samp,svg";

const COPY_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\bAPI\s+endpoints\b/g, "service routes"],
  [/\bAPI\s+endpoint\b/g, "service route"],
  [/\bAPI\s+calls\b/g, "service requests"],
  [/\bAPI\s+call\b/g, "service request"],
  [/\bAPI\s+responses\b/g, "service results"],
  [/\bAPI\s+response\b/g, "service result"],
  [/\bAPI\s+payloads\b/g, "service details"],
  [/\bAPI\s+payload\b/g, "service details"],
  [/\bAPIs\b/g, "Services"],
  [/\bAPI\b/g, "Service"],
  [/\bpayloads\b/gi, "data details"],
  [/\bpayload\b/gi, "data details"],
  [/\bpushing\b/gi, "sending"],
  [/\bpushed\b/gi, "sent"],
  [/\bpush\b/gi, "send"],
  [/\bpulling\b/gi, "loading"],
  [/\bpulled\b/gi, "loaded"],
  [/\bpull\b/gi, "load"],
  [/\bfetching\b/gi, "loading"],
  [/\bfetched\b/gi, "loaded"],
  [/\bfetch\b/gi, "load"],
  [/\bbackend\b/gi, "service layer"],
  [/\bfrontend\b/gi, "screen"],
];

function standardText(value: string) {
  return COPY_REPLACEMENTS.reduce((text, [pattern, replacement]) => text.replace(pattern, replacement), value);
}

function cleanTextNode(node: Node) {
  const parent = node.parentElement;
  if (!parent || parent.closest(SKIP_TAGS) || parent.closest("[data-ema-raw-copy='true']")) return;
  const before = node.textContent || "";
  const after = standardText(before);
  if (after !== before) node.textContent = after;
}

function cleanRoot(root: ParentNode) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: Node[] = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach(cleanTextNode);
}

export function installDisplayCopyStandardizer() {
  if (typeof document === "undefined" || typeof MutationObserver === "undefined") return () => undefined;

  const roots = () => Array.from(document.querySelectorAll(".ema-topbar, .ema-page"));
  const clean = () => roots().forEach((root) => cleanRoot(root));
  clean();

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === "characterData") {
        cleanTextNode(mutation.target);
        return;
      }
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.TEXT_NODE) cleanTextNode(node);
        if (node instanceof HTMLElement) cleanRoot(node);
      });
    });
  });

  roots().forEach((root) => observer.observe(root, { childList: true, subtree: true, characterData: true }));
  window.setTimeout(clean, 100);

  return () => observer.disconnect();
}
