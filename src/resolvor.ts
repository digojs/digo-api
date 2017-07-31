import { ApiFile, Api, Category, Type, Property, NativeType, ValueInfo } from "./api";

/**
 * 表示一个接口文件分析器。
 */
export class ApiResovler {

    /**
     * 初始化新的分析器。
     * @param file 要分析的文件。
     */
    constructor(public file: ApiFile) {
        file = this.upgradeV1ToV2(file);

        file.types = file.types || {};
        file.apis = file.apis || {};
        file.categories = file.categories || {};

        for (const key in file.types) {
            const type = file.types[key] as ResolvedType;
            type.name = type.name || key;

            // 统一泛型定义：将 foo.A<T,K> -> foo.A<,>
            const match = /^(.*)<([^<>\.]*)>$/.exec(key);
            if (match) {
                type.resolvedTypeParameters = match[2].split(/,\s*/);
                delete file.types[key];
                file.types[this.getGenericKey(match[1], type.resolvedTypeParameters.length)] = type;
            }

            for (const key2 in type.properties) {
                const property = type.properties[key2];
                property.name = property.name || key2;
            }
        }

        for (const key in file.apis) {
            const api = file.apis[key];

            const match = /^([A-Z]+)\s+(.*)$/.exec(key);
            if (match) {
                if (!api.method) api.method = match[1];
                if (!api.name) api.name = match[2];
            }
            api.name = api.name || key;

            let optional = false;
            for (const key2 in api.parameters) {
                const param = api.parameters[key2];
                param.name = param.name || key2;
                if (param.optional) {
                    optional = true;
                } else if (optional) {
                    param.optional = true;
                }
            }

            api.responses = api.responses || [];
            if (!api.responses.length) {
                api.responses.push({ type: "any" });
            }

            if (!api.category) {
                api.category = api.name.replace(/\/[^\/]*$/, "") || "index";
            }
            let category = file.categories[api.category] as ResolvedCategory;
            if (!category) {
                file.categories[api.category] = category = {} as ResolvedCategory;
            }
            category.name = category.name || api.category;
            category.resolvedApis = category.resolvedApis || [];
            category.resolvedApis.push(api);
        }
    }

    /**
     * 升级 v1 版本的接口数据为 v2。
     * @param file 要更新的文件。
     * @return 返回已更新的文件。
     */
    private upgradeV1ToV2(file: ApiFile) {
        if (parseInt(file.version) || 0 < 2) {
            file.version = "2";
            for (const key in file.types) {
                const type = file.types[key];
                if ((type as any).type) {
                    type.memberType = (type as any).type;
                    delete (type as any).type;
                }
                if ((type as any).native) {
                    type.type = (type as any).native;
                    delete (type as any).native;
                    if (type.type as any == "integer") {
                        type.type = "number";
                    } else if (type.type as any == "date") {
                        type.type = "string";
                    }
                }
                if ((type as any).fields) {
                    type.properties = (type as any).fields;
                    delete (type as any).fields;
                }
                for (const key2 in type.properties) {
                    const property = type.properties[key2];
                    property.summary = (property as any).description;
                    delete (property as any).description;
                    property.enum = (property as any).values;
                    delete (property as any).values;
                    if ((property as any).notNull === false) {
                        property.optional = true;
                        delete (property as any).notNull;
                    }
                }
            }
            for (const key in file.apis) {
                const api = file.apis[key];
                api.summary = (api as any).description;
                delete (api as any).description;
                if ((api as any).return) {
                    (api as any).return.summary = (api as any).return.description;
                    delete (api as any).return.description;
                    api.responses = [(api as any).return];
                }
                if ((api as any).params) {
                    api.parameters = (api as any).params;
                    delete (api as any).params;
                }
                for (const key2 in api.parameters) {
                    const param = api.parameters[key2];
                    param.summary = (param as any).description;
                    delete (param as any).description;
                    param.enum = (param as any).values;
                    delete (param as any).values;
                    param.optional = param.optional || !(param as any).notNull;
                    delete (param as any).notNull;
                }
            }
        }
        return file;
    }

    /**
     * 获取泛型定义的存储键。
     * @param name 泛型名称部分。
     * @param typeParameterCount 泛型形参个数。
     * @return 返回存储键。
     */
    private getGenericKey(name: string, typeParameterCount: number) {
        return name + "<" + ",".repeat(typeParameterCount - 1) + ">";
    }

