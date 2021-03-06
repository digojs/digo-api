"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const digo = require("digo");
const resolvor_1 = require("./resolvor");
/**
 * 生成接口文档。
 * @param apiFile 要生成的接口数据。
 * @param options 生成的选项。
 * @param writeFile 写入文件的回调函数。
 */
function generate(api, options, writeFile) {
    const apiFile = parseJSON(api);
    if (options.init) {
        options.init(apiFile);
    }
    const resolver = new resolvor_1.ApiResovler(apiFile);
    if (options.mockData) {
        resolver.mockData = join(options.mockData, resolver.mockData);
    }
    if (options.mockCount) {
        resolver.mockCount = join(options.mockCount, resolver.mockCount);
    }
    // 生成模拟数据。
    const mockDatas = {};
    if (options.mock) {
        generateMocks(resolver, mockDatas, options, writeFile);
    }
    // 生成 TS-SDK。
    if (options.ts) {
        generateTS(resolver, mockDatas, options, writeFile);
    }
    // 生成文档。
    if (options.doc) {
        generateDoc(resolver, mockDatas, options, writeFile);
    }
    // 自定义生成。
    if (options.generate) {
        options.generate(resolver, mockDatas, options, writeFile);
    }
}
exports.generate = generate;
/**
 * 解析一个 JSON 文件。
 */
function parseJSON(content) {
    try {
        return JSON.parse(content);
    }
    catch (e) { }
}
function join(func1, func2) {
    return (...args) => {
        const result = func1(...args);
        if (result !== undefined) {
            return result;
        }
        return func2(...args);
    };
}
/**
 * 生成模拟数据文件夹。
 * @param resolver 接口数据解析器。
 */
function generateMocks(resolver, mockDatas, options, writeFile) {
    const apis = resolver.getApis();
    for (const key in apis) {
        const api = apis[key];
        const path = digo.resolvePath(options.mock, toSafePath(api.name) + ".json");
        const response = api.responses[0];
        if (response.type != "void") {
            const mock = mockDatas[api.name] = resolver.getMock(response, undefined, options.merge === false ? undefined : parseJSON(digo.bufferToString(digo.readFileIf(path))), options.maxDepth, options.mockPrefix);
            writeFile(path, JSON.stringify(mock, undefined, 4));
        }
    }
}
/**
 * 生成 TS-SDK 文件夹。
 * @param resolver 接口数据解析器。
 */
