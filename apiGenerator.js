"use strict";
var __assign = (this && this.__assign) || Object.assign || function(t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
            t[p] = s[p];
    }
    return t;
};
const path = require("path");
// #endregion
// #region 生成器
/**
 * 表示一个接口生成器。
 */
class ApiGenerator {
    /**
     * 初始化新的生成器。
     * @param options 相关的选项。
     */
    constructor(options) {
        // this.options = {
        //     ajax: options.ajax || "ajax",
        //     dataField: options.dataField || "data",
        //     messageField: options.messageField || "message",
        //     apiTpl: options.apiTpl || digo.readFile(require.resolve("./data/api.ts")).toString(),
        //     interfaceTpl: options.interfaceTpl || digo.readFile(require.resolve("./data/interface.ts")).toString(),
        //     enumTpl: options.enumTpl || digo.readFile(require.resolve("./data/enum.ts")).toString(),
        //     fieldTpl: options.fieldTpl || digo.readFile(require.resolve("./data/field.ts")).toString(),
        // };
    }
    /**
     * 初始化所有类型。
     * @param types 所有类型信息。
     */
    initTypes(types) {
        this.types = types;
        for (const key in types) {
            const type = types[key];
            // 解析泛型定义：将 foo.A<T> -> foo.A`1
            const match = /^(.*)\<([\w$,\s]+)\>$/.exec(key);
            if (match) {
                type.genericParameters = match[2].split(/,\s*/);
                delete types[key];
                types[match[1] + "`" + type.genericParameters.length] = type;
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
            type.name = this.identifier(type.name);
            // 设置字段名。
            for (const key2 in type.fields) {
                const field = type.fields[key2];
                field.name = field.name || key2;
                if (field.optional == undefined) {
                    field.optional = !field.notNull;
                }
            }
        }
    }
    /**
     * 获取指定的类型。
     * @param fullName 要获取的类型全名。
     * @return 返回类型信息。
     */
    getType(fullName = "any") {
        let type = this.types[fullName];
        if (!type) {
            if (/\[\]$/.test(fullName)) {
                const underlyingType = this.getType(fullName.slice(0, -2));
                type = {
                    arrayUnderlyingType: underlyingType,
                    name: `${underlyingType.name}[]`,
                };
            }
            else if (/\{\}$/.test(fullName)) {
                const underlyingType = this.getType(fullName.slice(0, -2));
                type = {
                    objectUnderlyingType: underlyingType,
                    name: `{ [key: string]: ${underlyingType.name}; }`,
                };
            }
            else if (/\<.*\>$/.test(fullName)) {
                const lt = fullName.indexOf("<");
                // 解析 foo<int> 中的 int。
                // 为避免泛型参数中又包含泛型参数，先替换内部的泛型。
                const args = fullName.slice(lt + 1, -1);
                const argsArray = [];
                let rawArgs = args;
                while (true) {
                    const oldArgs = rawArgs;
                    rawArgs = oldArgs.replace(/<[^>]+?>/, all => ".".repeat(all.length));
                    if (rawArgs === oldArgs) {
                        break;
                    }
                }
                rawArgs.replace(/[^,]+/g, (all, index) => {
                    argsArray.push(args.substr(index, all.length));
                    return "";
                });
                // 替换泛型形参生成新类型。
                const underlyingType = this.types[fullName.substr(0, lt) + "`" + argsArray.length];
                if (underlyingType && underlyingType.genericParameters) {
                    const genericArguments = argsArray.map(fullName => this.getType(fullName));
                    type = __assign({}, underlyingType, { genericUnderlyingType: underlyingType, genericArguments: genericArguments, name: underlyingType.name + "<" + genericArguments.map(t => t.name).join(", ") + ">" });
                    if (type.extends) {
                        type.extends = this.replaceGenericType(underlyingType.genericParameters, argsArray, type.extends);
                    }
                    for (const key in type.fields) {
                        if (type.fields[key].type) {
                            type.fields[key].type = this.replaceGenericType(underlyingType.genericParameters, argsArray, type.fields[key].type);
                        }
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
            this.types[fullName] = type;
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
    // #endregion
    /**
     * 生成所有数据。
     * @param data 相关的数据。
     */
    build(data) {
        this.initTypes(data.types);
        for (const key in data.apis) {
            const api = data.apis[key];
            api.url = api.url || key;
            api.description = api.description ? `${api.description}(${api.url})` : api.url;
            api.name = this.identifier(api.name || path.basename(api.url.replace(/[?#].*$/g, "")));
            for (const key2 in api.params) {
                const param = api.params[key2];
                param.name = param.name || key2;
                if (param.optional == undefined) {
                    param.optional = !param.notNull;
                }
            }
            const apiDefinition = this.buildApi(api);
            const mock = this.buildMock(api.return);
        }
    }
    /**
     * 生成一个接口。
     * @param api 要生成的接口信息。
     * @return 返回生成接口的代码段。
     */
    buildApi(api) {
        const types = { __proto__: null };
        const addType = (name) => {
            let type = types[name];
            if (!type) {
                types[name] = type = this.getType(name);
                if (type.extends) {
                    addType(type.extends);
                }
                for (const key in type.fields) {
                    addType(type.fields[key].type);
                }
            }
            return type;
        };
        let params = "";
        let paramsDescription = "";
        let paramsOptional = false;
        let requestData = "";
        for (const key in api.params) {
            const param = api.params[key];
            const name = this.identifier(param.name);
            if (param.optional) {
                paramsOptional = true;
            }
            if (params) {
                params += ", ";
            }
            params += `${name}${paramsOptional ? "?" : ""}: ${this.getTypeName(addType(param.type), param.values)}`;
            if (requestData) {
                requestData += ",";
            }
            requestData += `\n\t\t${param.name === name ? name : JSON.stringify(param.name)}: ${name}`;
            if (paramsDescription) {
                paramsDescription += "\n";
            }
            paramsDescription += name;
            if (param.description) {
                paramsDescription += ` ${param.description}`;
            }
            if (param.created) {
                paramsDescription += ` {@since ${param.created}}`;
            }
            if (param.deprecated) {
                paramsDescription += ` {@deprecated ${param.deprecated}}`;
            }
            if (param.modified) {
                paramsDescription += `(Last Update: ${param.modified})`;
            }
            if (param.default) {
                paramsDescription += ` {@default ${param.default}}`;
            }
        }
        const returnType = addType(api.return ? api.return.type : "void");
        const returnTypeName = this.getTypeName(returnType, api.return && api.return.values);
        let result = this.runTpl(this.options.apiTpl, {
            ajax: this.options.ajax,
            description: api.description,
            author: api.author,
            deprecated: api.deprecated === true ? "" : api.deprecated === false ? undefined : api.deprecated,
            since: api.created,
            name: api.name,
            paramsDescription: paramsDescription,
            params: params,
            returnType: returnTypeName,
            returnDataType: this.getField(returnType, this.options.dataField) ? `${returnTypeName}[${JSON.stringify(this.options.dataField)}]` : returnTypeName === "void" ? "void" : "any",
            returnMessageType: this.getField(returnType, this.options.messageField) ? `${returnTypeName}[${JSON.stringify(this.options.messageField)}]` : returnTypeName === "void" ? "void" : "any",
            url: JSON.stringify(api.url),
            method: api.method && JSON.stringify(api.method),
            contentType: api.contentType && JSON.stringify(api.contentType),
            data: requestData ? `{${requestData}\n\t}` : undefined
        });
        for (const key in types) {
            const type = types[key];
            if (type.native) {
                continue;
            }
            let fields = "";
            for (const key2 in type.fields) {
                const field = type.fields[key2];
                fields += this.runTpl(this.options.fieldTpl, {
                    description: field.description,
                    deprecated: field.deprecated === true ? "" : field.deprecated === false ? undefined : field.deprecated,
                    since: field.created,
                    nameType: type.type === "enum" ? `${this.propName(field.name)}${field.default !== undefined ? " = " + JSON.stringify(field.default) : ""},` : `${this.propName(field.name)}: ${this.getTypeName(this.getType(field.type), field.values)};`
                });
            }
            result += this.runTpl(type.type === "enum" ? this.options.enumTpl : this.options.interfaceTpl, {
                description: type.description,
                deprecated: type.deprecated === true ? "" : type.deprecated === false ? undefined : type.deprecated,
                since: type.created,
                name: type.name,
                nameAndExtends: type.extends ? `${type.name} extends ${this.getType(type.extends).name}` : type.name,
                fields: fields
            });
        }
        return result;
    }
    /**
     * 生成指定类型的模拟数据。
     * @param value 要生成的值。
     * @param merge 要合并的数据。
     * @param caseType 当前模拟的类型。
     * @param depth 遍历的深度。
     * @return 返回生成的模拟数据。
     */
    buildMock(value, merge, caseType = 0, depth = 5) {
        if (merge === undefined) {
            if (value.mock !== undefined) {
                return value.mock;
            }
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
                        return `test${caseType}@test.com`;
                    case "phone":
                        return `1811111111${caseType}`;
                    case "money":
                        return 1000 + caseType;
                    case "username":
                        return `test${caseType}`;
                    case "password":
                        return `test${caseType}`;
                    case "address":
                        return `Address # ${caseType}`;
                    case "idcard":
                        return `4304231977122${caseType}4633`;
                    case "passport":
                        return `331122316654${caseType}`;
                    case "message":
                        return `hello world(${caseType})`;
                    case "gps":
                        return `1000.${caseType},1000.${caseType}`;
                    case "url":
                        return `http://test.com/${caseType}`;
                    case "json":
                        return `{}`;
                    default:
                        return `${value.validate}_${caseType}`;
                }
            }
        }
        if (/\[\]$/.test(value.type)) {
            const itemValue = { type: value.type.slice(0, -2) };
            if (Array.isArray(merge)) {
                const result = [];
                for (let i = 0; i < merge.length; i++) {
                    result[i] = this.buildMock(itemValue, merge[i], i, depth - 1);
                }
                return result;
            }
            else {
                return [
                    this.buildMock(itemValue, merge, 0, depth - 1),
                    this.buildMock(itemValue, merge, 1, depth - 1),
                    this.buildMock(itemValue, merge, 2, depth - 1)
                ];
            }
        }
        if (/\{\}$/.test(value.type)) {
            const itemValue = { type: value.type.slice(0, -2) };
            if (merge) {
                const result = {};
                let i = 0;
                for (const key in merge) {
                    result[key] = this.buildMock(itemValue, merge[key], i++, depth - 1);
                }
            }
            else {
                return {
                    key0: this.buildMock(itemValue, merge, 0, depth - 1),
                    key1: this.buildMock(itemValue, merge, 1, depth - 1),
                    key2: this.buildMock(itemValue, merge, 2, depth - 1)
                };
            }
        }
        const type = this.getType(value.type);
        if (type.native) {
            if (merge !== undefined) {
                return merge;
            }
            switch (type.native) {
                case "integer":
                    if (value.min != undefined) {
                        return value.min;
                    }
                    if (value.max != undefined) {
                        return value.max - 1;
                    }
                    return caseType;
                case "number":
                    if (value.min != undefined) {
                        return value.min;
                    }
                    if (value.max != undefined) {
                        return value.max - 0.1;
                    }
                    return caseType + 0.1;
                case "string":
                    if (value.min != undefined) {
                        return `${caseType}`.repeat(Math.max(value.min, 0));
                    }
                    if (value.max != undefined) {
                        return `${caseType}`.repeat(Math.max(value.max - 1, 0));
                    }
                    return `string_${caseType}`;
                case "boolean":
                    return caseType % 2 === 0 ? true : false;
                case "date":
                    const date = new Date();
                    date.setDate(date.getDate() + caseType);
                    date.setSeconds(date.getSeconds() + caseType);
                    return date;
                case "null":
                case "any":
                    return null;
                case "void":
                case "undefined":
                    return null;
                case "object":
                    return {};
                case "array":
                    return [];
                case "regexp":
                    return /\d+/;
                case "function":
                    return "function(){}";
                default:
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
            obj[field.name] = this.buildMock(field, merge && merge[field.name], caseType, depth - 1);
        }
        return obj;
    }
    /**
     * 渲染一个简单模板。
     * @param tpl 模板内容。
     * @param args 各关键字的替换值。
     */
    runTpl(tpl, args) {
        return tpl.replace(/((?:^|\r?\n)[^\r\n\_]*)__(\w+)([^\r\n\_]*)/g, (all, prefix, keyword, postfix) => {
            if (keyword in args) {
                const result = args[keyword];
                if (result == undefined) {
                    return "";
                }
                return prefix + (!postfix ? result.replace(/\n/g, prefix) : result) + postfix;
            }
            return all;
        }).replace(/__(\w+)/g, (all, keyword) => {
            if (keyword in args) {
                return args[keyword] || "";
            }
            return all;
        });
    }
    /**
     * 获取指定名称的合法标识符。
     */
    identifier(name) {
        return name;
    }
    /**
     * 获取指定名称的合法标识符。
     */
    propName(name) {
        return name;
    }
    /**
     * 获取类型的 TS 名称。
     * @param type 要获取的类型名。
     * @param values 所有可能的值。
     * @return 返回类型名称。
     */
    getTypeName(type, values) {
        if (values && (type.native === "string" || type.native === "number" || type.native === "boolean")) {
            return values.map(t => JSON.stringify(t)).join(" | ");
        }
        return type.name;
    }
}
exports.ApiGenerator = ApiGenerator;
// #endregion
