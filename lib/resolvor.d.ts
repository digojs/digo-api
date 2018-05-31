import { ApiFile, Api, Category, Type, Property, ValueInfo } from "./api";
/**
 * 表示一个接口文件分析器。
 */
export declare class ApiResovler {
    file: ApiFile;
    /**
     * 初始化新的分析器。
     * @param file 要分析的文件。
     */
    constructor(file: ApiFile);
    /**
     * 升级 v1 版本的接口数据为 v2。
     * @param file 要更新的文件。
     * @return 返回已更新的文件。
     */
    private upgradeV1ToV2;
    /**
     * 获取泛型定义的存储键。
     * @param name 泛型名称部分。
     * @param typeParameterCount 泛型形参个数。
     * @return 返回存储键。
     */
    private getGenericKey;
    /**
     * 获取指定的类型。
     * @param name 要获取的类型全名。
     * @return 返回类型信息。
     */
    getType(name: string): ResolvedType;
    /**
     * 替换类型名中的泛型形参部分。
     * @param type 当前的类型名。
     * @param typeParameters 泛型形参。
     * @param typeArguments 泛型实参。
     * @return 返回替换后的类型名。
     */
    private inflateTypes;
    /**
     * 获取指定类型及基类型的属性。
     * @param type 要获取的类型。
     * @param name 要获取的属性名。
     * @return 返回属性。
     */
    getProperty(type: ResolvedType, name: string): Property | undefined;
    /**
     * 获取指定类型及基类型的所有属性。
     * @param type 要获取的类型。
     * @return 返回属性。
     */
    getAllProperties(type: ResolvedType): {
        [name: string]: Property;
    };
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
    getMock(value: ValueInfo, name?: string, input?: any, maxDepth?: number, prefix?: string, caseType?: number, counters?: {
        [key: string]: number;
    }): any;
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
    mockData(type: ResolvedType, value: ValueInfo, name: string, prefix: string, caseType: number, depth: number): string | number;
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
    mockCount(type: ResolvedType, value: ValueInfo, name: string, prefix: string, caseType: number, depth: number): 3 | 15;
    /**
     * 获取所有分类。
     * @return 返回分类列表。
     */
    getCategories(): {
        [key: string]: ResolvedCategory;
    };
    /**
     * 获取所有类型。
     * @return 返回类型列表。
     */
    getTypes(): {
        [key: string]: ResolvedType;
    };
    /**
     * 获取所有接口。
     * @return 返回接口列表。
     */
    getApis(): {
        [path: string]: Api;
    };
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
