/**
 * @file 根据 API 文档生成 JS api
 * @author xuld@vip.qq.com
 */
import * as digo from "digo";

/**
 * 当添加一个文件后执行。
 * @param file 要处理的文件。
 * @param options 传递给处理器的只读选项。
 * @param done 指示异步操作完成的回调函数。
 * @param result 结果列表。
 */
module.exports = exports = function (file: digo.File, options: Options, done: () => void, result: digo.FileList) {
    const generator = new ApiGenerator(options);
    generator.build(JSON.parse(file.content));
};

/**
 * 表示支持的选项。
 */
export interface Options {

    /**
     * 设置 AJAX 模块地址。
     */
    ajax?: string;

    /**
     * 设置数据字段。
     */
    dataField?: string;

    /**
     * 设置信息字段。
     */
    messageField?: string;

    /**
     * 设置接口文件模板。
     */
    apiTpl?: string;

    /**
     * 设置接口类型模板。
     */
    interfaceTpl?: string;

    /**
     * 设置枚举类型模板。
     */
    enumTpl?: string;

    /**
     * 设置枚举类型模板。
     */
    fieldTpl?: string;

}

/**
 * 表示一个 API 生成器。
 */
export class ApiGenerator {

    /**
     * 获取当前生成器的选项。
     */
    readonly options: Options;

    /**
     * 初始化新的生成器。
     * @param options 相关的选项。
     */
    constructor(options: Options) {
        this.options = {
            ajax: options.ajax || "ajax",
            dataField: options.dataField || "data",
            messageField: options.messageField || "message",
            apiTpl: options.apiTpl || digo.readFile(require.resolve("./data/api.ts")).toString(),
            interfaceTpl: options.interfaceTpl || digo.readFile(require.resolve("./data/interface.ts")).toString(),
            enumTpl: options.enumTpl || digo.readFile(require.resolve("./data/enum.ts")).toString(),
            fieldTpl: options.fieldTpl || digo.readFile(require.resolve("./data/field.ts")).toString(),
        };
    }

    /**
     * 获取所有类型信息。
     */
    types: ApiData["types"];

