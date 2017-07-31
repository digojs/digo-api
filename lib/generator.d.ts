import { ValueInfo, ApiFile } from "./api";
import { ApiResovler, ResolvedType } from "./resolvor";
/**
 * 生成接口文档。
 * @param apiFile 要生成的接口数据。
 * @param options 生成的选项。
 * @param writeFile 写入文件的回调函数。
 */
export declare function generate(api: string, options: GenerateOptions, writeFile: (path: string, content: string) => void): void;
/**
 * 生成的选项。
 */
export interface GenerateOptions {
    /**
     * 初始化原始数据库。
     */
    init?(file: ApiFile): void;
    /**
     * 自定义个别字段的模拟数据。
     */
    mockData?(type: ResolvedType, value: ValueInfo, name: string, prefix: string, caseType: number, depth: number): any;
    /**
     * 自定义个别字段的模拟个数。
     */
    mockCount?(type: ResolvedType, value: ValueInfo, name: string, prefix: string, caseType: number, depth: number): number;
    /**
     * 模拟数据文件夹地址。
     */
    mock?: string;
    /**
     * 是否合并已有的模拟数据。
     */
    merge?: boolean;
    /**
     * 嵌套对象的最多模拟次数。
     */
    maxDepth?: number;
    /**
     * 模拟数据的前缀。
     */
    mockPrefix?: string;
    /**
     * 接口文件夹地址。
     */
    ts?: string;
    /**
     * 设置 AJAX 模块地址。
     */
    ajaxModule?: string;
    /**
     * 成功回调的描述。
     */
    successDescription?: string;
    /**
     * 失败回调的描述。
     */
    errorDescription?: string;
    /**
     * 设置数据字段。
     */
    dataProperty?: string;
    /**
     * 设置信息字段。
     */
    messageProperty?: string;
    /**
     * 生成的文档文件名。
     */
    doc?: string;
    /**
     * 自定义生成函数。
     */
    generate?(resolver: ApiResovler, mockDatas: {
        [key: string]: any;
    }, options: GenerateOptions, writeFile: (path: string, content: string) => void): void;
}
