const HS_DATA = {};
function updateObservables() {
    document.querySelectorAll("hs-print").forEach(el => {
        const expr = el.getAttribute("value");
        if (expr) {
            const val = evaluateExpr(expr, HS.vars);
            el.textContent = (val !== undefined && val !== null) ? val : "";
        }
    });

    document.querySelectorAll("hs-show[condition]").forEach(el => {
        const cond = el.getAttribute("condition");
        const visible = evaluateExpr(cond, HS.vars);
        el.style.display = visible ? "" : "none";
    });
    
    document.querySelectorAll("hs-hide[condition]").forEach(el => {
        const cond = el.getAttribute("condition");
        const hidden = evaluateExpr(cond, HS.vars);
        el.style.display = hidden ? "none" : "";
    });
}

const HS = {
    vars: new Proxy(HS_DATA, {
        set: (target, prop, value) => {
            target[prop] = value;
            updateObservables();
            return true;
        },
        get: (target, prop) => {
            return target[prop];
        }
    })
};

function evaluateExpr(expr, localScope) {
    try {
        const rawScope = localScope === HS.vars ? HS_DATA : localScope;
        const combinedScope = { ...HS_DATA, ...rawScope };

        const safeScope = new Proxy(combinedScope, {
            has: (target, prop) => true,
            get: (target, prop) => {
                if (prop === Symbol.unscopables) return undefined;
                if (prop in target) return target[prop];
                if (prop in window || prop === 'Math' || prop === 'console') return window[prop];
                return 0;
            }
        });
        return Function("vars", `with(vars){ return (${expr}); }`)(safeScope);
    } catch (e) {
        return undefined;
    }
}

