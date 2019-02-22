function MapCsv(csvContents, mapDef) {
    var tableData = new Table();
    var trimmedContents = csvContents.trim();
    trimmedContents.split("\n").forEach(function (row) {
        tableData.data.push(row.split(","));
    });
    tableData.pad();
    var mapper = new Mapper(tableData, mapDef);
    return mapper.map();
}
if (!window["MapCsv"]) {
    window["MapCsv"] = MapCsv;
}
function EnumToList(myEnum) {
    var result = [];
    for (var enumMember in myEnum) {
        if (myEnum.hasOwnProperty(enumMember)) {
            result.push(enumMember);
        }
    }
    return result;
}
var Mapper = (function () {
    function Mapper(table, profile) {
        this.table = table;
        this.profile = profile;
    }
    Mapper.prototype.map = function () {
        var _this = this;
        var outputObjectArray = [];
        var map = this.profile.map;
        this.table.data.forEach(function (row, index) {
            if (_this.profile.skipRows.indexOf(index) > -1) {
                return;
            }
            var currentObject = {};
            for (var property in map) {
                if (map.hasOwnProperty(property)) {
                    var propertyProfile = map[property];
                    var value = null;
                    switch (propertyProfile.extractMethod) {
                        case AllowedExtractMethodsEnum.FixedColumn:
                            value = _this.getFixedValue(row, propertyProfile);
                            break;
                        case AllowedExtractMethodsEnum.ConditionalColumn:
                            value = _this.getConditionalValue(row, currentObject, propertyProfile);
                            break;
                        case AllowedExtractMethodsEnum.Sequential:
                            value = _this.getSequentialValues(row, propertyProfile);
                            break;
                        case AllowedExtractMethodsEnum.HeaderRow:
                        case AllowedExtractMethodsEnum.CurrentColumn:
                            throw new Error(propertyProfile.extractMethod + " is not allowed in this context.");
                        default:
                            throw new Error(propertyProfile.extractMethod + "is not a valid extract method.");
                    }
                    currentObject[property] = value;
                }
            }
            outputObjectArray.push(currentObject);
        });
        return outputObjectArray;
    };
    Mapper.prototype.getFixedValue = function (row, profile) {
        var columnIndex = profile.columnIndex;
        if (columnIndex >= row.length) {
            throw new Error("profile,columnIndex: " + columnIndex + " is invalid.");
        }
        var value = row[columnIndex];
        if (profile.extractPattern !== undefined) {
            value = this.tryMatch(value, profile.extractPattern);
        }
        if (profile.castType) {
            value = this.tryCastType(value, profile.type);
        }
        return value;
    };
    Mapper.prototype.getSequentialValues = function (row, profile) {
        var resultArray = [];
        var startIndex = profile.columnIndexStart ? profile.columnIndexStart : 0;
        var endIndex = profile.columnIndexEnd ? profile.columnIndexEnd + 1 : row.length;
        for (var i = startIndex; i < endIndex; i++) {
            var columnValue = row[i];
            var headerValue = this.table.headerRow[i];
            var resultItem = {};
            for (var propertyName in profile.listType) {
                if (profile.listType.hasOwnProperty(propertyName)) {
                    var value = null;
                    var currentProfileMap = profile.listType[propertyName];
                    switch (currentProfileMap.extractMethod) {
                        case AllowedExtractMethodsEnum.HeaderRow:
                            value = headerValue;
                            break;
                        case AllowedExtractMethodsEnum.CurrentColumn:
                            value = columnValue;
                            break;
                        default:
                            throw new Error("Extract method: " +
                                currentProfileMap.extractMethod +
                                " is not valid when used inside sequential mapping");
                    }
                    if (currentProfileMap.extractPattern !== undefined) {
                        value = this.tryMatch(value, currentProfileMap.extractPattern);
                    }
                    if (currentProfileMap.castType) {
                        value = this.tryCastType(value, currentProfileMap.type);
                    }
                    resultItem[propertyName] = value;
                }
            }
            resultArray.push(resultItem);
        }
        return resultArray;
    };
    Mapper.prototype.getConditionalValue = function (row, localScope, profile) {
        var conditional = profile.conditional;
        conditional.use.forEach(function (property) {
            if (!localScope.hasOwnProperty(property)) {
                throw new Error("Property: " + property + " not found. ");
            }
        });
        var value = null;
        var columnIndex = -1;
        var defaultValue = null;
        var expressions = conditional.if;
        var _loop_1 = function (i) {
            var expression = expressions[i];
            if (expression.condition == null) {
                defaultValue = expression.defaultValue;
                return "break";
            }
            if (expression.defaultValue != null) {
                throw new Error("defaultValue should only be defined with a null condition");
            }
            var condition = expression.condition;
            conditional.use.forEach(function (property) {
                if (localScope.hasOwnProperty(property)) {
                    condition = expression.condition.split(property).join("localScope." + property);
                }
            });
            var evalExpression = eval(condition);
            if (typeof evalExpression !== "boolean") {
                throw new Error("Invalid expression for conditional profile");
            }
            if (evalExpression) {
                columnIndex = expression.columnIndex;
                return "break";
            }
        };
        for (var i = 0; i < expressions.length; i++) {
            var state_1 = _loop_1(i);
            if (state_1 === "break")
                break;
        }
        if (columnIndex > -1) {
            if (columnIndex >= row.length) {
                throw new Error("columnIndex: " + columnIndex + " is out of bound");
            }
            value = row[columnIndex];
        }
        else {
            if (defaultValue === null) {
                throw new Error("defaultValue not defined in conditional profile, did you forget to define a default index?");
            }
            value = defaultValue;
        }
        if (profile.extractPattern !== undefined) {
            value = this.tryMatch(value, profile.extractPattern);
        }
        if (profile.castType) {
            value = this.tryCastType(value, profile.type);
        }
        return value;
    };
    Mapper.prototype.tryCastType = function (value, type) {
        if (value === undefined) {
            return;
        }
        if (type === AllowedTypes.Numeric) {
            var parsedValue = parseInt(value, 10);
            if (isNaN(parsedValue)) {
                throw new Error(value + " is not a number");
            }
            return parsedValue;
        }
        if (type === AllowedTypes.Float) {
            var parsedValue = parseFloat(value);
            if (isNaN(parsedValue)) {
                throw new Error(value + " is not a float");
            }
            return parsedValue;
        }
        return value;
    };
    Mapper.prototype.tryMatch = function (value, rgx) {
        var regex = new RegExp(rgx.pattern, rgx.flag);
        var match = value.match(regex);
        if (match != null) {
            return match[0];
        }
        else {
            return null;
        }
    };
    return Mapper;
}());
var Table = (function () {
    function Table() {
        this.data = [];
    }
    Object.defineProperty(Table.prototype, "headerRow", {
        get: function () {
            if (this.data.length > 0) {
                return this.data[0];
            }
            return [];
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Table.prototype, "tableBody", {
        get: function () {
            if (this.data.length > 0) {
                return this.data.slice(1);
            }
            return [];
        },
        enumerable: true,
        configurable: true
    });
    Table.prototype.pad = function () {
        var max = -1;
        this.data.forEach(function (row) {
            var length = row.length;
            if (length > max) {
                max = length;
            }
        });
        this.data.forEach(function (row) {
            var length = row.length;
            if (length < max) {
                row.length = max;
            }
        });
    };
    return Table;
}());
var Conditional = (function () {
    function Conditional() {
        this.use = [];
        this.if = [];
    }
    return Conditional;
}());
var Expression = (function () {
    function Expression(expression, columnIndex) {
        if (expression != null && columnIndex != null) {
            this.condition = expression;
            this.columnIndex = columnIndex;
        }
    }
    return Expression;
}());
var Profile = (function () {
    function Profile() {
    }
    return Profile;
}());
var ProfileMap = (function () {
    function ProfileMap() {
    }
    return ProfileMap;
}());
var AllowedExtractMethodsEnum;
(function (AllowedExtractMethodsEnum) {
    AllowedExtractMethodsEnum["FixedColumn"] = "FixedColumn";
    AllowedExtractMethodsEnum["ConditionalColumn"] = "ConditionalColumn";
    AllowedExtractMethodsEnum["Sequential"] = "Sequential";
    AllowedExtractMethodsEnum["CurrentColumn"] = "CurrentColumn";
    AllowedExtractMethodsEnum["HeaderRow"] = "HeaderRow";
})(AllowedExtractMethodsEnum || (AllowedExtractMethodsEnum = {}));
var AllowedTypes;
(function (AllowedTypes) {
    AllowedTypes["String"] = "String";
    AllowedTypes["Numeric"] = "Numeric";
    AllowedTypes["Float"] = "Float";
    AllowedTypes["DateTime"] = "DateTime";
    AllowedTypes["List"] = "List";
})(AllowedTypes || (AllowedTypes = {}));
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var ConditionalProfileMap = (function (_super) {
    __extends(ConditionalProfileMap, _super);
    function ConditionalProfileMap() {
        var _this = _super.call(this) || this;
        _this.conditional = new Conditional();
        return _this;
    }
    return ConditionalProfileMap;
}(ProfileMap));
var FixedColumnProfileMap = (function (_super) {
    __extends(FixedColumnProfileMap, _super);
    function FixedColumnProfileMap() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return FixedColumnProfileMap;
}(ProfileMap));
var ListTypeProfileMap = (function (_super) {
    __extends(ListTypeProfileMap, _super);
    function ListTypeProfileMap() {
        var _this = _super.call(this) || this;
        _this.extractMethod = "";
        return _this;
    }
    return ListTypeProfileMap;
}(ProfileMap));
var SequentialProfileMap = (function (_super) {
    __extends(SequentialProfileMap, _super);
    function SequentialProfileMap() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return SequentialProfileMap;
}(ProfileMap));
