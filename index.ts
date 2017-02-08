/**
 * @file 根据 API 文档生成 JS api
 * @author xuld@vip.qq.com
 */
import * as digo from "digo";
import { ApiData, ApiGenerator } from "./apiGenerator";

/**
 * 当添加一个文件后执行。
 * @param file 要处理的文件。
 * @param options 传递给处理器的只读选项。
 * @param done 指示异步操作完成的回调函数。
 * @param result 结果列表。
 */
module.exports = exports = function API(file: digo.File, options: ApiData, done: (add?: boolean) => void, result: digo.FileList) {
    const generator = new ApiGenerator(merge(JSON.parse(file.content), options));
    const files = generator.build();
    for (const key in files) {
        const file = new digo.File();
        file.path = key;
        file.content = files[key];
        result.add(file);
    }
    debugger
    done(false);
};

function merge(dest, src) {
    for (const key in src) {
        if (src[key] && typeof src[key] === "object" && typeof dest[key] === "object") {
            dest[key] = merge(dest[key], src[key]);
        } else {
            dest[key] = src[key];
        }
    }
    return dest;
}
