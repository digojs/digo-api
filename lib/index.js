"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const digo = require("digo");
const generator_1 = require("./generator");
/**
 * 当添加一个文件后执行。
 * @param file 要处理的文件。
 * @param options 传递给处理器的只读选项。
 * @param done 指示异步操作完成的回调函数。
 * @param result 结果列表。
 */
module.exports = exports = function API(file, options, done, result) {
    // 兼容 v0.0.2 接口
    upgradeV1ToV2(options);
    generator_1.generate(file.content, options, (path, content) => {
        const output = new digo.File();
        output.path = path;
        output.content = content;
        result.add(output);
    });
    done(false);
};
function upgradeV1ToV2(options) {
    if (options.apiDir) {
        options.ts = options.apiDir;
    }
    if (options.docDir) {
        options.doc = options.docDir + "/index.html";
    }
    if (options.mockDir) {
        options.mock = options.mockDir;
    }
    if (options.dataField) {
        options.dataProperty = options.dataField;
    }
    if (options.messageField) {
        options.messageProperty = options.messageField;
    }
    options.merge = !!options.mergeDir;
}
