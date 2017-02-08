var digo = require("digo");

exports.default = function () {
    digo.src("fixtures/*.json").pipe("../", {
        merge: "_build"
    }).dest("_build");
};
