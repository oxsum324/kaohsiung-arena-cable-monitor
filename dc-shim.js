/**
 * dc-shim.js — Minimal DCLogic + React shim
 *
 * Provides just enough surface to run the design tool's `<x-dc>` prototype
 * standalone in a plain browser without the proprietary support.js.
 *
 * What it supports (only what the .dc.html actually uses):
 *   - `React.createRef()` — returns { current: null }
 *   - `class Component extends DCLogic` with lifecycle:
 *       constructor(props) → state = {...}
 *       componentDidMount()
 *       componentDidUpdate(prevProps, prevState)
 *       setState(patch), forceUpdate()
 *       renderVals() → returns object of values used by template
 *   - Template resolution inside <x-dc>...</x-dc>:
 *       - `{{ expr }}` in text nodes and attribute values (mixed OK)
 *       - `onClick="{{ handler }}"` → attaches as click event
 *       - `ref="{{ refObj }}"` → assigns element to refObj.current
 *       - `<sc-for list="{{ items }}" as="var" ...>...</sc-for>`
 *          → unrolls one copy per item, inner interpolation uses local `var`
 *
 * On any `setState`, the entire <x-dc> subtree is re-rendered from the
 * cached original template. Elements bound via `ref="{{ }}"` are identity-
 * preserved across renders (the previous DOM node is reused in place, with
 * fresh attributes/children grafted on) rather than replaced — this mirrors
 * how the design tool's real reconciler behaves, and matters because Chart.js
 * instances are bound to a canvas by reference; a replaced canvas orphans
 * its chart, and unrelated state changes (e.g. switching sidebar sections)
 * would otherwise silently break every chart on the page.
 */