    /**
     * 获取指定的类型。
     * @param name 要获取的类型全名。
     * @return 返回类型信息。
     */
    getType(name: string) {
        if (!name) {
            name = "any";
        }
        let type = this.file.types[name] as ResolvedType;
        if (!type) {
            this.file.types[name] = type = { name: name };
            if (/\[\]$/.test(name)) {
                type.resolvedUnderlyingArray = name.slice(0, -2);
            } else if (/\{\}$/.test(name)) {
                type.resolvedUnderlyingObject = name.slice(0, -2);
            } else if (/\<.*\>$/.test(name)) {
                const lt = name.indexOf("<");

                // 解析 foo<int> 中的 int。
                const typeArgs: string[] = [];
                const args = name.slice(lt + 1, -1);

                // 先转换 foo<foo<int, number>, number> -> foo<foo............., number>
                // 避免解析到错误的逗号。
                let flattenArgs = args;
                while (true) {
                    const oldArgs = flattenArgs;
                    flattenArgs = oldArgs.replace(/<[^>]+?>/, all => ".".repeat(all.length));
                    if (flattenArgs === oldArgs) {
                        break;
                    }
                }

                flattenArgs.replace(/[^,]+/g, (all, index: number) => {
                    typeArgs.push(args.substr(index, all.length));
                    return "";
                });

                // 替换泛型形参生成新类型。
                const underlyingTypeName = this.getGenericKey(name.substr(0, lt), typeArgs.length);
                const underlyingType = this.getType(underlyingTypeName);
                if (underlyingType.resolvedTypeParameters) {
                    Object.assign(type, underlyingType);
                    type.name = name;
                    type.resolvedUnderlyingGeneric = underlyingTypeName;
                    type.resolvedTypeArguments = typeArgs;
                    if (underlyingType.extends) {
                        type.extends = this.inflateTypes(type.extends, underlyingType.resolvedTypeParameters, typeArgs);
                    }
                    type.properties = {};
                    for (const key in underlyingType.properties) {
                        const property = underlyingType.properties[key];
                        type.properties[key] = {
                            ...property,
                            type: this.inflateTypes(property.type, underlyingType.resolvedTypeParameters, typeArgs)
                        };
                    }
                } else {
                    type.type = "any";
                }
            } else {
                type.type = ["number", "string", "boolean"].indexOf(name) >= 0 ? name as NativeType : "any";
            }
        }
        return type;
    }

    /**
     * 替换类型名中的泛型形参部分。
     * @param type 当前的类型名。
     * @param typeParameters 泛型形参。
     * @param typeArguments 泛型实参。
     * @return 返回替换后的类型名。
     */
    private inflateTypes(type: string, typeParameters: string[], typeArguments: string[]) {
        for (let i = 0; i < typeParameters.length; i++) {
            type = type.replace(new RegExp("\\b" + typeParameters[i] + "\\b", "g"), typeArguments[i]);
        }
        return type;
    }

    /**
     * 获取指定类型及基类型的属性。
     * @param type 要获取的类型。
     * @param name 要获取的属性名。
     * @return 返回属性。
     */
    getProperty(type: ResolvedType, name: string): Property | undefined {
        const result = type.properties && type.properties[name];
        if (result) {
            return result;
        }
        if (type.extends) {
            return this.getProperty(this.getType(type.extends), name);
        }
    }

    /**
     * 获取指定类型及基类型的所有属性。
     * @param type 要获取的类型。
     * @return 返回属性。
     */
    getAllProperties(type: ResolvedType): { [name: string]: Property; } {
        return {
            ...(type.extends ? this.getAllProperties(this.getType(type.extends)) : {}),
            ...type.properties
        };
    }