function generateTS(resolver, mockDatas, options, writeFile) {
    const categories = resolver.getCategories();
    for (const key in categories) {
        const category = categories[key];
        const exportedNames = {};
        const exportedTypes = {};
        let apis = "";
        let allTypes = [];
        const addExportType = (type, typeParameters) => {
            if (typeParameters && typeParameters.indexOf(type) >= 0) {
                return type;
            }
            let name = exportedTypes[type];
            if (!name) {
                const resolvedType = resolver.getType(type);
                if (resolvedType.alias) {
                    return exportedTypes[type] = ({ "integer": "number", "object": "any", "date": "string" })[resolvedType.alias] || resolvedType.alias;
                }
                if (resolvedType.resolvedUnderlyingArray) {
                    return exportedTypes[type] = `${addExportType(resolvedType.resolvedUnderlyingArray, typeParameters)}[]`;
                }
                if (resolvedType.resolvedUnderlyingObject) {
                    return exportedTypes[type] = `{[key: string]: ${addExportType(resolvedType.resolvedUnderlyingObject, typeParameters)}}`;
                }
                if (resolvedType.resolvedUnderlyingGeneric) {
                    return exportedTypes[type] = `${addExportType(resolvedType.resolvedUnderlyingGeneric, typeParameters)}<${resolvedType.resolvedTypeArguments.map(t => addExportType(t, typeParameters)).join(", ")}>`;
                }
                exportedTypes[type] = name = addExportName(exportedNames, type);
                let types = "";
                if (resolvedType.summary || resolvedType.deprecated || resolvedType.created || resolvedType.author) {
                    types += `/**\n`;
                    if (resolvedType.summary) {
                        types += ` * ${removeComment(resolvedType.summary)}\n`;
                    }
                    if (resolvedType.deprecated) {
                        types += ` * @deprecated${resolvedType.deprecated === true ? "" : " " + removeComment(resolvedType.deprecated)}\n`;
                    }
                    if (resolvedType.created) {
                        types += ` * @since ${removeComment(resolvedType.created)}\n`;
                    }
                    if (resolvedType.author) {
                        types += ` * @since ${removeComment(resolvedType.author)}\n`;
                    }
                    types += ` */\n`;
                }
                types += `export ${resolvedType.memberType === "enum" ? "enum" : "interface"} ${name}${resolvedType.resolvedTypeParameters ? "<" + resolvedType.resolvedTypeParameters.join(", ") + ">" : ""}${resolvedType.extends ? " extends " + addExportType(resolvedType.extends, resolvedType.resolvedTypeParameters) : ""} {\n`;
                for (const key in resolvedType.properties) {
                    types += `\n`;
                    const property = resolvedType.properties[key];
                    if (property.summary || property.deprecated || property.created) {
                        types += `    /**\n`;
                        if (property.summary) {
                            types += `     * ${removeComment(property.summary)}\n`;
                        }
                        if (property.deprecated) {
                            types += `     * @deprecated${property.deprecated === true ? "" : " " + removeComment(property.deprecated)}\n`;
                        }
                        if (property.created) {
                            types += `     * @since ${removeComment(property.created)}\n`;
                        }
                        types += `     */\n`;
                    }
                    const propName = isPropName(property.name) ? property.name : JSON.stringify(property.name);
                    if (resolvedType.memberType === "enum") {
                        types += `    ${propName}${property.default != undefined ? " = " + property.default : ""},\n`;
                    }
                    else {
                        types += `    ${propName}${property.optional ? "?" : ""}: ${getType(property, resolvedType.resolvedTypeParameters)};\n`;
                    }
                }
                types += `\n}\n`;
                types += `\n`;
                allTypes.push(types);
            }
            return name;
        };
        const getType = (value, typeParameters) => {
            if (value.enum) {
                return value.enum.map(x => JSON.stringify(x)).join(" | ");
            }
            return addExportType(value.type, typeParameters);
        };
        for (const key2 in category.resolvedApis) {
            const api = category.resolvedApis[key2];
            apis += `/**\n`;
            if (api.summary) {
                apis += ` * ${removeComment(api.summary)}\n`;
            }
            for (const key in api.parameters) {
                const parameter = api.parameters[key];
                apis += ` * @param ${isIdentifier(parameter.name) ? parameter.name : "$" + parameter.name} ${parameter.summary ? " " + removeComment(parameter.summary) : ""}\n`;
            }
            apis += ` * @param success ${removeComment(options.successDescription || "The request callback when succeed.")}\n`;
            apis += ` * @param error ${removeComment(options.errorDescription || "The request callback when error occurs.")}\n`;
            if (api.deprecated) {
                apis += ` * @deprecated${api.deprecated === true ? "" : " " + api.deprecated}\n`;
            }
            if (api.created) {
                apis += ` * @since ${removeComment(api.created)}\n`;
            }
            if (api.author) {
                apis += ` * @since ${removeComment(api.author)}\n`;
            }
            apis += ` */\n`;
            apis += `export function ${addExportName(exportedNames, api.name)}(`;
            for (const key in api.parameters) {
                const parameter = api.parameters[key];
                apis += `${isIdentifier(parameter.name) ? parameter.name : "$" + parameter.name}${parameter.optional ? "?" : ""}: ${getType(parameter)}, `;
            }
            const returnType = resolver.getType(api.responses[0].type);
            const returnTypeExport = addExportType(api.responses[0].type);
            apis += `success?: (data: ${options.dataProperty && resolver.getProperty(returnType, options.dataProperty) ? `${returnTypeExport}["${options.dataProperty}"]` : "any"}, response: ${returnTypeExport}, xhr: any) => void, error?: (message: ${options.messageProperty && resolver.getProperty(returnType, options.messageProperty) ? `${returnTypeExport}["${options.messageProperty}"]` : "any"}, response: ${returnTypeExport}, xhr: any) => void, options?: any): Promise<${options.dataProperty && resolver.getProperty(returnType, options.dataProperty) ? `${returnTypeExport}["${options.dataProperty}"]` : "any"}> {\n`;
            apis += `    return ajax({\n`;
            apis += `        url: \`${JSON.stringify(api.url).slice(1, -1).replace(/\`/g, "\\`").replace(/{[^}]+}/g, all => `$${all}`)}\`,\n`;
            if (api.method) {
                apis += `        type: ${JSON.stringify(api.method)},\n`;
            }
            if (api.contentType) {
                apis += `        contentType: ${JSON.stringify(api.contentType)},\n`;
            }
            if (api.cache) {
                apis += `        cache: ${JSON.stringify(api.cache)},\n`;
            }
            let first = true;
            for (const key in api.parameters) {
                const parameter = api.parameters[key];
                if (first) {
                    apis += `        data: {\n`;
                    first = false;
                }
                else {
                    apis += `,\n`;
                }
                apis += `            ${isPropName(parameter.name) ? parameter.name : JSON.stringify(parameter.name)}: ${isIdentifier(parameter.name) ? parameter.name : "$" + parameter.name}`;
            }
            if (!first) {
                apis += `\n        },\n`;
            }
            apis += `        success: success,\n`;
            apis += `        error: error,\n`;
            apis += `        ...options\n`;
            apis += `    }) as any;\n`;
            apis += `}\n`;
            apis += `\n`;
        }
        if (apis || allTypes.length) {
            let code = `/**\n`;
            code += ` * @file API：${category.summary ? category.summary + "(" + category.name + ")" : category.name}\n`;
            if (category.author) {
                code += ` * @author ${category.author}\n`;
            }
            code += ` */\n`;
            if (options.ajaxModule) {
                code += `import { ajax } from "${options.ajaxModule}";\n`;
            }
            code += `\n`;
            code += apis;
            code += allTypes.join("");
            writeFile(digo.resolvePath(options.ts, toSafePath(category.name) + ".ts"), code);
        }
    }
}
/**
 * 添加一个导出名称。
 * @param exportNames 名称所属的分类。
 * @param name 要添加的名称。
 * @return 返回最终导出名称。
 */
