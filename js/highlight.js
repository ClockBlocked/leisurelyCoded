window.Highlight = (function () {
  "use strict";

  const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ESC[c]);

  function run(code, rules, classify) {
    const out = [];
    let i = 0;
    while (i < code.length) {
      let matched = false;
      for (const rule of rules) {
        rule.re.lastIndex = i;
        const m = rule.re.exec(code);
        if (m && m.index === i && m[0].length > 0) {
          let cls = rule.cls;
          if (classify) cls = classify(m[0], cls) || cls;
          out.push(cls ? `<span class="tok-${cls}">${esc(m[0])}</span>` : esc(m[0]));
          i += m[0].length;
          matched = true;
          break;
        }
      }
      if (!matched) {
        out.push(esc(code[i]));
        i++;
      }
    }
    return out.join("");
  }

  
  /* ---------- HTML ---------- */
  const HTML_RULES = [
    { re: /<!--[\s\S]*?-->/y, cls: "comment" },
    { re: /<!DOCTYPE[^>]*>/iy, cls: "doctype" },
    { re: /<\/?[a-zA-Z][\w:-]*/y, cls: "tag" },
    { re: /\/?>/y, cls: "punct" },
    { re: /[a-zA-Z_:][\w:.-]*(?=\s*=)/y, cls: "attr" },
    { re: /=(?=\s*["'])/y, cls: "op" },
    { re: /"[^"]*"/y, cls: "string" },
    { re: /'[^']*'/y, cls: "string" },
    { re: /&[a-zA-Z]+;|&#\d+;/y, cls: "entity" },
    { re: /[a-zA-Z_:][\w:.-]*/y, cls: "attr" },
  ];

  
  /* ---------- JS ---------- */
  const JS_KEYWORDS =
    /^(?:const|let|var|function|return|if|else|for|while|do|break|continue|new|class|extends|super|this|typeof|instanceof|in|of|try|catch|finally|throw|async|await|yield|import|export|default|from|as|delete|void|switch|case|true|false|null|undefined)$/;

  const JS_RULES = [
    { re: /\/\/[^\n]*/y, cls: "comment" },
    { re: /\/\*[\s\S]*?\*\//y, cls: "comment" },
    { re: /`(?:\\[\s\S]|[^`\\])*`/y, cls: "string" },
    { re: /'(?:\\[\s\S]|[^'\\])*'/y, cls: "string" },
    { re: /"(?:\\[\s\S]|[^"\\])*"/y, cls: "string" },
    { re: /\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b/y, cls: "number" },
    { re: /[a-zA-Z_$][\w$]*(?=\s*\()/y, cls: "func" },
    { re: /[a-zA-Z_$][\w$]*/y, cls: "ident" },
    { re: /[{}()[\]]/y, cls: "punct" },
    { re: /[+\-*/%=<>!&|^~?:;,.]+/y, cls: "op" },
  ];

  const classifyJS = (token, cls) => (cls === "ident" && JS_KEYWORDS.test(token) ? "keyword" : cls);

  return {
    html: (code) => run(code, HTML_RULES),
    js: (code) => run(code, JS_RULES, classifyJS),

    apply(el, lang) {
      if (!el) return;
      const src = el.textContent;
      el.innerHTML = lang === "js" ? run(src, JS_RULES, classifyJS) : run(src, HTML_RULES);
    },
  };
})();
