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
    // 兼容 v0.0.2 接口
    upgradeV1ToV2(options);

    generate(file.content, options, (path, content) => {
        const output = new digo.File();
        output.path = path;
        output.content = content;
        result.add(output);
    });
    done(false);
};

function upgradeV1ToV2(options: GenerateOptions) {
    if ((options as any).apiDir) {
        options.ts = (options as any).apiDir + "/index.html";
    }
    if ((options as any).docDir) {
        options.doc = (options as any).docDir;
    }
    if ((options as any).mockDir) {
        options.mock = (options as any).mockDir;
    }
    if ((options as any).dataField) {
        options.dataProperty = (options as any).dataField;
    }
    if ((options as any).messageField) {
        options.messageProperty = (options as any).messageField;
    }
    options.merge = !!(options as any).mergeDir;
}