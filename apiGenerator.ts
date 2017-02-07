/**
 * @file 接口生成器
 * @author xuld@vip.qq.com
 */
import * as fs from "fs";
import * as path from "path";

// #region 接口数据

/**
 * 表示一个接口数据。
 */
export interface ApiData {

    /**
     * 项目名称。
     */
    name?: string;

    /**
     * 项目描述。
     */
    description?: string;

    /**
     * 版本号。
     */
    version?: string;

    /**
     * 作者。
     */
    author?: string;

    /**
     * 开源协议。
     */
    license?: string;

    /**
     * 版权声明。
     */
    copyright?: string;

    /**
     * 所有接口信息。
     */
    apis: { [path: string]: ApiInfo; };

    /**
     * 所有类型信息。
     */
    types: { [fullName: string]: TypeInfo; };

    /**
     * 所有接口的基地址。
     */
    baseUrl?: string;

    /**
     * 所有分类信息。
     */
    categories?: { [path: string]: string };

}

/**
 * 表示一个接口信息。
 */
export interface ApiInfo extends NameInfo {

    /**
     * 请求的地址。
     */
    url?: string;

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
     * 缓存的毫秒数。如果为 0 说明是会话缓存。
     */
    cache?: number;

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
    type: string;

    /**
     * 模拟数据。
     */
    mock?: any;

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
     * 是否允许空。
     */
    notEmpty?: boolean;

    /**
     * 是否允许空白。
     */
    notBlank?: boolean;

    /**
     * 最小值。如果是字符串类型则表示最小长度。
     */
    min?: number;

    /**
     * 最大值。如果是字符串类型则表示最大长度。
     */
    max?: number;

    /**
     * 值应匹配的正则表达式。
     */
    match?: string;

    /**
     * 数据校验类型。
     */
    validate?: "url" | "email" | "phone" | "username" | "password" | "checkcode" | "money" | "address" | "idcard" | "passport" | "id" | "message" | "gps" | "json" | "age" | "datetime" | "date" | "time" | "integer" | "number" | "hash" | "chinese" | "pinyin" | "identifier" | "postcode" | "color" | "text" | "html";

}

// #endregion

// #region 生成器

/**
 * 表示一个接口生成器。
 */
export class ApiGenerator {

    /**
     * 获取当前生成器的选项。
     */
    readonly options: ApiGeneratorOptions;

