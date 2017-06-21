"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @file 根据 API 文档生成 JS api
 * @author xuld@vip.qq.com
 */
const digo = require("digo");
const apiGenerator_1 = require("./apiGenerator");
/**
 * 当添加一个文件后执行。
 * @param file 要处理的文件。
 * @param options 传递给处理器的只读选项。
 * @param done 指示异步操作完成的回调函数。
 * @param result 结果列表。
 */
module.exports = exports = function API(file, options, done, result) {
    const generator = new apiGenerator_1.ApiGenerator(merge(JSON.parse(file.content), options));
    const files = generator.build();
    for (const key in files) {
        const file = new digo.File();
        file.path = key;
        file.content = files[key];
        result.add(file);
    }
    done(false);
};
function merge(dest, src) {
    for (const key in src) {
        if (src[key] && typeof src[key] === "object" && typeof dest[key] === "object") {
            dest[key] = merge(dest[key], src[key]);
        }
        else {
            dest[key] = src[key];
        }
    }
    return dest;
}
