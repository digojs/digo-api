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
    generator_1.generate(file.content, options, (path, content) => {
        const output = new digo.File();
        output.path = path;
        output.content = content;
        result.add(output);
    });
    done(false);
};
