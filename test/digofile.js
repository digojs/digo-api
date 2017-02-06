var digo = require("digo");

exports.default = function () {
    digo.src("fixtures/*.json").pipe("../").dest("_build");
};
