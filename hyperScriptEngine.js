const HS = {
    vars: {}
};

function evaluateExpr(expr, localScope) {
    try {
        const combinedScope = { ...HS.vars, ...localScope };
        // Utilisation d'un Proxy pour éviter les ReferenceError sur les variables non initialisées (optionnel mais utile pour le cas x+1)
        const safeScope = new Proxy(combinedScope, {
            has: (target, prop) => true,
            get: (target, prop) => {
                if (prop === Symbol.unscopables) return undefined;
                if (prop in target) return target[prop];
                if (prop in window || prop === 'Math' || prop === 'console') return window[prop];
                return 0; // Valeur par défaut pour les variables inconnues
            }
        });
        return Function("vars", `with(vars){ return (${expr}); }`)(safeScope);
    } catch (e) {
        console.warn("[HyperScript] Erreur lors de l'évaluation de l'expression:", expr, e);
        return undefined;
    }
}

async function parseBlock(element, currentMutableScope = HS.vars) {
    const children = Array.from(element.children);

    for (const child of children) {
        if (!child.parentNode) continue;

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
        } else if (tag === "hs-for") {
            // ... (code hs-for existant, simplifié pour brièveté si inchangé, mais gardons la logique complète)
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
                    let i, j, k, index;
                    let __safety = 0;
                    for(${loop}){
                        if(++__safety > 2000) break;
                        let val = undefined;
                        if(typeof i !== 'undefined') val = i;
                        else if(typeof j !== 'undefined') val = j;
                        else if(typeof index !== 'undefined') val = index;
                        else if(typeof k !== 'undefined') val = k;
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

        } else if (tag === "hs-repeat") {
            let times = child.getAttribute("times");
            const varName = child.getAttribute("var");
            times = evaluateExpr(times, currentMutableScope) || 0;
            const repeatTempContainer = document.createElement("div");
            for (let i = 1; i <= times; i++) {
                if (varName) currentMutableScope[varName] = i;
                const iterWrapper = document.createElement("div");
                iterWrapper.innerHTML = child.innerHTML;
                await parseBlock(iterWrapper, currentMutableScope);
                repeatTempContainer.append(...Array.from(iterWrapper.childNodes));
            }
            if (varName) delete currentMutableScope[varName];
            child.replaceWith(...Array.from(repeatTempContainer.childNodes));
        } else if (tag === "hs-while") {
             // ... (idem hs-while)
             const condition = child.getAttribute("condition");
             const template = child.innerHTML;
             let whileOutput = "";
             let safety = 0;
             while (safety++ < 1000) {
                 let condResult = evaluateExpr(condition, currentMutableScope);
                 if (!condResult) break;
                 const iterationTempDiv = document.createElement("div");
                 iterationTempDiv.innerHTML = template;
                 await parseBlock(iterationTempDiv, currentMutableScope);
                 whileOutput += iterationTempDiv.innerHTML;
             }
             const whileTempContainer = document.createElement("div");
             whileTempContainer.innerHTML = whileOutput;
             child.replaceWith(...Array.from(whileTempContainer.childNodes));
        } else if (tag === "hs-switch") {
            // ... (idem hs-switch)
            const expr = child.getAttribute("expr");
            const switchVal = evaluateExpr(expr, currentMutableScope);
            let matchedHTML = "";
            const cases = Array.from(child.querySelectorAll("hs-case"));
            let defaultCaseHtml = "";
            for (const caseEl of cases) {
                if (caseEl.hasAttribute("default")) {
                    defaultCaseHtml = caseEl.innerHTML;
                } else {
                    const caseValExpr = caseEl.getAttribute("value");
                    const isMatch = evaluateExpr(`(${caseValExpr}) === val`, { ...currentMutableScope, val: switchVal });
                    if (isMatch) {
                        matchedHTML = caseEl.innerHTML;
                        break;
                    }
                }
            }
            if (!matchedHTML) matchedHTML = defaultCaseHtml;
            const switchTempContainer = document.createElement("div");
            switchTempContainer.innerHTML = matchedHTML;
            await parseBlock(switchTempContainer, currentMutableScope);
            child.replaceWith(...Array.from(switchTempContainer.childNodes));
        } else if (tag === "hs-print") {
            const expr = child.getAttribute("value");
            const val = evaluateExpr(expr, currentMutableScope);
            // FIX: Gestion correcte de la valeur 0 et affichage par défaut si undefined
            child.outerHTML = (val !== undefined && val !== null) ? val : "";
        } else if (tag === "hs-log") {
            const expr = child.getAttribute("value");
            console.log("[HS-LOG]", evaluateExpr(expr, currentMutableScope));
            child.remove();
        } else if (tag === "hs-show") {
            const cond = child.getAttribute("condition");
            const visible = evaluateExpr(cond, currentMutableScope);
            if (!visible) child.style.display = "none";
            child.removeAttribute("condition");
            await parseBlock(child, currentMutableScope);
        } else if (tag === "hs-hide") {
            const cond = child.getAttribute("condition");
            const hide = evaluateExpr(cond, currentMutableScope);
            if (hide) child.style.display = "none";
            child.removeAttribute("condition");
            await parseBlock(child, currentMutableScope);
        } else if (tag === "hs-addclass" || tag === "hs-removeclass" || tag === "hs-attr") {
             // ... (blocs DOM simples, inchangés)
             const isAdd = tag === "hs-addclass";
             const isRemove = tag === "hs-removeclass";
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

        } else if (tag === "hs-on") {
            const event = child.getAttribute("event");
            const targetSelector = child.getAttribute("target");
            const actions = child.innerHTML;
            
            const triggerEl = element.querySelector(targetSelector) || document.querySelector(targetSelector);
            
            if (triggerEl) {
                triggerEl.addEventListener(event, async (e) => {

                    const tempContainer = document.createElement("div");
                    tempContainer.innerHTML = actions;
                    
                    await parseBlock(tempContainer, currentMutableScope);

                    const outputTarget = tempContainer.querySelector('[target]');
                    
                    if (outputTarget) {
                        const destinationSelector = outputTarget.getAttribute('target');
                        const destinationEl = document.querySelector(destinationSelector);
                        
                        if (destinationEl) {
                            destinationEl.innerHTML = ""; 
                            destinationEl.append(...Array.from(outputTarget.childNodes));
                        }
                    } else {
                    }
                });
            }
            child.remove();
        } else {
            await parseBlock(child, currentMutableScope);
        }
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    await parseBlock(document.body, HS.vars);
});
