"use strict";
var __assign = (this && this.__assign) || Object.assign || function(t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
            t[p] = s[p];
    }
    return t;
};
/**
 * @file 接口生成器
 * @author xuld@vip.qq.com
 */
const fs = require("fs");
const path = require("path");
// #endregion
// #region 生成器
/**
 * 表示一个接口生成器。
 */
class ApiGenerator {
    /**
     * 初始化新的生成器。
     * @param data 相关的数据。
     */
    constructor(data) {
        this.data = data;
        // 设置全局属性。
        data.ajaxModule = data.ajaxModule || "ajax";
        data.apiTpl = data.apiTpl || fs.readFileSync(require.resolve("./data/api.ts.tpl"), "utf-8");
        data.docTpl = data.docTpl || fs.readFileSync(require.resolve("./data/api.html.tpl"), "utf-8");
        data.apiDir = data.apiDir || "";
        data.mockDir = data.mockDir || "";
        data.docDir = data.docDir || "";
        data.dataField = "data";
        data.messageField = "message";
        data.baseUrl = data.baseUrl || "";
        data.categories = data.categories || {};
        // 初始化类型。
        for (const key in data.types) {
            const type = data.types[key];
            // 解析泛型定义：将 foo.A<T> -> foo.A<>
            const match = /^(.*)<(.*)>$/.exec(key);
            if (match) {
                type.genericParameters = match[2].split(/,\s*/);
                delete data.types[key];
                data.types[match[1] + "<" + ",".repeat(type.genericParameters.length - 1) + ">"] = type;
            }
            // 设置类型名。
            if (!type.name) {
                if (type.native) {
                    type.name = ({
                        integer: "number",
                        object: "Object",
                        date: "Date",
                        array: "any[]",
                        regexp: "Regexp",
                        function: "Function",
                        json: "string"
                    })[type.native] || type.native;
                }
                else {
                    type.name = (match ? match[1] : key).replace(/[^\.]*\./g, "");
                }
            }
            // 设置字段名。
            for (const key2 in type.fields) {
                const field = type.fields[key2];
                field.name = field.name || key2;
                if (field.optional == undefined) {
                    field.optional = !field.notNull;
                }
            }
        }
        // 初始化接口。
        for (const key in data.apis) {
            const api = data.apis[key];
            api.url = api.url || key;
            const urlPath = api.url.replace(/[?#].*$/g, "");
            api.category = api.category || path.dirname(urlPath);
            api.name = api.name || path.basename(urlPath);
            let optional = false;
            for (const key2 in api.params) {
                const param = api.params[key2];
                param.name = param.name || key2;
                if (param.optional == undefined) {
                    param.optional = !param.notNull;
                }
                if (param.optional) {
                    optional = true;
                }
                else if (optional) {
                    param.optional = true;
                }
                if (param.mock === undefined) {
                    param.mock = this.getMock(param, param.name);
                }
            }
            api.return = api.return || {};
            api.return.type = api.return.type || "void";
            if (api.return.mock === undefined) {
                api.return.mock = this.getMock(api.return, api.name, data.mergeDir != undefined && data.mergeDir != false ? this.readJSONIgnoreError(path.join(typeof data.mergeDir === "string" ? data.mergeDir : data.mockDir, "./" + urlPath + ".json")) : undefined);
            }
            this.addCategory(api.category).exportApis[key] = api;
        }
    }
    /**
     * 生成所有文档。
     */
    build() {
        const result = { __proto__: null };
        // 生成数据文档。
        for (const key in this.data.categories) {
            const category = this.data.categories[key];
            let hasApi = false;
            for (const key2 in category.exportApis) {
                const api = category.exportApis[key2];
                hasApi = true;
                api.exportName = this.addExportName(category, api.name);
                for (const key3 in api.params) {
                    const param = api.params[key3];
                    param.exportName = this.isIdentifier(param.name) ? param.name : "$" + param.name;
                    param.exportType = this.addExportType(category, param.type, param.values);
                }
                api.return.exportType = this.addExportType(category, api.return.type, api.return.values);
                const returnType = this.getType(api.return.type);
                api.return.exportDataType = this.getField(returnType, this.data.dataField) ? `${api.return.exportType}[${JSON.stringify(this.data.dataField)}]` : returnType.native === "void" ? "void" : "any";
                api.return.exportMessageType = this.getField(returnType, this.data.messageField) ? `${api.return.exportType}[${JSON.stringify(this.data.messageField)}]` : returnType.native === "void" ? "void" : "any";
            }
            if (hasApi) {
                result[path.join(this.data.apiDir, "./" + (!category.name || category.name === "/" ? "index" : category.name) + ".ts")] = this.runTpl(this.data.apiTpl, {
                    data: this.data,
                    category: category,
                    isIdentifier: this.isIdentifier,
                    isPropName: this.isPropName
                });
            }
        }
        // 生成模拟数据。
        for (const key in this.data.apis) {
            const api = this.data.apis[key];
            if (api.return.mock) {
                result[path.join(this.data.mockDir, "./" + api.url.replace(/[?#].*$/g, "") + ".json")] = JSON.stringify(api.return.mock, undefined, 4);
            }
        }
        // 生成接口文档。
        result[path.join(this.data.docDir, "index.html")] = this.runTpl(this.data.docTpl, this.data);
        return result;
    }
    /**
     * 获取指定的类型。
     * @param fullName 要获取的类型全名。
     * @return 返回类型信息。
     */
    getType(fullName = "any") {
        let type = this.data.types[fullName];
        if (!type) {
            if (/\S\[\]$/.test(fullName)) {
                type = {
                    underlyingArray: fullName.slice(0, -2)
                };
            }
            else if (/\S\{\}$/.test(fullName)) {
                type = {
                    underlyingObject: fullName.slice(0, -2)
                };
            }
            else if (/\S\<.*\>$/.test(fullName)) {
                const lt = fullName.indexOf("<");
                // 解析 foo<int> 中的 int。
                // 先转换 foo<foo<int, number>, number> -> foo<foo............., number>
                // 避免解析到错误的逗号。
                const args = fullName.slice(lt + 1, -1);
                const argsArray = [];
                let flattenArgs = args;
                while (true) {
                    const oldArgs = flattenArgs;
                    flattenArgs = oldArgs.replace(/<[^>]+?>/, all => ".".repeat(all.length));
                    if (flattenArgs === oldArgs) {
                        break;
                    }
                }
                flattenArgs.replace(/[^,]+/g, (all, index) => {
                    argsArray.push(args.substr(index, all.length));
                    return "";
                });
                // 替换泛型形参生成新类型。
                const genericName = fullName.substr(0, lt) + "<" + ",".repeat(argsArray.length - 1) + ">";
                const underlyingType = this.data.types[genericName];
                if (underlyingType && underlyingType.genericParameters) {
                    type = __assign({}, underlyingType, { underlyingGeneric: genericName, genericArguments: argsArray, fields: {} });
                    if (type.extends) {
                        type.extends = this.replaceGenericType(underlyingType.genericParameters, argsArray, type.extends);
                    }
                    for (const key in underlyingType.fields) {
                        type.fields[key] = __assign({}, underlyingType.fields[key], { type: this.replaceGenericType(underlyingType.genericParameters, argsArray, underlyingType.fields[key].type) });
                    }
                }
                else {
                    type = {
                        native: "any",
                        name: "any"
                    };
                }
            }
            else {
                const native = ["number", "string", "any", "boolean", "integer", "null", "undefined", "void", "date", "object", "array", "regexp", "function", "json"].indexOf(fullName) >= 0 ? fullName : "any";
                type = {
                    native: native,
                    name: native
                };
            }
            this.data.types[fullName] = type;
        }
        return type;
    }
    /**
     * 替换类型名中的泛型形参部分。
     * @param genericParameters 泛型形参。
     * @param genericArguments 泛型实参。
     * @param type 当前的类型名。
     * @return 返回替换后的类型名。
     */
    replaceGenericType(genericParameters, genericArguments, type) {
        for (let i = 0; i < genericParameters.length; i++) {
            type = type.replace(new RegExp("\\b" + genericParameters[i] + "\\b", "g"), genericArguments[i]);
        }
        return type;
    }
    /**
     * 获取指定类型及基类型的字段。
     * @param type 要获取的类型。
     * @param field 要获取的字段。
     * @return 返回字段。
     */
    getField(type, field) {
        const result = type.fields && type.fields[field];
        if (result) {
            return result;
        }
        if (type.extends) {
            return this.getField(this.getType(type.extends), field);
        }
    }
    /**
     * 获取指定类型及基类型的所有字段。
     * @param type 要获取的类型。
     * @return 返回字段。
     */
    getAllFields(type) {
        return __assign({}, (type.extends ? this.getAllFields(this.getType(type.extends)) : {}), type.fields);
    }
    /**
     * 生成指定类型的模拟数据。
     * @param value 要生成的值。
     * @param merge 要合并的数据。
     * @param name 建议的名字。
     * @param caseType 当前模拟的类型。
     * @param depth 遍历的深度。
     * @return 返回生成的模拟数据。
     */
    getMock(value, name, merge, caseType = 0, depth = 3) {
        if (merge === undefined) {
            if (value.default !== undefined && caseType === 0) {
                return value.default;
            }
            if (value.values && value.values.length > 0) {
                return value.values[caseType % value.values.length];
            }
            if (value.validate) {
                switch (value.validate) {
                    case "id":
                        return 10000 + caseType;
                    case "email":
                        return `test_${name}_${caseType}@test.com`;
                    case "phone":
                        return `1810000000${caseType}`;
                    case "username":
                        return `test_${name}_${caseType}`;
                    case "password":
                        return `test_${name}_${caseType}`;
                    case "money":
                        return 1000 + caseType;
                    case "address":
                        return `test_address_${name}_${caseType}`;
                    case "idcard":
                        return [`211200199907105612`, `130581200609164920`, `31010419820930652X`][caseType % 3];
                    case "passport":
                        return `331122316654${caseType}`;
                    case "message":
                        return `test_message_test_${name}_${caseType}`;
                    case "gps":
                        return `1000.${caseType},1000.${caseType}`;
                    case "url":
                        return `http://test.com/${caseType}`;
                    case "checkcode":
                        return `${100000 + caseType}`;
                    case "json":
                        return `{}`;
                    case "age":
                        return 10 + caseType;
                    case "datetime":
                        return `2000/01/0${caseType % 10} 00:00:0${caseType % 10}`;
                    case "date":
                        return `2000/01/0${caseType % 10}`;
                    case "time":
                        return `00:00:0${caseType % 10}`;
                    case "integer":
                        return `${caseType}`;
                    case "number":
                        return `${caseType}.${caseType}`;
                    case "hash":
                        return (10000 + caseType).toString(16);
                    case "chinese":
                        return "测试" + ["甲", "乙", "丙"][caseType % 3];
                    case "pinyin":
                        return "ce shi " + ["jia", "yi", "bin"][caseType % 3];
                    case "identifier":
                        return `test_identifier_${caseType}`;
                    case "postcode":
                        return `1001${caseType}`;
                    case "color":
                        return `#0${caseType}0${caseType}0${caseType}`;
                    case "text":
                        return `long long long long long long long long long long long long long long long long long long text ${name} ${caseType}`;
                    case "html":
                        return `test_<strong>${name}_${caseType}</strong>`;
                    default:
                        return `test_<${value.validate}_${name}_${caseType}`;
                }
            }
        }
        const type = this.getType(value.type);
        if (type.underlyingArray) {
            const itemValue = { type: type.underlyingArray };
            if (Array.isArray(merge)) {
                const result = [];
                for (let i = 0; i < merge.length; i++) {
                    result[i] = this.getMock(itemValue, name, merge[i], ++caseType, depth - 1);
                }
                return result;
            }
            else {
                return [
                    this.getMock(itemValue, name, merge, ++caseType, depth - 1),
                    this.getMock(itemValue, name, merge, ++caseType, depth - 1),
                    this.getMock(itemValue, name, merge, ++caseType, depth - 1)
                ];
            }
        }
        else if (type.underlyingObject) {
            const itemValue = { type: type.underlyingObject };
            if (merge) {
                const result = {};
                for (const key in merge) {
                    result[key] = this.getMock(itemValue, key, merge[key], ++caseType, depth - 1);
                }
            }
            else {
                return {
                    key0: this.getMock(itemValue, name + "0", merge, ++caseType, depth - 1),
                    key1: this.getMock(itemValue, name + "1", merge, ++caseType, depth - 1),
                    key2: this.getMock(itemValue, name + "2", merge, ++caseType, depth - 1)
                };
            }
        }
        if (type.native) {
            switch (type.native) {
                case "integer":
                    if (merge !== undefined) {
                        merge = ~~merge;
                        if (!isNaN(merge)) {
                            return merge;
                        }
                    }
                    if (value.min != undefined) {
                        return value.min;
                    }
                    if (value.max != undefined) {
                        return value.max - 1;
                    }
                    return caseType;
                case "number":
                    if (merge !== undefined) {
                        merge = +merge;
                        if (!isNaN(merge)) {
                            return merge;
                        }
                    }
                    if (value.min != undefined) {
                        return value.min;
                    }
                    if (value.max != undefined) {
                        return value.max - 0.1;
                    }
                    return caseType + 0.1;
                case "string":
                    if (merge !== undefined) {
                        return String(merge);
                    }
                    if (value.min != undefined) {
                        return `${caseType}`.repeat(Math.max(value.min, 0));
                    }
                    if (value.max != undefined) {
                        return `${caseType}`.repeat(Math.max(value.max - 1, 0));
                    }
                    return `${name}_${caseType}`;
                case "boolean":
                    if (merge !== undefined) {
                        return !!merge;
                    }
                    return caseType % 2 === 0 ? true : false;
                case "date":
                    if (merge !== undefined) {
                        merge = merge instanceof Date ? merge : new Date(merge);
                        if (!isNaN(+merge)) {
                            return merge;
                        }
                    }
                    const date = new Date();
                    date.setDate(date.getDate() + caseType);
                    date.setSeconds(date.getSeconds() + caseType);
                    return date;
                case "null":
                case "any":
                    if (merge !== undefined) {
                        return merge;
                    }
                    return null;
                case "void":
                case "undefined":
                    if (merge !== undefined) {
                        return merge;
                    }
                    return undefined;
                case "object":
                    if (merge !== undefined) {
                        return merge;
                    }
                    return {};
                case "array":
                    if (merge !== undefined) {
                        return Array.isArray(merge) ? merge : [merge];
                    }
                    return [];
                case "regexp":
                    if (merge instanceof RegExp) {
                        return merge;
                    }
                    return /\d+/;
                case "function":
                    if (merge instanceof Function) {
                        return merge;
                    }
                    return "function(){}";
                default:
                    if (merge !== undefined) {
                        return merge;
                    }
                    return type.native;
            }
        }
        if (type.type === "enum") {
            return merge !== undefined ? merge : caseType;
        }
        if (depth < 0) {
            return merge !== undefined ? merge : null;
        }
        const obj = {};
        const fields = this.getAllFields(type);
        for (const key in fields) {
            const field = fields[key];
            obj[field.name] = this.getMock(field, key, merge && merge[field.name], ++caseType, depth - 1);
        }
        return obj;
    }
    /**
     * 读取一个 JSON 文件并忽略错误。
     */
    readJSONIgnoreError(path) {
        try {
            return JSON.parse(fs.readFileSync(path, "utf-8"));
        }
        catch (e) { }
    }
    /**
     * 添加一个分类。
     * @param name 要添加的分类名。
     * @return 返回分类。
     */
    addCategory(name) {
        const category = this.data.categories[name] || (this.data.categories[name] = {});
        category.name = category.name || name;
        category.exportNames = category.exportNames || { __proto__: null };
        category.exportApis = category.exportApis || { __proto__: null };
        category.exportTypes = category.exportTypes || { __proto__: null };
        return category;
    }
    /**
     * 添加一个导出名称。
     * @param category 名称所属的分类。
     * @param name 要添加的名称。
     * @return 返回最终导出名称。
     */
    addExportName(category, name) {
        if (!this.isIdentifier(name) || category.exportNames[name]) {
            let index = 1;
            while (category.exportNames[name + "_" + index]) {
                index++;
            }
            name += "_" + index;
        }
        category.exportNames[name] = true;
        return name;
    }
    /**
     * 添加一个导出类型。
     * @param category 名称所属的分类。
     * @param fullName 要添加的类型全名。
     * @param values 如果当前字段只能是指定值则列出所有值。
     * @return 返回导出类型名。
     */
    addExportType(category, fullName, values, genericParameters) {
        if (genericParameters && genericParameters.indexOf(fullName) >= 0) {
            return fullName;
        }
        let type = category.exportTypes[fullName];
        if (!type) {
            category.exportTypes[fullName] = type = this.getType(fullName);
            if (!type.native) {
                if (type.underlyingArray) {
                    type.exportName = `${this.addExportType(category, type.underlyingArray, undefined, genericParameters)}[]`;
                }
                else if (type.underlyingObject) {
                    type.exportName = `{ [key: string]: ${this.addExportType(category, type.underlyingObject, undefined, genericParameters)} }`;
                }
                else if (type.underlyingGeneric) {
                    type.exportName = this.addExportType(category, type.underlyingGeneric, undefined, genericParameters);
                    type.exportName += "<";
                    for (let i = 0; i < type.genericArguments.length; i++) {
                        if (i) {
                            type.exportName += ", ";
                        }
                        type.exportName += this.addExportType(category, type.genericArguments[i], undefined, genericParameters);
                    }
                    type.exportName += ">";
                }
                else {
                    type.exportName = this.addExportName(category, type.name);
                }
                if (type.extends) {
                    type.exportExtends = this.addExportType(category, type.extends, undefined, type.genericParameters);
                }
                for (const key in type.fields) {
                    const field = type.fields[key];
                    field.exportName = this.isPropName(field.name) ? field.name : JSON.stringify(field.name);
                    field.exportType = this.addExportType(category, field.type, field.values, type.genericParameters);
                }
            }
            else {
                type.exportName = type.name;
            }
        }
        if (values && (type.native === "string" || type.native === "number" || type.native === "boolean" || type.native === "any")) {
            return values.map(t => JSON.stringify(t)).join(" | ");
        }
        return type.exportName;
    }
    /**
     * 渲染一个简单模板。
     * @param tpl 模板内容。
     * @param args 各关键字的替换值。
     */
    runTpl(tpl, data) {
        tpl = `var $output="";${("%>" + tpl + "<%").replace(/\r?\n(<%[\s\S]*?%>)/g, "$1").replace(/%>([\s\S]*?)<%(=?)/g, (all, plain, eq) => {
            let output = ";$output+=" + JSON.stringify(plain) + ";";
            if (eq) {
                output += ";$output+=";
            }
            return output;
        })}return $output;`;
        return new Function("$", tpl)(data);
    }
    /**
     * 获取指定名称的合法标识符。
     * @param name 要判断的名字。
     * @return 如果满足条件则返回 true，否则返回 false。
     */
    isIdentifier(name) {
        return this.isPropName(name) && [
            "break", "do", "instanceof", "typeof",
            "case", "else", "new", "var",
            "catch", "finally", "return", "void",
            "continue", "for", "switch", "while",
            "debugger*", "function", "this", "with",
            "default", "if", "throw", "delete",
            "in", "try",
            "class", "enum", "extends", "super",
            "const", "export", "import"
        ].indexOf(name) < 0;
    }
    /**
     * 获取指定名称的合法标识符。
     * @param name 要判断的名字。
     * @return 如果满足条件则返回 true，否则返回 false。
     */
    isPropName(name) {
        return /^[a-zA-Z_$][\w$]*$/.test(name);
    }
}
exports.ApiGenerator = ApiGenerator;
// #endregion
