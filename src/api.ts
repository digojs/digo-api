/**
 * 表示一个接口文件。
 */
export interface ApiFile extends NameInfo {

    /**
     * 版本号。
     */
    version: Version;

    /**
     * 版权声明。
     */
    copyright?: string;

    /**
     * 开源协议。
     */
    license?: string;

    /**
     * 所有接口列表。
     */
    apis?: { [path: string]: Api; };

    /**
     * 所有类型列表。
     */
    types?: { [name: string]: Type; };

    /**
     * 所有分类列表。
     */
    categories?: { [name: string]: Category; };

    /**
     * 服务根地址。
     */
    url?: string;

}

/**
 * 表示一个接口。
 */
export interface Api extends NameInfo {

    /**
     * 所属分类。
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
     * 接口缓存的毫秒数。如果为 -1 表示不缓存。如果为 0 说明是会话缓存。
     */
    cache?: number;

    /**
     * 所有参数列表。
     */
    parameters?: { [name: string]: RequestParameter; };

    /**
     * 响应结果。
     */
    responses?: Response[];

}

/**
 * 表示一个请求参数。
 */
export interface RequestParameter extends NameInfo, ValueInfo {

    /**
     * 请求谓词(HTTP Method)。如 "GET"。
     */
    method?: string;

}

/**
 * 表示一个响应。
 */
export interface Response extends ValueInfo {

    /**
     * 响应的状态码。
     */
    statusCode?: number;

    /**
     * 概述。
     */
    summary?: string;

    /**
     * 响应内容类型(Content-Type)。如 "application/json"。
     */
    contentType?: string;

}

/**
 * 表示一个类型。
 */
export interface Type extends NameInfo {

    /**
     * 成员类型。
     */
    memberType?: "class" | "enum";

    /**
     * 当前类型映射的内置类型。
     */
    type?: NativeType;

    /**
     * 继承的类型。
     */
    extends?: string;

    /**
     * 所有字段信息。
     */
    properties?: { [name: string]: Property; };

}

/**
 * 表示一个属性。
 */
export interface Property extends NameInfo, ValueInfo {

}

/**
 * 表示一个分类。
 */
export interface Category extends NameInfo {

}

/**
 * 表示一个命名信息。
 */
export interface NameInfo {

    /**
     * 名称。
     */
    name?: string;

    /**
     * 概述。
     */
    summary?: string;

    /**
     * 作者。
     */
    author?: string;

    /**
     * 创建版本号。
     */
    created?: Version;

    /**
     * 最后更新版本号。
     */
    modified?: Version;

    /**
     * 开始被否定的版本号或标记是否被否定。
     */
    deprecated?: Version | boolean;

}

/**
 * 表示一个值信息。
 */
export interface ValueInfo {

    /**
     * 类型。
     */
    type?: string;

    /**
     * 内置验证字段。
     */
    validate?: string;

    /**
     * 是否可选。
     */
    optional?: boolean;

    /**
     * 默认值。
     */
    default?: any;

    /**
     * 所有的可能值。
     */
    enum?: any[];

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
     * 应匹配的正则表达式。
     */
    pattern?: string;

    /**
     * 模拟数据。
     */
    mock?: any;

}

/**
 * 表示一个版本号。
 */
export type Version = string;

/**
 * 表示内置类型。
 */
export type NativeType = "string" | "number" | "boolean" | "any";
