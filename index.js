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
 * @file 根据 API 文档生成 JS api
 * @author xuld@vip.qq.com
 */
var digo = require("digo");
/**
 * 当添加一个文件后执行。
 * @param file 要处理的文件。
 * @param options 传递给处理器的只读选项。
 * @param done 指示异步操作完成的回调函数。
 * @param result 结果列表。
 */
module.exports = exports = function (file, options, done, result) {
    var generator = new ApiGenerator(options);
    generator.build(JSON.parse(file.content));
};
/**
 * 表示一个 API 生成器。
 */
var ApiGenerator = (function () {
    /**
     * 初始化新的生成器。
     * @param options 相关的选项。
     */
    function ApiGenerator(options) {
        this.options = {
            ajax: options.ajax || "ajax",
            dataField: options.dataField || "data",
            messageField: options.messageField || "message",
            apiTpl: options.apiTpl || digo.readFile(require.resolve("./data/api.ts")).toString(),
            interfaceTpl: options.interfaceTpl || digo.readFile(require.resolve("./data/interface.ts")).toString(),
            enumTpl: options.enumTpl || digo.readFile(require.resolve("./data/enum.ts")).toString(),
            fieldTpl: options.fieldTpl || digo.readFile(require.resolve("./data/field.ts")).toString()
        };
    }
    /**
     * 生成所有数据。
     * @param data 相关的数据。
     */
    ApiGenerator.prototype.build = function (data) {
        this.types = data.types;
        for (var key in data.types) {
            var type = data.types[key];
            if (!type.name) {
                if (type.native) {
                    type.name = ({
                        integer: "number",
                        object: "Object",
                        date: "Date",
                        array: "any[]",
                        regexp: "Regexp",
                        "function": "Function",
                        json: "string"
                    })[type.native] || type.native;
                }
                else {
                    type.name = key.replace(/[^\.]*\.|<(.*)>|\[\]|\{\}/g, "");
                }
            }
            type.name = this.identifier(type.name);
            for (var key2 in type.fields) {
                var field = type.fields[key2];
                field.name = field.name || key2;
                if (field.optional == undefined) {
                    field.optional = !field.notNull;
                }
            }
        }
        for (var key in data.apis) {
            var api = data.apis[key];
            api.path = api.path || key;
            api.description = api.description ? api.description + "(" + api.path + ")" : api.path;
            api.name = this.identifier(api.name || digo.getFileName(api.path.replace(/[?#].*$/g, "")));
            for (var key2 in api.params) {
                var param = api.params[key2];
                param.name = param.name || key2;
                if (param.optional == undefined) {
                    param.optional = !param.notNull;
                }
            }
            var apiD = this.buildApi(api);
            console.log(apiD);
            debugger;
            var mock = this.buildMock(api["return"], { data: [{ foo: 4444 }] });
            console.log(mock);
        }
    };
    /**
     * 生成一个接口。
     * @param api 要生成的接口信息。
     * @return 返回生成接口的代码段。
     */
    ApiGenerator.prototype.buildApi = function (api) {
        var _this = this;
        var types = { __proto__: null };
        var addType = function (name) {
            var type = types[name];
            if (!type) {
                types[name] = type = _this.getType(name);
                if (type["extends"]) {
                    addType(type["extends"]);
                }
                for (var key in type.fields) {
                    addType(type.fields[key].type);
                }
            }
            return type;
        };
        var params = "";
        var paramsDescription = "";
        var paramsOptional = false;
        var requestData = "";
        for (var key in api.params) {
            var param = api.params[key];
            var name = this.identifier(param.name);
            if (param.optional) {
                paramsOptional = true;
            }
            if (params) {
                params += ", ";
            }
            params += "" + name + (paramsOptional ? "?" : "") + ": " + this.getTypeName(addType(param.type), param.values);
            if (requestData) {
                requestData += ",";
            }
            requestData += "\n\t\t" + (param.name === name ? name : JSON.stringify(param.name)) + ": " + name;
            if (paramsDescription) {
                paramsDescription += "\n";
            }
            paramsDescription += name;
            if (param.description) {
                paramsDescription += " " + param.description;
            }
            if (param.created) {
                paramsDescription += " {@since " + param.created + "}";
            }
            if (param.deprecated) {
                paramsDescription += " {@deprecated " + param.deprecated + "}";
            }
            if (param.modified) {
                paramsDescription += "(Last Update: " + param.modified + ")";
            }
            if (param["default"]) {
                paramsDescription += " {@default " + param["default"] + "}";
            }
        }
        var returnType = addType(api["return"] ? api["return"].type : "void");
        var returnTypeName = this.getTypeName(returnType, api["return"] && api["return"].values);
        var result = this.runTpl(this.options.apiTpl, {
            ajax: this.options.ajax,
            description: api.description,
            author: api.author,
            deprecated: api.deprecated === true ? "" : api.deprecated === false ? undefined : api.deprecated,
            since: api.created,
            name: api.name,
            paramsDescription: paramsDescription,
            params: params,
            returnType: returnTypeName,
            returnDataType: this.getField(returnType, this.options.dataField) ? returnTypeName + "[" + JSON.stringify(this.options.dataField) + "]" : returnTypeName === "void" ? "void" : "any",
            returnMessageType: this.getField(returnType, this.options.messageField) ? returnTypeName + "[" + JSON.stringify(this.options.messageField) + "]" : returnTypeName === "void" ? "void" : "any",
            url: JSON.stringify(api.path),
            method: api.method && JSON.stringify(api.method),
            contentType: api.contentType && JSON.stringify(api.contentType),
            data: requestData ? "{" + requestData + "\n\t}" : undefined
        });
        for (var key in types) {
            var type = types[key];
            if (type.native) {
                continue;
            }
            var fields = "";
            for (var key2 in type.fields) {
                var field = type.fields[key2];
                fields += this.runTpl(this.options.fieldTpl, {
                    description: field.description,
                    deprecated: field.deprecated === true ? "" : field.deprecated === false ? undefined : field.deprecated,
                    since: field.created,
                    nameType: type.type === "enum" ? "" + this.propName(field.name) + (field["default"] !== undefined ? " = " + JSON.stringify(field["default"]) : "") + "," : this.propName(field.name) + ": " + this.getTypeName(this.getType(field.type), field.values) + ";"
                });
            }
            result += this.runTpl(type.type === "enum" ? this.options.enumTpl : this.options.interfaceTpl, {
                description: type.description,
                deprecated: type.deprecated === true ? "" : type.deprecated === false ? undefined : type.deprecated,
                since: type.created,
                name: type.name,
                nameAndExtends: type["extends"] ? type.name + " extends " + this.getType(type["extends"]).name : type.name,
                fields: fields
            });
        }
        return result;
    };
    /**
     * 生成指定类型的模拟数据。
     * @param value 要生成的值。
     * @param merge 要合并的数据。
     * @param caseType 当前模拟的类型。
     * @param depth 遍历的深度。
     * @return 返回生成的模拟数据。
     */
    ApiGenerator.prototype.buildMock = function (value, merge, caseType, depth) {
        if (caseType === void 0) { caseType = 0; }
        if (depth === void 0) { depth = 5; }
        if (merge === undefined) {
            if (value.mock !== undefined) {
                return value.mock;
            }
            if (value["default"] !== undefined && caseType === 0) {
                return value["default"];
            }
            if (value.values && value.values.length > 0) {
                return value.values[caseType % value.values.length];
            }
            if (value.validate) {
                switch (value.validate) {
                    case "id":
                        return 10000 + caseType;
                    case "email":
                        return "test" + caseType + "@test.com";
                    case "phone":
                        return "1811111111" + caseType;
                    case "money":
                        return 1000 + caseType;
                    case "username":
                        return "test" + caseType;
                    case "password":
                        return "test" + caseType;
                    case "address":
                        return "Address # " + caseType;
                    case "idcard":
                        return "4304231977122" + caseType + "4633";
                    case "passport":
                        return "331122316654" + caseType;
                    case "message":
                        return "hello world(" + caseType + ")";
                    case "gps":
                        return "1000." + caseType + ",1000." + caseType;
                    case "url":
                        return "http://test.com/" + caseType;
                    case "json":
                        return "{}";
                    default:
                        return value.validate + "_" + caseType;
                }
            }
        }
        if (/\[\]$/.test(value.type)) {
            var itemValue = { type: value.type.slice(0, -2) };
            if (Array.isArray(merge)) {
                var result = [];
                for (var i = 0; i < merge.length; i++) {
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
            var itemValue = { type: value.type.slice(0, -2) };
            if (merge) {
                var result = {};
                var i = 0;
                for (var key in merge) {
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
        var type = this.getType(value.type);
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
                        return ("" + caseType).repeat(Math.max(value.min, 0));
                    }
                    if (value.max != undefined) {
                        return ("" + caseType).repeat(Math.max(value.max - 1, 0));
                    }
                    return "string_" + caseType;
                case "boolean":
                    return caseType % 2 === 0 ? true : false;
                case "date":
                    var date = new Date();
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
        var obj = {};
        var fields = this.getAllFields(type);
        for (var key in fields) {
            var field = fields[key];
            obj[field.name] = this.buildMock(field, merge && merge[field.name], caseType, depth - 1);
        }
        return obj;
    };
    /**
     * 渲染一个简单模板。
     * @param tpl 模板内容。
     * @param args 各关键字的替换值。
     */
    ApiGenerator.prototype.runTpl = function (tpl, args) {
        return tpl.replace(/((?:^|\r?\n)[^\r\n\_]*)__(\w+)([^\r\n\_]*)/g, function (all, prefix, keyword, postfix) {
            if (keyword in args) {
                var result = args[keyword];
                if (result == undefined) {
                    return "";
                }
                return prefix + (!postfix ? result.replace(/\n/g, prefix) : result) + postfix;
            }
            return all;
        }).replace(/__(\w+)/g, function (all, keyword) {
            if (keyword in args) {
                return args[keyword] || "";
            }
            return all;
        });
    };
    /**
     * 获取指定名称的合法标识符。
     */
    ApiGenerator.prototype.identifier = function (name) {
        return name;
    };
    /**
     * 获取指定名称的合法标识符。
     */
    ApiGenerator.prototype.propName = function (name) {
        return name;
    };
    /**
     * 获取类型的 TS 名称。
     * @param type 要获取的类型名。
     * @param values 所有可能的值。
     * @return 返回类型名称。
     */
    ApiGenerator.prototype.getTypeName = function (type, values) {
        if (values && (type.native === "string" || type.native === "number" || type.native === "boolean")) {
            return values.map(function (t) { return JSON.stringify(t); }).join(" | ");
        }
        return type.name;
    };
    /**
     * 获取指定的类型。
     * @param name 要获取的类型名。
     * @return 返回类型信息。
     */
    ApiGenerator.prototype.getType = function (name) {
        if (name === void 0) { name = "any"; }
        var type = this.types[name];
        if (!type) {
            if (/\[\]$/.test(name)) {
                this.types[name] = type = {
                    name: this.getType(name.slice(0, -2)).name + "[]"
                };
            }
            else if (/\{\}$/.test(name)) {
                this.types[name] = type = {
                    name: "{ [key: string]: " + this.getType(name.slice(0, -2)).name + "; }"
                };
            }
            else if (/\<.*\>$/.test(name)) {
                var lt = name.indexOf("<");
                var prefix = name.substr(0, lt + 1);
                var _loop_1 = function (key) {
                    if (key.startsWith(prefix) && key.endsWith(">")) {
                        var genericArguments_1 = [];
                        var args_1 = name.slice(lt + 1, -1);
                        var patternArgs = args_1;
                        while (true) {
                            var oldArgs = patternArgs;
                            patternArgs = oldArgs.replace(/<[^>]+?>/, function (all) { return ".".repeat(all.length); });
                            if (patternArgs === oldArgs) {
                                break;
                            }
                        }
                        patternArgs.replace(/[^,]+/g, function (all, index) {
                            genericArguments_1.push(args_1.substr(index, all.length));
                            return "";
                        });
                        var underlyingType = this_1.getType(key);
                        var genericParameters = key.slice(prefix.length, -1).split(",");
                        this_1.types[name] = type = __assign({}, underlyingType, { name: underlyingType.name + "_" + genericArguments_1.join("_") });
                        if (type["extends"]) {
                            type["extends"] = this_1.replaceGenericType(genericParameters, genericArguments_1, type["extends"]);
                        }
                        for (var key_1 in type.fields) {
                            type.fields[key_1].type = this_1.replaceGenericType(genericParameters, genericArguments_1, type.fields[key_1].type);
                        }
                        return "break";
                    }
                };
                var this_1 = this;
                for (var key in this.types) {
                    var state_1 = _loop_1(key);
                    if (state_1 === "break")
                        break;
                }
            }
        }
        if (!type) {
            var native = ["number", "string", "any", "boolean", "integer", "null", "undefined", "void", "date", "object", "array", "regexp", "function", "json"].indexOf(name) >= 0 ? name : "any";
            this.types[name] = type = {
                native: native,
                name: native
            };
        }
        return type;
    };
    /**
     * 替换类型名中的泛型形参部分。
     * @param genericParameters 泛型形参。
     * @param genericArguments 泛型实参。
     * @param type 当前的类型名。
     * @return 返回替换后的类型名。
     */
    ApiGenerator.prototype.replaceGenericType = function (genericParameters, genericArguments, type) {
        for (var i = 0; i < genericParameters.length; i++) {
            type = type.replace(new RegExp("\\b" + genericParameters[i] + "\\b", "g"), genericArguments[i]);
        }
        return type;
    };
    /**
     * 获取指定类型及基类型的字段。
     * @param type 要获取的类型。
     * @param field 要获取的字段。
     * @return 返回字段。
     */
    ApiGenerator.prototype.getField = function (type, field) {
        if (type.fields[field]) {
            return type.fields[field];
        }
        if (type["extends"]) {
            return this.getField(this.getType(type["extends"]), field);
        }
    };
    /**
     * 获取指定类型及基类型的所有字段。
     * @param type 要获取的类型。
     * @return 返回字段。
     */
    ApiGenerator.prototype.getAllFields = function (type) {
        return __assign({}, (type["extends"] ? this.getAllFields(this.getType(type["extends"])) : {}), type.fields);
    };
    return ApiGenerator;
}());
exports.ApiGenerator = ApiGenerator;
/**
 * 表示一个接口。
 */
var Api = (function () {
    /**
     * 初始化新的接口。
     * @param path 接口地址。
     * @param options 接口选项。
     */
    function Api(path, options) {
        this.path = path;
        /**
         * 请求谓词(HTTP Method)。如 "GET"。
         */
        this.method = "POST";
        /**
         * 请求内容类型(Content-Type)。如 "application/json"。
         */
        this.contentType = "application/x-www-form-urlencoded";
        /**
         * 返回信息。
         */
        this["return"] = {};
        Object.assign(this, options);
        for (var key in this.params) {
            var param = this.params[key];
            param.name = param.name || key;
            if (param.optional == undefined) {
                param.optional = !param.notNull;
            }
        }
    }
    return Api;
}());
exports.Api = Api;
function clean(value) {
    return value.replace("/*", "").replace(/\/\{.*?\}/g, "");
}