    /**
     * 生成指定类型的模拟数据。
     * @param value 要生成的值。
     * @param name 字段的名字。
     * @param input 原始数据。如果提供了原始数据则执行合并。
     * @param maxDepth 遍历的深度。
     * @param prefix 添加的前缀。
     * @param caseType 添加的后缀。
     * @param counters 统计所有数据生成次数的对象。
     * @return 返回生成的模拟数据。
     */
    getMock(value: ValueInfo, name?: string, input?: any, maxDepth = 3, prefix = "", caseType = 0, counters: { [key: string]: number; } = {}) {
        const type = this.getType(value.type);

        // 验证输入数据。
        if (input != undefined) {
            if (type.type === "string") {
                if (typeof input !== "string") {
                    input = String(input);
                }
            } else if (type.type === "number") {
                if (typeof input !== "number") {
                    input = parseFloat(input);
                    if (isNaN(input)) {
                        input = undefined;
                    }
                }
            } else if (type.type === "boolean") {
                input = !!input;
            } else if (!type.type) {
                if (type.resolvedUnderlyingArray) {
                    if (!Array.isArray(input)) {
                        input = undefined;
                    }
                } else if (type.memberType === "enum") {
                    if (typeof input !== "string" && typeof input !== "number") {
                        input = undefined;
                    }
                } else {
                    if (typeof input !== "object") {
                        input = undefined;
                    }
                }
            }
        }

        // 枚举类型。
        if (value.enum && value.enum.length > 0) {
            return input !== undefined && value.enum.indexOf(input) >= 0 ? input : value.enum[caseType % value.enum.length];
        }

        // 默认值。
        if (input === undefined) {
            if (value.default !== undefined && caseType === 0) {
                return value.default;
            }
            const defaultMock = this.mockData(type, value, name, prefix, caseType, maxDepth);
            if (defaultMock !== undefined) {
                return defaultMock;
            }
        }

        // 内置类型。
        if (type.type) {
            if (input != undefined) {
                return input;
            }
            switch (type.type) {
                case "number":
                    if (value.min != undefined) {
                        return value.min;
                    }
                    if (value.max != undefined) {
                        return value.max - 1;
                    }
                    return caseType;
                case "string":
                    if (value.min != undefined) {
                        return `${caseType}`.repeat(Math.max(value.min, 0));
                    }
                    if (value.max != undefined) {
                        return `${caseType}`.repeat(Math.max(value.max - 1, 0));
                    }
                    return `${prefix}`;
                case "boolean":
                    return caseType % 2 === 0;
                default:
                    return null;
            }
        }

        // 枚举类型。
        if (type.memberType === "enum") {
            if (input != undefined) {
                return input;
            }
            const properties = this.getAllProperties(type);
            const enumKeys = Object.keys(properties);
            return (properties[enumKeys[caseType % enumKeys.length]] || { default: null }).default;
        }

        // T[]
        if (type.resolvedUnderlyingArray) {
            const result: any[] = [];
            const item = { type: type.resolvedUnderlyingArray };
            if (input) {
                for (let i = 0; i < input.length; i++) {
                    result[i] = this.getMock(item, name, input[i], maxDepth, prefix ? prefix + "_" + i : i.toString(), i, counters);
                }
            } else {
                const mockCount = this.mockCount(type, value, name, prefix, caseType, maxDepth);
                for (let i = 0; i < mockCount; i++) {
                    result[i] = this.getMock(item, name, input, maxDepth, prefix ? prefix + "_" + i : i.toString(), i, counters);
                }
            }
            return result;
        }

        // T{}
        if (type.resolvedUnderlyingObject) {
            const result: { [key: string]: any; } = {};
            const item = { type: type.resolvedUnderlyingObject };
            if (input) {
                for (const key in input) {
                    result[key] = this.getMock(item, key, input[key], maxDepth, prefix ? prefix + "_" + key : key, caseType, counters);
                }
            } else {
                const mockCount = this.mockCount(type, value, name, prefix, caseType, maxDepth);
                for (let i = 0; i < mockCount; i++) {
                    result["key_" + i] = this.getMock(item, name, input, maxDepth, prefix ? prefix + "_" + i : i.toString(), caseType, counters);
                }
            }
            return result;
        }

        // 避免深层次递归。
        if (counters[type.name] >= maxDepth) {
            return input !== undefined ? input : null;
        }

        // POJO
        const result = {};
        const properties = this.getAllProperties(type);
        for (const key in properties) {
            const property = properties[key];
            counters[type.name] = counters[type.name] + 1 || 1;
            result[property.name] = this.getMock(property, property.name, input && input[name], maxDepth, prefix ? prefix + "_" + property.name : property.name, caseType, counters);
            counters[type.name]--;
        }
        return result;
    }

