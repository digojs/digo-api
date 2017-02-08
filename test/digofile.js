var digo = require("digo");

exports.default = function () {
    digo.src("fixtures/*.json").pipe("../", {
        mergeDir: "_build"
    }).dest("_build");
};
