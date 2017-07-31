digo-api
===========================================
[digo](https://github.com/digojs/digo) 插件：生成 API 模拟数据、文档和接口 SDK。

安装
-------------------------------
```
$ npm install digo-api -g
```

用法
-------------------------------
### 编译 ejs 模板为 JS 函数
```js
digo.src("api.json").pipe("digo-api");
```

配置
-------------------------------
```js
digo.src("api.json").pipe("digo-api"), {
    init: null,             //  初始化原始数据库。
    mockData: null,         // 自定义个别字段的模拟数据。
    mockCount: null,        // 自定义个别字段的模拟数据。
    mock: null,             // 模拟数据文件夹地址。
    merge: true,            // 是否合并已有的模拟数据。
    maxDepth: 3,            // 嵌套对象的最多模拟次数。
    mockPrefix: "",         // 模拟数据的前缀。
    ts: null,               // 接口文件夹地址。
    ajaxModule: null,       // 设置 AJAX 模块地址。
    successDescription: "The request callback when succeed.", // 成功回调的描述。
    errorDescription: "The request callback when error occurs.", // 失败回调的描述。
    dataProperty: null,     // 设置数据字段。
    messageProperty: null,  // 设置信息字段。
    doc: null,              // 生成的文档文件名。
    generate: null,         // 自定义生成函数。
});
```
