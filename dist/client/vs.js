(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const services_1 = require("./services");
class VerySimple {
    constructor() {
        this.instanceRegistry = {};
        this.wsService = new services_1.WsService(this);
        this.httpService = new services_1.HttpService(this);
        this.componentService = new services_1.ComponentService(this);
        this.sharedService = { id: "$SharedService" };
    }
    Start() {
        document.addEventListener("DOMContentLoaded", () => {
            this.loadPartials();
            this.bootstrap(document);
        }, false);
    }
    bootstrap(root) {
        let components = root.querySelectorAll(Declarations.componentAttr);
        for (let i = 0; i < components.length; i++) {
            let component = components[i].attributes[Declarations.componentAttr.replace("[", "").replace("]", "")].value;
            let id = component + "-" + i;
            let obj = new Function("return new " + component);
            try {
                obj();
                this.initComponent(components, component, i);
            }
            catch (e) {
                if (components[i].attributes[Declarations.srcAttr]) {
                    let src = components[i].attributes[Declarations.srcAttr].value;
                    var script = document.createElement("script");
                    script.type = "text/javascript";
                    script.src = src;
                    script.onload = () => {
                        this.initComponent(components, component, i);
                    };
                    document.head.appendChild(script);
                }
                else {
                    this.initComponent(components, component, i);
                }
            }
        }
    }
    initComponent(components, component, i) {
        let f = new Function("component", "return new " + component);
        let instance = f(component);
        instance.id = Guid.NewGuid();
        components[i].setAttribute(Declarations.prefix + "id", instance.id);
        this.injectServices(instance);
        if (instance.$onComponentLoad != undefined) {
            instance.$onComponentLoad();
            for (let property in this.instanceRegistry) {
                var prop = this.instanceRegistry[property].instance;
                if (prop.id != "$SharedService" && prop.id != instance.id) {
                    this.bindElements(prop);
                }
            }
        }
        this.bindElements(instance);
    }
    injectServices(instance) {
        let initiator = this;
        for (var prop in instance) {
            switch (instance[prop]) {
                case "$SharedService":
                    instance[prop] = this.sharedService;
                    break;
                case "$WsService":
                    let wsService = new services_1.WsService(initiator);
                    wsService.caller = instance;
                    instance[prop] = wsService;
                    break;
                case "$HttpService":
                    let httpService = new services_1.HttpService(initiator);
                    httpService.caller = instance;
                    instance[prop] = httpService;
                    break;
                case "$ComponentService":
                    let componentService = new services_1.ComponentService(initiator);
                    componentService.caller = instance;
                    instance[prop] = componentService;
                    break;
            }
        }
    }
    loadPartials() {
        let partials = document.querySelectorAll(Declarations.partialAttr);
        partials.forEach(partial => {
            let p = this.componentService.getPartial(partial.attributes[Declarations.partialAttr.replace("[", "").replace("]", "")].value);
            p.then((doc) => {
                this.processPartial(partial, doc);
            });
        });
    }
    renderPartial(data, target) {
        let partials = document.querySelectorAll("[" + Declarations.targetAttr + "='" + target + "']");
        partials.forEach(partial => {
            this.processPartial(partial, data);
        });
    }
    processPartial(partial, data) {
        partial.innerHTML = "";
        if (typeof data.querySelector === "function") {
            partial.insertAdjacentHTML("beforeend", data.querySelector("body").innerHTML);
            this.bootstrap(partial);
        }
        else {
            let pre = document.createElement("pre");
            let text = document.createTextNode(data);
            pre.appendChild(text);
            partial.appendChild(pre);
        }
    }
    bindElements(instance) {
        if (document.querySelector("[" + Declarations.prefix + "id" + "='" + instance.id + "']") == null) {
            delete this.instanceRegistry[instance.id];
            return;
        }
        let els = document.querySelector("[" + Declarations.prefix + "id" + "='" + instance.id + "']").getElementsByTagName("*");
        for (let i = 0; i < els.length; i++) {
            let parent = this.findElementComponent(els[i]);
            if (parent != undefined && parent.attributes[Declarations.prefix + "id"] != undefined && parent.attributes[Declarations.prefix + "id"].value == instance.id) {
                for (let j = 0; j < els[i].attributes.length; j++) {
                    if (els[i].attributes[j].name === Declarations.forAttr) {
                        this.bindFor(instance, els[i], j);
                    }
                    if (els[i].attributes[j].name === Declarations.modelAttr) {
                        this.bindModel(instance, els[i]);
                    }
                    if (els[i].attributes[j].name === Declarations.hideAttr) {
                        this.bindHide(instance, els[i], j);
                    }
                    if (els[i].attributes[j].name === Declarations.disabledAttr) {
                        this.bindDisabled(instance, els[i], j);
                    }
                    if (els[i].attributes[j].name === Declarations.classAttr) {
                        this.bindClass(instance, els[i], j);
                    }
                    if (els[i].attributes[j].name.indexOf(Declarations.eventStart) === 0) {
                        this.bindEvent(instance, els[i], j);
                    }
                }
            }
        }
    }
    findElementComponent(element) {
        let parent = element.parentElement;
        if (parent != null) {
            if (parent.attributes[Declarations.componentAttr.replace("[", "").replace("]", "")] == undefined) {
                return this.findElementComponent(parent);
            }
            else {
                return parent;
            }
        }
    }
    bindFor(instance, element, j) {
        let forEach = element.attributes[j].value.split(" in ");
        let template = element.getElementsByClassName("vs-for-template");
        let html = "";
        if (template.length > 0) {
            html = template[0].innerHTML;
            while (element.lastChild != template[0]) {
                element.removeChild(element.lastChild);
            }
        }
        if (forEach.length === 2) {
            let name = forEach[0];
            let property = forEach[1];
            let arr = instance[property];
            if (arr.length > 0) {
                if (html.length > 0) {
                    element.insertAdjacentHTML("beforeend", html);
                    Array.prototype.forEach.call(element.getElementsByTagName("*"), child => {
                        child.removeAttribute(Declarations.boundAttr);
                    });
                }
                element.innerHTML = "<div vs-for-item>" + (html.length == 0 ? element.innerHTML : html) + "</div>";
                let sourceEl = element.firstElementChild;
                arr.forEach((item, index) => {
                    var cln = sourceEl.cloneNode(true);
                    let el = element.appendChild(cln);
                    var elements = el.getElementsByTagName("*");
                    Array.prototype.forEach.call(elements, elm => {
                        elm.removeAttribute(Declarations.boundAttr);
                        Array.prototype.forEach.call(elm.attributes, attribute => {
                            if (attribute.name == Declarations.modelAttr) {
                                Helper.setAttribute(elm, Declarations.modelAttr, property, index, name);
                            }
                            if (attribute.name.indexOf(Declarations.eventStart) == 0) {
                                let args = Helper.getArgs(attribute.value);
                                let evalArgs = args.replace(name, property + "[" + index + "]");
                                attribute.value = attribute.value.replace(args, evalArgs);
                            }
                            if (attribute.name == Declarations.disabledAttr) {
                                Helper.setAttribute(elm, Declarations.disabledAttr, property, index, name);
                            }
                            if (attribute.name == Declarations.hideAttr) {
                                Helper.setAttribute(elm, Declarations.hideAttr, property, index, name);
                            }
                        });
                    });
                });
                sourceEl.classList.add("vs-for-template");
                sourceEl.style.display = "none";
            }
        }
    }
    bindHide(instance, element, j) {
        let value = instance[element.attributes[j].value.replace("!", "")] == undefined ? false : instance[element.attributes[j].value.replace("!", "")];
        let property = element.attributes[j].value.replace("!", "");
        try {
            let e = new Function("instance", "return instance." + property);
            value = e(instance);
            if (element.attributes[j].value.indexOf("!") == 0) {
                value = !value;
                property = property.replace("!", "");
            }
        }
        catch (ex) {
        }
        if (value) {
            element.style.display = "none";
        }
        else {
            element.style.display = "";
        }
        this.addToInstanceRegistry(instance, property, element);
    }
    bindDisabled(instance, element, j) {
        let value = instance[element.attributes[j].value.replace("!", "")] == undefined ? false : instance[element.attributes[j].value.replace("!", "")];
        let property = element.attributes[j].value.replace("!", "");
        try {
            let e = new Function("instance", "return instance." + property);
            value = e(instance);
            if (element.attributes[j].value.indexOf("!") == 0) {
                value = !value;
                property = property.replace("!", "");
            }
        }
        catch (ex) {
        }
        if (value) {
            element.setAttribute("disabled", "disabled");
        }
        else {
            element.removeAttribute("disabled");
        }
        this.addToInstanceRegistry(instance, property, element);
    }
    bindClass(instance, element, j) {
        let value = instance[element.attributes[j].value.replace("!", "")] == undefined ? false : instance[element.attributes[j].value.replace("!", "")];
        let property = element.attributes[j].value;
        let entry = instance.constructor.name + "." + property;
        if (value.length == 0) {
            if (element.attributes[Declarations.classAttr + "-current"]) {
                element.classList.remove(element.attributes[Declarations.classAttr + "-current"].value);
            }
        }
        else {
            if (element.attributes[Declarations.classAttr + "-current"]) {
                element.classList.remove(element.attributes[Declarations.classAttr + "-current"].value);
            }
            value = value.replace("'", "").replace("'", "").replace("\"", "").replace("\"", "");
            element.setAttribute(Declarations.classAttr + "-current", value);
            element.classList.add(value);
        }
        this.addToInstanceRegistry(instance, property, element);
    }
    bindModel(instance, element) {
        if (element.attributes[Declarations.modelAttr] == undefined) {
            return;
        }
        let property = element.attributes[Declarations.modelAttr].value;
        let entry = "";
        if (element.attributes[Declarations.modelAttr].value.indexOf("$SharedService.") == 0) {
            instance = this.sharedService;
            if (!this.sharedService[element.attributes[Declarations.modelAttr].value.replace("$SharedService.", "")]) {
                this.sharedService[element.attributes[Declarations.modelAttr].value.replace("$SharedService.", "")] = "";
            }
            entry = "this.sharedService." + property.replace("$SharedService.", "");
        }
        else {
            entry = instance.constructor.name + "." + property;
        }
        let value = this.evalModel(instance, element.attributes[Declarations.modelAttr].value);
        if (element["value"] != undefined) {
            element["value"] = value;
            if (!element.attributes[Declarations.boundAttr]) {
                if (!this.instanceRegistry[instance.id] || !this.instanceRegistry[instance.id][entry.replace(instance.constructor.name + ".", "")] || !this.instanceRegistry[instance.id][entry.replace(instance.constructor.name + ".", "")].elements.find(e => e == element)) {
                    element.addEventListener("keyup", () => {
                        this.bindModelValue(instance, element, value);
                    }, false);
                }
            }
        }
        else {
            if (value != undefined) {
                element.innerHTML = value;
            }
        }
        this.addToInstanceRegistry(instance, property, element);
    }
    evalModel(instance, modelString) {
        if (modelString.indexOf("$SharedService.") == 0) {
            return eval(modelString.replace("$SharedService.", "this.sharedService."));
        }
        else {
            try {
                let f = new Function("instance", "return instance." + modelString);
                return f(instance);
            }
            catch (ex) {
                return "";
            }
        }
    }
    bindModelValue(instance, element, value) {
        if (element["value"] !== value) {
            this.assignProperty(instance, element.attributes[Declarations.modelAttr].value, element["value"]);
            this.syncModel(instance);
        }
    }
    assignProperty(instance, property, value) {
        if (property.indexOf("$SharedService.") == 0) {
            eval("this.sharedService." + property.replace("$SharedService.", "") + "=value");
        }
        else {
            let f = new Function("instance, value", "return instance." + property + "=value");
            return f(instance, value);
        }
    }
    bindEvent(instance, element, j) {
        if (element.attributes[Declarations.boundAttr]) {
            return;
        }
        let entry = instance.constructor.name + "." + element.attributes[j].value;
        let argsString = Helper.getArgs(entry);
        element.addEventListener(element.attributes[j].name.toString().replace(Declarations.eventStart, ""), () => {
            let method = element.attributes[j].value.replace("(" + argsString + ")", "");
            let args = argsString.split(",");
            args.forEach((arg, index) => {
                if (arg.length > 0) {
                    try {
                        let p = new Function("instance", "return instance." + arg);
                        let res = p(instance);
                        if (res) {
                            args[index] = res;
                        }
                    }
                    catch (ex) {
                    }
                }
            });
            instance[method](args.join(","));
            this.bindElements(instance);
            for (let property in this.instanceRegistry) {
                for (let propName in this.instanceRegistry[property].instance) {
                    if (this.instanceRegistry[property].instance[propName].id && this.instanceRegistry[property].instance[propName].id == "$SharedService") {
                        this.bindElements(this.instanceRegistry[property].instance);
                    }
                }
            }
        }, false);
        element.setAttribute(Declarations.boundAttr, "");
    }
    addToInstanceRegistry(instance, property, element) {
        let instanceEntry = this.instanceRegistry[instance.id];
        property = property.replace("$SharedService.", "");
        if (instanceEntry == undefined) {
            this.instanceRegistry[instance.id] = {};
            this.instanceRegistry[instance.id].instance = instance;
        }
        if (this.instanceRegistry[instance.id][property] == undefined) {
            this.instanceRegistry[instance.id][property] = {};
        }
        if (this.instanceRegistry[instance.id][property].elements == undefined) {
            this.instanceRegistry[instance.id][property].elements = new Array();
        }
        if (!this.instanceRegistry[instance.id][property].elements.find(e => e == element)) {
            this.instanceRegistry[instance.id][property].elements.push(element);
        }
    }
    syncModel(instance) {
        for (let property in this.instanceRegistry[instance.id]) {
            if (property != "instance") {
                this.instanceRegistry[instance.id][property].elements.forEach(element => {
                    this.bindModel(instance, element);
                });
            }
        }
    }
}
exports.VerySimple = VerySimple;
class Helper {
    static setAttribute(modelEl, attr, property, index, name) {
        modelEl.setAttribute(attr, property + "[" + index + "]" + modelEl.attributes[attr].value.replace(name, ""));
    }
    static getArgs(entry) {
        return entry.substr(entry.lastIndexOf("(") + 1, entry.lastIndexOf(")") - entry.lastIndexOf("(") - 1);
    }
}
exports.Helper = Helper;
class Declarations {
}
Declarations.prefix = "vs-";
Declarations.eventStart = Declarations.prefix + "event-";
Declarations.boundAttr = Declarations.prefix + "bound";
Declarations.partial = "partial";
Declarations.partialAttr = "[" + Declarations.prefix + Declarations.partial + "]";
Declarations.component = "component";
Declarations.componentAttr = "[" + Declarations.prefix + Declarations.component + "]";
Declarations.forAttr = Declarations.prefix + "for";
Declarations.forLoadedAttr = Declarations.prefix + "for-loaded";
Declarations.modelAttr = Declarations.prefix + "model";
Declarations.hideAttr = Declarations.prefix + "hide";
Declarations.disabledAttr = Declarations.prefix + "disabled";
Declarations.classAttr = Declarations.prefix + "class";
Declarations.targetAttr = Declarations.prefix + "target";
Declarations.srcAttr = Declarations.prefix + "src";
exports.Declarations = Declarations;
class Guid {
    static NewGuid() {
        let d = new Date().getTime();
        if (Date.now) {
            d = Date.now();
        }
        let uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            let r = (d + Math.random() * 16) % 16 | 0;
            d = Math.floor(d / 16);
            return (c == 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        });
        return uuid;
    }
}
exports.Guid = Guid;
new VerySimple().Start();

},{"./services":2}],2:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class WsService {
    constructor(_initiator) {
        this.ws = null;
        this.initiator = _initiator;
    }
    init(address) {
        this.ws = new WebSocket(address);
    }
    send(data) {
        this.ws.send(data);
    }
    listen(callback) {
        const self = this;
        this.ws.onmessage = function (event) {
            self.initiator.initialLoad = true;
            setTimeout(() => {
                self.initiator.bindElements(self.caller);
                callback(event);
            }, 100);
        };
    }
}
exports.WsService = WsService;
class HttpService {
    constructor(_initiator) {
        this.initiator = _initiator;
    }
    getJson(url, body = null) {
        return new Promise((resolve, reject) => {
            let xhr = new XMLHttpRequest();
            xhr.onload = () => {
                resolve(xhr.response);
                this.initiator.initialLoad = true;
                setTimeout(() => this.initiator.bindElements(this.caller), 100);
            };
            xhr.onerror = () => reject(xhr.statusText);
            xhr.open("GET", url);
            xhr.responseType = "json";
            xhr.send();
        });
    }
    getText(url) {
        return new Promise((resolve, reject) => {
            let xhr = new XMLHttpRequest();
            xhr.onload = () => resolve(xhr.response);
            xhr.onerror = () => reject(xhr.statusText);
            xhr.open("GET", url);
            xhr.responseType = "text";
            xhr.send();
        });
    }
}
exports.HttpService = HttpService;
class ComponentService {
    constructor(_initiator) {
        this.initiator = _initiator;
    }
    renderPartial(url, target) {
        return new Promise((resolve, reject) => {
            this.getPartial(url).then((res) => {
                this.initiator.renderPartial(res, target);
                resolve(true);
            });
        });
    }
    renderText(data, target) {
        this.initiator.renderPartial(data, target);
    }
    getPartial(url) {
        return new Promise((resolve, reject) => {
            let xhr = new XMLHttpRequest();
            xhr.onload = () => resolve(xhr.response);
            xhr.onerror = () => reject(xhr.statusText);
            xhr.open("GET", url);
            xhr.responseType = "document";
            xhr.send();
        });
    }
}
exports.ComponentService = ComponentService;

},{}]},{},[1]);