async function parseBlock(element, currentMutableScope = HS.vars) {
    const children = Array.from(element.children);

    for (const child of children) {
        if (!document.contains(child) && child.parentNode !== element) continue;

        const tag = child.tagName.toLowerCase();

        if (tag === "hs-var") {
            const name = child.getAttribute("name");
            const value = child.getAttribute("value");
            currentMutableScope[name] = isNaN(value) ? value : Number(value);
            child.remove();

        } else if (tag === "hs-set") {
            const name = child.getAttribute("name");
            const expr = child.getAttribute("value");
            currentMutableScope[name] = evaluateExpr(expr, currentMutableScope);
            child.remove();

        } else if (tag === "hs-math") {
            const target = child.getAttribute("result");
            const expr = child.getAttribute("expr");
            currentMutableScope[target] = evaluateExpr(expr, currentMutableScope);
            child.remove();

        } else if (tag === "hs-random") {
            const name = child.getAttribute("name");
            const min = Number(child.getAttribute("min"));
            const max = Number(child.getAttribute("max"));
            currentMutableScope[name] = Math.floor(Math.random() * (max - min + 1)) + min;
            child.remove();

        } else if (tag === "hs-print") {
            const expr = child.getAttribute("value");
            const val = evaluateExpr(expr, currentMutableScope);
            child.textContent = (val !== undefined && val !== null) ? val : "";

        } else if (tag === "hs-log") {
            const expr = child.getAttribute("value");
            console.log("[HS-LOG]", evaluateExpr(expr, currentMutableScope));
            child.remove();

        } else if (tag === "hs-group") {
            const groupLocalScope = {};
            await parseBlock(child, groupLocalScope);
            child.replaceWith(...Array.from(child.childNodes));

        } else if (tag === "hs-if") {
            const condition = child.getAttribute("condition");
            const elsePart = child.querySelector("hs-else");
            const htmlTrue = elsePart ? child.innerHTML.replace(elsePart.outerHTML, "") : child.innerHTML;
            const htmlFalse = elsePart ? elsePart.innerHTML : "";

            const condResult = evaluateExpr(condition, currentMutableScope);
            const contentToProcess = condResult ? htmlTrue : htmlFalse;

            const tempContainer = document.createElement("div");
            tempContainer.innerHTML = contentToProcess;
            await parseBlock(tempContainer, currentMutableScope);
            child.replaceWith(...Array.from(tempContainer.childNodes));

        } else if (tag === "hs-show") {
            const cond = child.getAttribute("condition");
            const visible = evaluateExpr(cond, currentMutableScope);
            if (!visible) child.style.display = "none";
            await parseBlock(child, currentMutableScope);

        } else if (tag === "hs-hide") {
            const cond = child.getAttribute("condition");
            const hide = evaluateExpr(cond, currentMutableScope);
            if (hide) child.style.display = "none";
            await parseBlock(child, currentMutableScope);

        } else if (tag === "hs-for") {
            const loop = child.getAttribute("loop");
            const template = child.innerHTML;
            let loopVarName = child.getAttribute("var");

            if (!loopVarName && loop) {
                const match = loop.match(/^\s*(?:let|var)?\s*([a-zA-Z_$][0-9a-zA-Z_$]*)\s*=/);
                if (match) loopVarName = match[1];
            }
            
            let iterations = [];
            try {
                const loopCollector = Function(`
                    const results = [];
                    let i, j, k, index, item;
                    let __safety = 0;
                    for(${loop}){
                        if(++__safety > 2000) break;
                        let val = undefined;
                        // On essaie de deviner la variable de boucle
                        if(typeof item !== 'undefined') val = item;
                        else if(typeof i !== 'undefined') val = i;
                        else if(typeof index !== 'undefined') val = index;
                        
                        results.push(val);
                    }
                    return results;
                `);
                iterations = loopCollector();
            } catch (e) {
                console.error("[HyperScript] Erreur boucle hs-for:", e);
            }

            const loopTempContainer = document.createElement("div");
            for (const val of iterations) {
                if (loopVarName) currentMutableScope[loopVarName] = val;
                const iterWrapper = document.createElement("div");
                iterWrapper.innerHTML = template;
                await parseBlock(iterWrapper, currentMutableScope);
                loopTempContainer.append(...Array.from(iterWrapper.childNodes));
            }
            if (loopVarName) delete currentMutableScope[loopVarName];
            child.replaceWith(...Array.from(loopTempContainer.childNodes));

        } else if (tag === "hs-on") {
            const event = child.getAttribute("event");
            const targetSelector = child.getAttribute("target");
            const actions = child.innerHTML;
            const triggerEl = document.querySelector(targetSelector) || element.querySelector(targetSelector);
            
            if (triggerEl) {
                triggerEl.addEventListener(event, async (e) => {
                    const tempContainer = document.createElement("div");
                    tempContainer.innerHTML = actions;
                    
                    await parseBlock(tempContainer, HS.vars);

                    const outputTarget = tempContainer.querySelector('[target]');
                    if (outputTarget) {
                        const destinationSelector = outputTarget.getAttribute('target');
                        const destinationEl = document.querySelector(destinationSelector);
                        if (destinationEl) {
                            destinationEl.innerHTML = ""; 
                            destinationEl.append(...Array.from(outputTarget.childNodes));
                        }
                    }
                });
            }
            child.remove();
            
        } else if (tag === "hs-addclass" || tag === "hs-removeclass" || tag === "hs-attr") {
             const isAdd = tag === "hs-addclass";
             const targetSelector = child.getAttribute("target");
             const targetEl = document.querySelector(targetSelector);
             if (targetEl) {
                 if (tag === "hs-attr") {
                     const name = child.getAttribute("name");
                     const val = evaluateExpr(child.getAttribute("value"), currentMutableScope);
                     if (name) targetEl.setAttribute(name, val);
                 } else {
                     const cls = child.getAttribute("class");
                     if (cls) targetEl.classList[isAdd ? "add" : "remove"](cls);
                 }
             }
             child.remove();

        } else {
            await parseBlock(child, currentMutableScope);
        }
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    const style = document.createElement('style');
    style.innerHTML = `
        hs-print { display: inline; }
        hs-show, hs-hide { display: block; }
    `;
    document.head.appendChild(style);
    await parseBlock(document.body, HS.vars);
});
