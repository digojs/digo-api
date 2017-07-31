import * as digo from "digo";
import { generate, GenerateOptions } from "./generator";

/**
 * 当添加一个文件后执行。
 * @param file 要处理的文件。
 * @param options 传递给处理器的只读选项。
 * @param done 指示异步操作完成的回调函数。
 * @param result 结果列表。
 */
module.exports = exports = function API(file: digo.File, options: GenerateOptions, done: (add?: boolean) => void, result: digo.FileList) {
    generate(file.content, options, (path, content) => {
        const output = new digo.File();
        output.path = path;
        output.content = content;
        result.add(output);
    });
    done(false);
};