function addExportName(exportNames, name) {
    name = name.replace(/^.*[\.\/]/, "").replace(/[\[\]\,<>{}\-]/g, "");
    if (!isIdentifier(name) || exportNames[name]) {
        let index = 1;
        while (exportNames[name + "_" + index]) {
            index++;
        }
        name += "_" + index;
    }
    exportNames[name] = true;
    return name;
}
/**
 * 获取指定名称的合法标识符。
 * @param name 要判断的名字。
 * @return 如果满足条件则返回 true，否则返回 false。
 */
function isIdentifier(name) {
    return isPropName(name) && [
        "break", "do", "instanceof", "typeof",
        "case", "else", "new", "var",
        "catch", "finally", "return", "void",
        "continue", "for", "switch", "while",
        "debugger", "function", "this", "with",
        "default", "if", "throw", "delete",
        "in", "try",
        "class", "enum", "extends", "super",
        "const", "export", "import", "null", "undefined"
    ].indexOf(name) < 0;
}
/**
 * 获取指定名称的合法标识符。
 * @param name 要判断的名字。
 * @return 如果满足条件则返回 true，否则返回 false。
 */
function isPropName(name) {
    return /^[a-zA-Z_$][\w$]*$/.test(name);
}
function toSafePath(name) {
    name = name.replace(/^\//, "").replace(/[<>;:+\s]|[?#].*$/g, "");
    return name;
}
function removeComment(value) {
    return value.replace(/\*\//g, "*\\/");
}
/**
 * 生成 API 文档。
 * @param resolver 接口数据解析器。
 */
function generateDoc(resolver, mockDatas, options, writeFile) {
    const tpl = digo.readFileIf(digo.resolvePath(__dirname, "../tpl.html")).toString();
    const data = {
        title: resolver.file.summary ? " - " + resolver.file.summary : "",
        version: resolver.file.modified || resolver.file.created || resolver.file.version,
        url: resolver.file.url,
        side: "",
        body: ""
    };
    const categories = resolver.getCategories();
    for (const key in categories) {
        const category = categories[key];
        data.side += `<li><a href="#${digo.encodeHTML(category.name)}">${digo.encodeHTML(category.summary || category.name)}</a><ul>`;
        data.body += `<h2 id="${digo.encodeHTML(category.name)}" ondblclick="toggleSection(this)">${digo.encodeHTML(category.name)}${category.summary ? `<small>${category.summary}</small>` : ""}</h2><div>`;
        for (const api of category.resolvedApis) {
            data.side += `<li><a href="#${digo.encodeHTML(api.name)}" title="${digo.encodeHTML(api.name)}${api.summary ? "&#10;" + digo.encodeHTML(api.summary) : ""}">${getLabel(api.method || "POST", true)}${digo.encodeHTML(api.summary || api.name)}</a></li>`;
            data.body += `<section class="api-panel">`;
            data.body += `<h3 id="${digo.encodeHTML(api.name)}" ondblclick="togglePanel(this)">${getLabel(api.method || "POST")}${digo.encodeHTML(api.name)}${api.summary ? `<small>${api.summary}</small>` : ""}</h3>`;
            data.body += `<div class="api-panel-body">`;
            const p = {};
            let hasParams = false;
            for (const key in api.parameters) {
                const parameter = api.parameters[key];
                hasParams = true;
                p[parameter.name] = resolver.getMock(parameter, parameter.name, parameter.name, options.maxDepth, options.mockPrefix);
            }
            if (hasParams) {
                data.body += `<h4>Request</h4>`;
                data.body += `<table class="api-table">
                        <tr>
                            <th>Parameter</th>
                            <th>Type</th>
                            <th>Summary</th>
                        </tr>`;
                for (const key in api.parameters) {
                    const parameter = api.parameters[key];
                    data.body += `<tr>
                            <td><code>${digo.encodeHTML(parameter.name)}</code>${parameter.optional ? "" : `<span class="api-required">*</span>`}</td>
                            <td><code>${typeToLink(resolver, parameter.type)}</code></td>
                            <td>${digo.encodeHTML(parameter.summary || "")}</td>
                        </tr>`;
                }
                data.body += `</table>`;
                data.body += `<pre class="api-code"><code contenteditable="true" spellcheck="false" onkeydown="tab(this, event)">${createCode(resolver, p, { properties: api.parameters })}</code></pre>`;
            }
            data.body += `<button class="api-send" onclick="send(this, ${digo.encodeHTML(JSON.stringify(api.name))}, ${api.method ? digo.encodeHTML(JSON.stringify(api.method)) : "undefined"}, ${api.contentType ? digo.encodeHTML(JSON.stringify(api.contentType)) : "undefined"})">Send</button>`;
            let r = mockDatas[api.name];
            if (r === undefined) {
                r = resolver.getMock(api.responses[0], undefined, undefined, options.maxDepth, options.mockPrefix);
            }
            if (r != null) {
                data.body += `<h4>Response</h4>`;
                data.body += `<code>${typeToLink(resolver, api.responses[0].type)}</code> ${digo.encodeHTML(api.responses[0].summary || "")}`;
                data.body += `<pre class="api-code"><code contenteditable="true" spellcheck="false" onkeydown="tab(this, event)">${createCode(resolver, r, resolver.getType(api.responses[0].type))}</code></pre>`;
            }
            data.body += `</div>`;
            data.body += `</section>`;
        }
        data.side += `</ul></li>`;
        data.body += `</div>`;
    }
    data.side += `<li><a href="#api_types">Types</a><ul>`;
    data.body += `<h2 id="api_types" onclick="toggleSection(this)">Types</h2>`;
    const types = resolver.getTypes();
    for (const key in types) {
        const type = types[key];
        if (type.alias || type.resolvedUnderlyingGeneric || type.resolvedUnderlyingArray || type.resolvedUnderlyingObject) {
            continue;
        }
        data.side += `<li><a href="#${digo.encodeHTML(type.name)}" title="${digo.encodeHTML(type.name)}${type.summary ? "&#10;" + digo.encodeHTML(type.summary) : ""}">${getLabel(type.memberType || "class", true)}${digo.encodeHTML(type.summary || type.name)}</a></li>`;
        data.body += `<section class="api-panel">`;
        data.body += `<h3 id="${digo.encodeHTML(type.name)}" onclick="togglePanel(this)">${getLabel(type.memberType || "class")}${digo.encodeHTML(type.name)}${type.summary ? `<small>${type.summary}</small>` : ""}</h3>`;
        data.body += `<div class="api-panel-body">`;
        data.body += `<table class="api-table">
                        <tr>
                            <th>Field</th>
                            <th>${type.memberType === "enum" ? "Value" : "Type"}</th>
                            <th>Summary</th>
                        </tr>`;
        for (const key in type.properties) {
            const property = type.properties[key];
            data.body += `<tr>
                            <td><code>${digo.encodeHTML(property.name)}</code>${property.optional ? "" : `<span class="api-required">*</span>`}</td>
                            <td><code>${type.memberType === "enum" ? property.default : typeToLink(resolver, property.type)}</code></td>
                            <td>${digo.encodeHTML(property.summary || "")}</td>
                        </tr>`;
        }
        data.body += `</table>`;
        data.body += `</div>`;
        data.body += `</section>`;
    }
    data.side += `</ul></li>`;
    const content = tpl.replace(/\$([a-z]+)/g, (all, key) => data[key] || "");
    writeFile(digo.resolvePath(options.doc), content);
}
function getLabel(method, reverse) {
    if (method === "DELETE") {
        method = "DEL";
    }
    const opt = { "GET": "success", "POST": "warning", "PUT": "info", "class": "info", "enum": "success" };
    return `<label class="api-label api-label-${opt[method] || "error"}${reverse ? " api-label-reverse" : ""}">${method.toUpperCase()}</label>`;
}
function createCode(resolver, data, type, comment, wrap = 30) {
    const parts = [];
    addPart(data, type, 0, comment);
    let html = "";
    let currentCharCount = 0;
    for (const part of parts) {
        if (part.type === "indent") {
            html += "\n" + "    ".repeat(part.data);
            currentCharCount = part.data;
        }
        else if (part.type === "comment") {
            if (part.data) {
                html += `${" ".repeat(currentCharCount < wrap ? wrap - currentCharCount : currentCharCount < wrap + 10 ? wrap - currentCharCount + 10 : currentCharCount < wrap + 20 ? wrap - currentCharCount + 20 : 1)} <span class="api-code-${part.type}">// ${part.data.replace(/\n/g, "<br>")}</span>`;
            }
        }
        else {
            html += `<span class="api-code-${part.type}">${digo.encodeHTML(part.data)}</span>`;
            currentCharCount += part.data.length;
        }
    }
    return html;
    function addPart(data, type, indent, comment) {
        if (data == null) {
            parts.push({ type: "keyword", data: "null" }, { type: "comment", data: comment });
        }
        else if (type.alias) {
            parts.push({ type: typeof data, data: JSON.stringify(data) }, { type: "comment", data: comment });
        }
        else if (type.memberType === "enum") {
            let enumKeys = "";
            const properties = resolver.getAllProperties(type);
            for (const key in properties) {
                if (enumKeys) {
                    enumKeys += "    ";
                }
                enumKeys += `${properties[key].default}:${key} ${properties[key].summary || ""}`;
            }
            parts.push({ type: typeof data, data: JSON.stringify(data) }, { type: "comment", data: (comment || "") + enumKeys });
        }
        else if (type.resolvedUnderlyingArray) {
            parts.push({ type: "punction", data: "[" });
            addPart(data && data[0], resolver.getType(type.resolvedUnderlyingArray), indent, comment);
            const lastComment = parts[parts.length - 1].type === "comment" ? parts.pop() : null;
            parts.push({ type: "punction", data: "]" });
            lastComment && parts.push(lastComment);
        }
        else if (type.resolvedUnderlyingObject) {
            parts.push({ type: "punction", data: "{" });
            parts.push({ type: "comment", data: comment });
            if (data) {
                let first = true;
                for (const key in data) {
                    if (first) {
                        first = false;
                    }
                    else {
                        const lastComment = parts[parts.length - 1].type === "comment" ? parts.pop() : null;
                        parts.push({ type: "punction", data: "," });
                        lastComment && parts.push(lastComment);
                    }
                    parts.push({ type: "indent", data: indent + 1 });
                    if (isPropName(key)) {
                        parts.push({ type: "keyword", data: key });
                    }
                    else {
                        parts.push({ type: "string", data: JSON.stringify(key) });
                    }
                    parts.push({ type: "punction", data: ": " });
                    addPart(data[key], resolver.getType(type.resolvedUnderlyingObject), indent + 1);
                }
                parts.push({ type: "indent", data: indent });
            }
            parts.push({ type: "punction", data: "}" });
        }
        else {
            parts.push({ type: "punction", data: "{" });
            parts.push({ type: "comment", data: comment });
            const properties = resolver.getAllProperties(type);
            let first = true;
            for (const key in properties) {
                const property = properties[key];
                if (first) {
                    first = false;
                }
                else {
                    const lastComment = parts[parts.length - 1].type === "comment" ? parts.pop() : null;
                    parts.push({ type: "punction", data: "," });
                    lastComment && parts.push(lastComment);
                }
                parts.push({ type: "indent", data: indent + 1 });
                if (isPropName(property.name)) {
                    parts.push({ type: "keyword", data: property.name });
                }
                else {
                    parts.push({ type: "string", data: JSON.stringify(property.name) });
                }
                parts.push({ type: "punction", data: ": " });
                addPart(data[property.name], resolver.getType(property.type), indent + 1, property.summary);
            }
            parts.push({ type: "indent", data: indent });
            parts.push({ type: "punction", data: "}" });
        }
    }
}
function typeToLink(resolver, name) {
    const type = resolver.getType(name);
    if (type.alias) {
        return type.alias;
    }
    if (type.resolvedUnderlyingArray) {
        return typeToLink(resolver, type.resolvedUnderlyingArray) + "[]";
    }
    if (type.resolvedUnderlyingObject) {
        return typeToLink(resolver, type.resolvedUnderlyingArray) + "{}";
    }
    if (type.resolvedUnderlyingGeneric) {
        return typeToLink(resolver, type.resolvedUnderlyingGeneric) + "&lt;" + type.resolvedTypeArguments.map(x => typeToLink(resolver, x)).join(", ") + "&gt;";
    }
    if (type.resolvedTypeParameters) {
        return `<a href="#${digo.encodeHTML(type.name)}">${digo.encodeHTML(type.name.replace(/<.*>/, ""))}</a>`;
    }
    return `<a href="#${digo.encodeHTML(type.name)}">${digo.encodeHTML(type.name)}</a>`;
}