    /**
     * 生成所有数据。
     * @param data 相关的数据。
     */
    build(data: ApiData) {
        this.types = data.types;
        for (const key in data.types) {
            const type = data.types[key];
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
                } else {
                    type.name = key.replace(/[^\.]*\.|<(.*)>|\[\]|\{\}/g, "");
                }
            }
            type.name = this.identifier(type.name);
            for (const key2 in type.fields) {
                const field = type.fields[key2];
                field.name = field.name || key2;
                if (field.optional == undefined) {
                    field.optional = !field.notNull;
                }
            }
        }
        for (const key in data.apis) {
            const api = data.apis[key];
            api.path = api.path || key;
            api.description = api.description ? `${api.description}(${api.path})` : api.path;
            api.name = this.identifier(api.name || digo.getFileName(api.path.replace(/[?#].*$/g, "")));
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
    private buildApi(api: ApiInfo) {
        const types: { [name: string]: TypeInfo; } = { __proto__: null };
        const addType = (name: string) => {
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
            url: JSON.stringify(api.path),
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
    private buildMock(value: ValueInfo, merge?: any, caseType = 0, depth = 5) {
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
                const result: any[] = [];
                for (let i = 0; i < merge.length; i++) {
                    result[i] = this.buildMock(itemValue, merge[i], i, depth - 1);
                }
                return result;
            } else {
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
                const result: { [key: string]: any; } = {};
                let i = 0;
                for (const key in merge) {
                    result[key] = this.buildMock(itemValue, merge[key], i++, depth - 1);
                }
            } else {
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
    private runTpl(tpl: string, args: { [keyword: string]: string | undefined }) {
        return tpl.replace(/((?:^|\r?\n)[^\r\n\_]*)__(\w+)([^\r\n\_]*)/g, (all: string, prefix: string, keyword: string, postfix: string) => {
            if (keyword in args) {
                const result = args[keyword];
                if (result == undefined) {
                    return "";
                }
                return prefix + (!postfix ? result.replace(/\n/g, prefix) : result) + postfix;
            }
            return all;
        }).replace(/__(\w+)/g, (all: string, keyword: string) => {
            if (keyword in args) {
                return args[keyword] || "";
            }
            return all;
        });
    }

    /**
     * 获取指定名称的合法标识符。
     */
    private identifier(name: string) {
        return name;
    }

    /**
     * 获取指定名称的合法标识符。
     */
    private propName(name: string) {
        return name;
    }

    /**
     * 获取类型的 TS 名称。
     * @param type 要获取的类型名。
     * @param values 所有可能的值。
     * @return 返回类型名称。
     */
    getTypeName(type: TypeInfo, values?: any[]) {
        if (values && (type.native === "string" || type.native === "number" || type.native === "boolean")) {
            return values.map(t => JSON.stringify(t)).join(" | ");
        }
        return type.name;
    }

    /**
     * 获取指定的类型。
     * @param name 要获取的类型名。
     * @return 返回类型信息。
     */
    private getType(name = "any") {
        let type = this.types[name];
        if (!type) {
            if (/\[\]$/.test(name)) {
                this.types[name] = type = {
                    name: `${this.getType(name.slice(0, -2)).name}[]`,
                };
            } else if (/\{\}$/.test(name)) {
                this.types[name] = type = {
                    name: `{ [key: string]: ${this.getType(name.slice(0, -2)).name}; }`,
                };
            } else if (/\<.*\>$/.test(name)) {
                const lt = name.indexOf("<");
                const prefix = name.substr(0, lt + 1);
                for (const key in this.types) {
                    if (key.startsWith(prefix) && key.endsWith(">")) {
                        const genericArguments: string[] = [];
                        const args = name.slice(lt + 1, -1);
                        let patternArgs = args;
                        while (true) {
                            const oldArgs = patternArgs;
                            patternArgs = oldArgs.replace(/<[^>]+?>/, all => ".".repeat(all.length));
                            if (patternArgs === oldArgs) {
                                break;
                            }
                        }
                        patternArgs.replace(/[^,]+/g, (all, index: number) => {
                            genericArguments.push(args.substr(index, all.length));
                            return "";
                        });
                        const underlyingType = this.getType(key);
                        const genericParameters = key.slice(prefix.length, -1).split(",");
                        this.types[name] = type = {
                            ...underlyingType,
                            name: underlyingType.name + "_" + genericArguments.join("_")
                        };
                        if (type.extends) {
                            type.extends = this.replaceGenericType(genericParameters, genericArguments, type.extends);
                        }
                        for (const key in type.fields) {
                            type.fields[key].type = this.replaceGenericType(genericParameters, genericArguments, type.fields[key].type);
                        }
                        break;
                    }
                }
            }
        }

        if (!type) {
            const native = ["number", "string", "any", "boolean", "integer", "null", "undefined", "void", "date", "object", "array", "regexp", "function", "json"].indexOf(name) >= 0 ? name : "any";
            this.types[name] = type = {
                native: native as any,
                name: native
            };
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
    private replaceGenericType(genericParameters: string[], genericArguments: string[], type: string) {
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
    private getField(type: TypeInfo, field: string) {
        if (type.fields[field]) {
            return type.fields[field];
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
    private getAllFields(type: TypeInfo) {
        return {
            ...(type.extends ? this.getAllFields(this.getType(type.extends)) : {}),
            ...type.fields
        };
    }

}

/**
 * 表示一个 API 数据。
 */
export interface ApiData {

    /**
     * 版本号。
     */
    version: number;

    /**
     * 所有 API 信息。
     */
    apis: { [path: string]: ApiInfo; };

    /**
     * 所有类型信息。
     */
    types: { [path: string]: TypeInfo; };

}

/**
 * 表示一个接口信息。
 */
export interface ApiInfo extends NameInfo {

    /**
     * 请求的路径。
     */
    path?: string;

    /**
     * 接口的分类。
     */
    category?: string;

    /**
     * 请求谓词(HTTP Method)。如 "GET"。
     */
    method?: string;

    /**
     * 请求内容类型(Content-Type)。如 "application/json"。
     */
    contentType?: string;

    /**
     * 所有参数信息。
     */
    params?: { [name: string]: ParamInfo; };

    /**
     * 返回信息。
     */
    return?: ReturnInfo;

}

/**
 * 表示一个参数信息。
 */
export interface ParamInfo extends NameInfo, ValueInfo {

    /**
     * 请求谓词(HTTP Method)。如 "GET"。
     */
    method?: string;

}

/**
 * 表示一个返回信息。
 */
export interface ReturnInfo extends ValueInfo {

    /**
     * 返回值的描述。
     */
    description?: string;

    /**
     * 响应内容类型(Content-Type)。如 "application/json"。
     */
    contentType?: string;

}

/**
 * 表示一个类型信息。
 */
export interface TypeInfo extends NameInfo {

    /**
     * 类型的类型。
     */
    type?: "class" | "enum";

    /**
     * 匹配的 JavaScript 内置类型。
     */
    native?: "string" | "number" | "boolean" | "integer" | "null" | "undefined" | "void" | "any" | "date" | "object" | "array" | "regexp" | "function" | "json";

    /**
     * 类型的父类。
     */
    extends?: string;

    /**
     * 所有字段信息。
     */
    fields?: { [name: string]: FieldInfo };

}

/**
 * 表示一个字段信息。
 */
export interface FieldInfo extends NameInfo, ValueInfo {

}

/**
 * 表示一个命名信息。
 */
export interface NameInfo {

    /**
     * 对象的名称。
     */
    name?: string;

    /**
     * 对象的描述。
     */
    description?: string;

    /**
     * 对象的作者。
     */
    author?: string;

    /**
     * 对象是否可选。
     */
    optional?: boolean;

    /**
     * 对象的创建版本号。
     */
    created?: string;

    /**
     * 对象的最后更新版本号。
     */
    modified?: string;

    /**
     * 对象是否被否定或者对象开始被否定的版本号。
     */
    deprecated?: string | boolean;

}

/**
 * 表示一个值信息。
 */
export interface ValueInfo {

    /**
     * 值的类型。
     */
    type?: string;

    /**
     * 默认值。
     */
    default?: any;

    /**
     * 所有的可能值。
     */
    values?: any[];

    /**
     * 是否允许空。
     */
    notNull?: boolean;

    /**
     * 是否允许空白。
     */
    notBlank?: boolean;

    /**
     * 最小值。如果是字符串类型则表示最小长度。
     */
    min?: any;

    /**
     * 最大值。如果是字符串类型则表示最大长度。
     */
    max?: any;

    /**
     * 数据校验类型。
     */
    validate?: "email" | "phone" | "money" | "username" | "password" | "address" | "idcard" | "passport" | "id" | "message" | "gps" | "json" | "url";

    /**
     * 值应匹配的正则表达式。
     */
    match?: string;

    /**
     * 模拟数据。
     */
    mock?: any;

}

/**
 * 表示一个接口。
 */
export class Api {

    /**
     * 请求谓词(HTTP Method)。如 "GET"。
     */
    method = "POST";

    /**
     * 请求内容类型(Content-Type)。如 "application/json"。
     */
    contentType = "application/x-www-form-urlencoded";

    /**
     * 返回信息。
     */
    return: ReturnInfo = {

    };

    /**
     * 初始化新的接口。
     * @param path 接口地址。
     * @param options 接口选项。
     */
    constructor(public path: string, options: ApiInfo) {
        Object.assign(this, options);
        for (const key in this.params) {
            const param = this.params[key];
            param.name = param.name || key;
            if (param.optional == undefined) {
                param.optional = !param.notNull;
            }
        }
    }

}

export interface Api extends ApiInfo {

}

interface GenericTypeInfo extends TypeInfo {

    /**
     * 如果当前类型是泛型定义，则返回泛型形参。
     */
    genericParameters: string[];

}

function clean(value: string) {
    return value.replace("/*", "").replace(/\/\{.*?\}/g, "");
}
