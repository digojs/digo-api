var digo = require("digo");

exports.default = function () {
    digo.src("fixtures/*.json").pipe("../", {
        mock: "mock",
        ts: "lib",
        dataProperty: "data",
        messageProperty: "message",
        doc: "index.html"
    }).dest("_build");
};