    /**
     * 自定义生成模拟数据的逻辑。
     * @param type 字段的类型。
     * @param value 要生成的值。
     * @param name 字段的名字。
     * @param prefix 添加的前缀。
     * @param caseType 添加的后缀。
     * @param depth 遍历的深度。
     * @return 返回模拟数据。
     */
    mockData(type: ResolvedType, value: ValueInfo, name: string, prefix: string, caseType: number, depth: number) {
        if (name) {
            const keyName = name.replace(/^.*([A-Z])/, (all, char: string) => char.toLowerCase());
            if (type.type === "number") {
                switch (keyName) {
                    case "id":
                        return 100 + caseType;
                    case "money":
                        return 10000 + caseType;
                    case "age":
                        return 10 + caseType;
                    case "page":
                        return caseType + 1;
                    case "code":
                        return caseType;
                    case "total":
                        return 15;
                    case "size":
                        return 10;
                    case "week":
                        return caseType % 7;
                }
            } else if (type.type === "string") {
                switch (keyName) {
                    case "date":
                        return `2010/01/0${caseType % 10}`;
                    case "time":
                        return `00:00:0${caseType % 10}`;
                    case "datetime":
                    case "create":
                    case "modified":
                        return `2010/01/0${caseType % 10} 00:00:0${caseType % 10}`;
                    case "color":
                        return `#0${caseType}0${caseType}0${caseType}`;
                    case "hash":
                        return (10000 + caseType).toString(16);
                    case "checksum":
                        return (caseType % 10).toString().repeat(32);
                    case "url":
                        return `http://test.com/${prefix}`;
                    case "html":
                        return `<strong>${prefix || caseType}</strong>`;
                    case "email":
                        return `${prefix ? prefix + "_" : prefix}email@test.com`;
                    case "phone":
                        return (1810000000 + caseType).toString();
                    case "password":
                        return "000000";
                    case "idcard":
                        return [`211200199907105612`, `130581200609164920`, `31010419820930652X`][caseType % 3];
                    case "passport":
                        return (331122316654 + caseType).toString();
                    case "postcode":
                        return (10010 + caseType).toString();
                    case "gps":
                        return `1000.${caseType},1000.${caseType}`;
                    case "checkcode":
                        return (100000 + caseType).toString();
                    case "imei":
                        return (1000000 + caseType).toString();
                }
            }
        }
    }

    /**
     * 自定义生成模拟数据个数的逻辑。
     * @param type 字段的类型。
     * @param value 要生成的值。
     * @param name 字段的名字。
     * @param prefix 添加的前缀。
     * @param caseType 添加的后缀。
     * @param depth 遍历的深度。
     * @return 返回模拟个数。
     */
    mockCount(type: ResolvedType, value: ValueInfo, name: string, prefix: string, caseType: number, depth: number) {
        if (name == "list" || name == "data") {
            return 15;
        }
        return 3;
    }

    /**
     * 获取所有分类。
     * @return 返回分类列表。
     */
    getCategories() {
        return this.file.categories as { [key: string]: ResolvedCategory; };
    }

    /**
     * 获取所有类型。
     * @return 返回类型列表。
     */
    getTypes() {
        return this.file.types as { [key: string]: ResolvedType; };
    }

    /**
     * 获取所有接口。
     * @return 返回接口列表。
     */
    getApis() {
        return this.file.apis;
    }

}

/**
 * 表示解析后的类型。
 */
export interface ResolvedType extends Type {

    /**
     * 如果当前类型是一个数组，则返回原始数据类型。
     */
    resolvedUnderlyingArray?: string;

    /**
     * 如果当前类型是一个键值对，则返回原始数据类型。
     */
    resolvedUnderlyingObject?: string;

    /**
     * 如果当前类型是一个泛型，则返回原始泛型定义。
     */
    resolvedUnderlyingGeneric?: string;

    /**
     * 如果当前类型是泛型，则返回泛型实参列表。
     */
    resolvedTypeArguments?: string[];

    /**
     * 如果当前类型是泛型定义，则返回泛型形参列表。
     */
    resolvedTypeParameters?: string[];

}

/**
 * 表示已解析的分类。
 */
export interface ResolvedCategory extends Category {

    /**
     * 获取已解析的接口。
     */
    resolvedApis: Api[];

}
