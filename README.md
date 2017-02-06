digo-tpl-js
===========================================
[digo](https://github.com/digojs/digo) 插件：编译 ejs 模板为 JS 函数。

安装
-------------------------------
```
$ npm install digo-tpl-js -g
```

用法
-------------------------------
### 编译 ejs 模板为 JS 函数
```js
digo.src("*.tpl").pipe("digo-tpl-js");
```

### 源映射(Source Map)
本插件支持生成源映射，详见 [源映射](https://github.com/digojs/digo/wiki/源映射)。

配置
-------------------------------
```js
digo.src("*.tpl").pipe("digo-tpl-js"), {
    with: false,		// 是否嵌套 with 语法，如果为 true，则模板内可以直接使用 foo 代替 $data.foo。
    sourceMap: false,	// 是否生成源映射。
    data: "$data",		// 模板内用于获取模板数据的变量。
    jsStart: '<%',		// 代码段开始标记。
    jsEnd: '%>',		// 代码段结束标记。
    name: "",			// 编译后的函数名。
    exports: true,		// 是否添加模块导出语法。
});
```

> [1]: 插件内部已重设了此配置的默认值。