(function () {
  "use strict";

  // Minimal React polyfill
  window.React = {
    createRef: function () { return { current: null }; }
  };

  // Base class
  window.DCLogic = class {
    constructor() {
      // subclass constructor sets this.state / refs
    }

    setState(patch) {
      var prev = Object.assign({}, this.state);
      Object.assign(this.state, patch);
      this._doRender();
      if (typeof this.componentDidUpdate === "function") {
        this.componentDidUpdate(this.props || {}, prev);
      }
    }

    forceUpdate() {
      this._doRender();
    }

    _mount(root, template, props) {
      this._root = root;
      this._template = template;
      this.props = props || {};
      this._doRender();
      if (typeof this.componentDidMount === "function") {
        this.componentDidMount();
      }
    }

    _doRender() {
      var vals = this.renderVals();
      // Re-parse cached template into a temp container, then transplant.
      // (This ensures fresh refs and event listeners each render.)
      var tmp = document.createElement("div");
      tmp.innerHTML = this._template;
      _processNode(tmp, vals);
      // Swap DOM
      this._root.innerHTML = "";
      while (tmp.firstChild) this._root.appendChild(tmp.firstChild);
    }
  };

  // --- Template engine ---

  function _processNode(node, ctx) {
    if (!node) return;

    // sc-for expansion
    if (node.nodeType === 1 && node.tagName && node.tagName.toLowerCase() === "sc-for") {
      _expandForEach(node, ctx);
      return;
    }

    // Process children first (snapshot list because we may mutate)
    if (node.childNodes && node.childNodes.length) {
      var children = Array.prototype.slice.call(node.childNodes);
      for (var i = 0; i < children.length; i++) {
        _processNode(children[i], ctx);
      }
    }

    // Text node interpolation
    if (node.nodeType === 3) {
      var text = node.nodeValue;
      if (text && text.indexOf("{{") !== -1) {
        node.nodeValue = _interpolate(text, ctx);
      }
      return;
    }

    // Element attributes
    if (node.nodeType !== 1) return;
    var attrs = Array.prototype.slice.call(node.attributes || []);
    for (var j = 0; j < attrs.length; j++) {
      var name = attrs[j].name;
      var val = attrs[j].value;
      if (!val || val.indexOf("{{") === -1) continue;

      // onClick — treat as JS handler, not string
      if (name === "onClick" || name === "onclick") {
        var m = val.match(/^{{\s*([\s\S]+?)\s*}}$/);
        node.removeAttribute(name);
        if (m) {
          var handler;
          try { handler = _evalExpr(m[1], ctx); } catch (e) { handler = null; }
          if (typeof handler === "function") {
            node.addEventListener("click", handler);
          }
        }
        continue;
      }

      // ref="{{ ... }}" — attach current; reuse the previous node in place
      // when one exists (same tag), so external state attached to it by
      // identity (a Chart.js instance on a canvas, scroll position on a
      // container) survives this render instead of being orphaned.
      if (name === "ref") {
        var mr = val.match(/^{{\s*([\s\S]+?)\s*}}$/);
        node.removeAttribute(name);
        if (mr) {
          var refObj;
          try { refObj = _evalExpr(mr[1], ctx); } catch (e) { refObj = null; }
          if (refObj && typeof refObj === "object") {
            var prevNode = refObj.current;
            if (prevNode && prevNode !== node && prevNode.tagName === node.tagName && node.parentNode) {
              while (prevNode.attributes.length) prevNode.removeAttribute(prevNode.attributes[0].name);
              for (var ai = 0; ai < node.attributes.length; ai++) {
                prevNode.setAttribute(node.attributes[ai].name, node.attributes[ai].value);
              }
              while (prevNode.firstChild) prevNode.removeChild(prevNode.firstChild);
              while (node.firstChild) prevNode.appendChild(node.firstChild);
              node.parentNode.replaceChild(prevNode, node);
              refObj.current = prevNode;
            } else {
              refObj.current = node;
            }
          }
        }
        continue;
      }

      // General interpolation for other attributes (style, class, etc.)
      var out = _interpolate(val, ctx);
      // For style, if the whole value came from a single {{ }} expression that
      // returned a string ending without trailing semicolons, still OK.
      if (name === "style-hover") {
        // style-hover isn't a real attribute — remove
        node.removeAttribute(name);
      } else {
        node.setAttribute(name, out);
      }
    }
  }

  function _expandForEach(scNode, ctx) {
    var listAttr = scNode.getAttribute("list") || "";
    var asName = scNode.getAttribute("as") || "it";
    var lm = listAttr.match(/^{{\s*([\s\S]+?)\s*}}$/);
    if (!lm) { scNode.parentNode.removeChild(scNode); return; }
    var items;
    try { items = _evalExpr(lm[1], ctx); } catch (e) { items = []; }
    if (!items || !items.length) { scNode.parentNode.removeChild(scNode); return; }

    // Take inner template as HTML string
    var innerHTML = scNode.innerHTML;
    var parent = scNode.parentNode;
    var anchor = document.createComment("sc-for");
    parent.replaceChild(anchor, scNode);

    for (var i = 0; i < items.length; i++) {
      var tmp = document.createElement("div");
      tmp.innerHTML = innerHTML;
      var localCtx = Object.assign({}, ctx);
      localCtx[asName] = items[i];
      // Process each child before inserting
      var kids = Array.prototype.slice.call(tmp.childNodes);
      for (var j = 0; j < kids.length; j++) {
        _processNode(kids[j], localCtx);
      }
      while (tmp.firstChild) parent.insertBefore(tmp.firstChild, anchor);
    }
    parent.removeChild(anchor);
  }

  function _interpolate(text, ctx) {
    return text.replace(/{{\s*([\s\S]+?)\s*}}/g, function (_all, expr) {
      var v;
      try { v = _evalExpr(expr, ctx); } catch (e) { v = ""; }
      return v == null ? "" : String(v);
    });
  }

  function _evalExpr(expr, ctx) {
    // Build a function that takes ctx keys as args and returns the expression
    var keys = Object.keys(ctx);
    var vals = keys.map(function (k) { return ctx[k]; });
    // Function constructor scope is global, but we shadow via arg names
    var fn = new Function(keys.join(","), "return (" + expr + ");");
    return fn.apply(null, vals);
  }

  // --- Auto-boot: find the Component class script, execute, mount ---

  function _boot() {
    var xdc = document.querySelector("x-dc");
    if (!xdc) return;

    // Extract original template BEFORE first render mutates it
    var originalTemplate = xdc.innerHTML;

    // Find and execute the class Component script
    var scripts = document.querySelectorAll('script[type="text/x-dc"]');
    var ComponentClass = null;
    for (var i = 0; i < scripts.length; i++) {
      var code = scripts[i].textContent || "";
      try {
        // Executing in Function scope; expose Component via window
        (new Function(code + "\ntry { window.__DC_Component = Component; } catch(e){}"))();
      } catch (e) {
        console.error("[dc-shim] Component script eval failed:", e);
      }
    }
    ComponentClass = window.__DC_Component;
    if (!ComponentClass) {
      console.error("[dc-shim] No class Component found in <script type=\"text/x-dc\">.");
      return;
    }

    // Instantiate and mount
    var instance = new ComponentClass();
    instance._mount(xdc, originalTemplate, {});
    window.__dcInstance = instance;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", _boot);
  } else {
    _boot();
  }
})();