    /**
     * 初始化新的生成器。
     * @param options 相关的选项。
     */
    constructor(options: ApiGeneratorOptions) {
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
     * 生成所有数据。
     * @param data 相关的数据。
     */
    build(data: ApiData) {
        this.initTypes(data.types);
        this.initApis(data.apis);
    }

    // #region 类型系统

    /**
     * 获取所有类型信息。
     */
    types: { [fullName: string]: ParsedTypeInfo; };

    /**
     * 初始化所有类型。
     * @param types 所有类型信息。
     */
    private initTypes(types: ApiData["types"]) {
        this.types = types;
        for (const key in types) {
            const type = types[key];

            // 解析泛型定义：将 foo.A<T> -> foo.A<>
            const match = /^(.*)\<([\w$,\s]+)\>$/.exec(key);
            if (match) {
                (type as ParsedTypeInfo).genericParameters = match[2].split(/,\s*/);
                delete types[key];
                types[match[1] + "<" + ",".repeat((type as ParsedTypeInfo).genericParameters.length - 1) + ">"] = type;
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
                } else {
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
    }

    /**
     * 获取指定的类型。
     * @param fullName 要获取的类型全名。
     * @return 返回类型信息。
     */
    private getType(fullName = "any") {
        let type = this.types[fullName];
        if (!type) {
            if (/\S\[\]$/.test(fullName)) {
                type = {
                    arrayUnderlyingType: fullName.slice(0, -2)
                };
            } else if (/\S\{\}$/.test(fullName)) {
                type = {
                    objectUnderlyingType: fullName.slice(0, -2)
                };
            } else if (/\S\<.*\>$/.test(fullName)) {
                const lt = fullName.indexOf("<");

                // 解析 foo<int> 中的 int。
                // 为避免泛型参数中又包含泛型参数，先替换内部的泛型。
                const args = fullName.slice(lt + 1, -1);
                const argsArray: string[] = [];
                let rawArgs = args;
                while (true) {
                    const oldArgs = rawArgs;
                    rawArgs = oldArgs.replace(/<[^>]+?>/, all => ".".repeat(all.length));
                    if (rawArgs === oldArgs) {
                        break;
                    }
                }
                rawArgs.replace(/[^,]+/g, (all, index: number) => {
                    argsArray.push(args.substr(index, all.length));
                    return "";
                });

                // 替换泛型形参生成新类型。
                const genericName = fullName.substr(0, lt) + "<" + ",".repeat(argsArray.length - 1) + ">";
                const underlyingType = this.types[genericName];
                if (underlyingType && underlyingType.genericParameters) {
                    type = {
                        ...underlyingType,
                        genericUnderlyingType: genericName,
                        genericArguments: argsArray
                    };
                    if (type.extends) {
                        type.extends = this.replaceGenericType(underlyingType.genericParameters, argsArray, type.extends);
                    }
                    for (const key in type.fields) {
                        if (type.fields[key].type) {
                            type.fields[key].type = this.replaceGenericType(underlyingType.genericParameters, argsArray, type.fields[key].type);
                        }
                    }
                } else {
                    type = {
                        native: "any",
                        name: "any"
                    };
                }
            } else {
                const native = ["number", "string", "any", "boolean", "integer", "null", "undefined", "void", "date", "object", "array", "regexp", "function", "json"].indexOf(fullName) >= 0 ? fullName : "any";
                type = {
                    native: native as any,
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
    private getAllFields(type: TypeInfo) {
        return {
            ...(type.extends ? this.getAllFields(this.getType(type.extends)) : {}),
            ...type.fields
        };
    }

    // #endregion

    // #region 接口文档

    /**
     * 存储所有接口分类。
     */
    categories: {
        [name: string]: {

            /**
             * 当前分类的标题。
             */
            title?: string;

            /**
             * 当前分类的所有接口。
             */
            apis: ApiInfo[];

            /**
             * 当前分类的所有类型。
             */
            types: TypeInfo[];

        }
    };

    /**
     * 初始化所有接口。
     * @param apis 所有接口信息。
     */
    private initApis(apis: ApiData["apis"], categories: ApiData["categories"]) {
        const data: {
            [name: string]: {

                /**
                 * 当前分类的标题。
                 */
                title?: string;

                /**
                 * 当前分类的所有接口。
                 */
                apis: ApiInfo[];

                /**
                 * 当前分类的所有类型。
                 */
                types: TypeInfo[];

            }
        } = { __proto__: null };
        for (const key in apis) {
            const api = apis[key];
            api.url = api.url || key;
            const urlPath = api.url.replace(/[?#].*$/g, "");
            api.category = api.category || path.dirname(urlPath);
            api.description = api.description ? `${api.description}(${api.url})` : api.url;
            api.name = api.name || path.basename(urlPath);
            for (const key2 in api.params) {
                const param = api.params[key2];
                param.name = param.name || key2;
                if (param.optional == undefined) {
                    param.optional = !param.notNull;
                }
            }
            if (!data[api.category]) {
                data[api.category] = {
                    title: categories && categories[api.category],
                    apis: [],
                    types: []
                };
            }
            data[api.category].apis.push(api);
        }
        for (const key in data) {
            const category = data[key];

            // 存储所有已导出的名称，确保名称不重复。
            const names: { [name: string]: true } = { __proto__: null };
            const addName = (name: string) => {
                if (!this.isIdentifier(name) || names[name]) {
                    let index = 1;
                    while (names[name + "_" + index]) {
                        index++;
                    }
                    name += "_" + index;
                }
                names[name] = true;
                return name;
            };

            // 存储所有已声明的类型，确保类型不重复。
            const types: { [fullName: string]: ParsedTypeInfo; } = { __proto__: null };
            const addType = (fullName: string) => {
                let type = types[fullName];
                if (!type) {
                    types[fullName] = type = this.getType(fullName);
                    if (type.arrayUnderlyingType) {
                        addType(type.arrayUnderlyingType);
                    } else if (type.objectUnderlyingType) {
                        addType(type.objectUnderlyingType);
                    } else if (type.genericUnderlyingType) {
                        addType(type.genericUnderlyingType);
                        for (const ga of type.genericArguments) {
                            addType(ga);
                        }
                    } else {
                        (type as ExportItem).exportName = addName(type.name);
                    }
                    if (!type.genericParameters) {
                        if (type.extends) {
                            addType(type.extends);
                        }
                        for (const key in type.fields) {
                            addType(type.fields[key].type);
                        }
                    }
                }
                return type;
            };
            const getTSName = (type: ParsedTypeInfo, values?: any[]) => {
                if (values && (type.native === "string" || type.native === "number" || type.native === "boolean")) {
                    return values.map(t => JSON.stringify(t)).join(" | ");
                }
                if (type.arrayUnderlyingType) {
                    return `${getTSName(this.getType(type.arrayUnderlyingType))}[]`;
                } else if (type.objectUnderlyingType) {
                    return `{ [key: string]: ${getTSName(this.getType(type.arrayUnderlyingType))}; }`;
                } else if (type.genericUnderlyingType) {
                    return `${getTSName(this.getType(type.arrayUnderlyingType))}<${type.genericArguments.map(ga => getTSName(this.getType(ga))).join(", ")}>`;
                } else if (type.genericParameters) {
                    return `${(type as ExportItem).exportName || type.name}<${type.genericParameters.join(", ")}>`;
                }
                return (type as ExportItem).exportName || type.name;
            };

            let paramsOptional = false;
            for (const api of category.apis) {
                (api as ExportItem).exportName = addName(api.name);
                for (const key in api.params) {
                    const param = api.params[key];
                    (param as ExportItem).exportName = this.isIdentifier(param.name) ? "$" + param.name : param.name;
                    if (param.optional) {
                        paramsOptional = true;
                    } else if (paramsOptional) {
                        param.optional = true;
                    }
                    (param as ExportItem).exportType = getTSName(addType(param.type), param.values);
                }
                if (!api.return) {
                    api.return = {
                        type: "void"
                    };
                } else {
                    const returnType = addType(api.return.type);
                    (api.return as ExportItem).exportType = getTSName(returnType, api.return.values);
                    (api.return as any).dataExportType = this.getField(returnType, this.options.dataField) ? `${(api.return as ExportItem).exportType}[${JSON.stringify(this.options.dataField)}]` : returnType.native === "void" ? "void" : "any";
                    (api.return as any).messageExportType = this.getField(returnType, this.options.messageField) ? `${(api.return as ExportItem).exportType}[${JSON.stringify(this.options.messageField)}]` : returnType.native === "void" ? "void" : "any";
                }
            }
            for (const key in types) {
                const type = types[key];
                if (type.native || type.genericUnderlyingType) {
                    continue;
                }
                if (type.extends) {
                    (type as any).extendsExportType = getTSName(this.getType(type.extends));
                }
                for (const key2 in type.fields) {
                    const field = type.fields[key2];
                    (field as ExportItem).exportName = !this.isPropName(field.name) ? JSON.stringify(field.name) : field.name;
                    (field as ExportItem).exportType = getTSName(this.getType(field.type), field.values);
                }
            }
        }
    }

    /**
     * 生成一个接口。
     * @param apis 要生成的接口信息。
     * @return 返回生成接口的代码段。
     */
    private buildApi(apis: ApiInfo[], title?: string) {

        const data = {
            categoryDescription: title,
            ajax: this.options.ajax || "ajax",
            apis: { __proto__: null } as { [key: string]: ApiInfo; },
            types: null as { [key: string]: ParsedTypeInfo; }
        };

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

    // #endregion

}

/**
 * 表示支持的选项。
 */
export interface ApiGeneratorOptions {

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
 * 表示一个已解析的类型信息。
 */
interface ParsedTypeInfo extends TypeInfo {

    /**
     * 如果当前类型是一个数组，则返回原始数据类型。
     */
    arrayUnderlyingType?: string;

    /**
     * 如果当前类型是一个键值对，则返回原始数据类型。
     */
    objectUnderlyingType?: string;

    /**
     * 如果当前类型是一个泛型，则返回原始泛型定义。
     */
    genericUnderlyingType?: string;

    /**
     * 如果当前类型是泛型，则返回泛型实参列表。
     */
    genericArguments?: string[];

    /**
     * 如果当前类型是泛型定义，则返回泛型形参列表。
     */
    genericParameters?: string[];

}

/**
 * 表示一个导出项。
 */
interface ExportItem {

    /**
     * 获取实际使用的名字。
     */
    exportName?: string;

    /**
     * 获取实际使用的名字。
     */
    exportType?: string;

}

// #endregion
