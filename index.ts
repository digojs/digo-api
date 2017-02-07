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
module.exports = exports = function API(file: digo.File, options: Options, done: () => void, result: digo.FileList) {
    const generator = new ApiGenerator(options);
    generator.build(JSON.parse(file.content));
};
