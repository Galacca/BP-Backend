"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("./entities/constants");
const post_1 = require("./entities/post");
const user_1 = require("./entities/user");
const path_1 = __importDefault(require("path"));
exports.default = {
    migrations: {
        path: path_1.default.join(__dirname, "./migrations"),
        pattern: /^[\w-]+\d+\.[tj]s$/
    },
    entities: [post_1.Post, user_1.User],
    dbName: 'demo',
    user: 'postgres',
    password: 'R4vingShine',
    debug: !constants_1.__prod__,
    type: 'postgresql'
};
//# sourceMappingURL=mikro-orm.config.js.map