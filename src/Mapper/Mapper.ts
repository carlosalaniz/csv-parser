// tslint:disable: typedef
class Mapper {
  profile: Profile;
  table: Table;

  constructor(table: Table, profile: Profile) {
    this.table = table;
    this.profile = profile;
  }

  map() {
    const outputObjectArray = [];
    const map = this.profile.map;
    this.table.data.forEach((row, index) => {
      if (this.profile.skipRows.indexOf(index) > -1) {
        return;
      }
      const currentObject = {};
      for (const property in map) {
        if (map.hasOwnProperty(property)) {
          const propertyProfile = map[property];
          let value = null;
          switch (propertyProfile.extractMethod) {
            case AllowedExtractMethodsEnum.FixedColumn:
              value = this.getFixedValue(row, propertyProfile as FixedColumnProfileMap);
              break;
            case AllowedExtractMethodsEnum.ConditionalColumn:
              value = this.getConditionalValue(row, currentObject, propertyProfile as ConditionalProfileMap);
              break;
            case AllowedExtractMethodsEnum.Sequential:
              value = this.getSequentialValues(row, propertyProfile as SequentialProfileMap);
              break;
            case AllowedExtractMethodsEnum.HeaderRow:
            case AllowedExtractMethodsEnum.CurrentColumn:
              throw new Error(propertyProfile.extractMethod + " is not allowed in this context.");
            // throw will break
            default:
              throw new Error(propertyProfile.extractMethod + "is not a valid extract method.");
            // throw will break
          }
          currentObject[property] = value;
        }
      }
      outputObjectArray.push(currentObject);
    });
    return outputObjectArray;
  }

  private getFixedValue(row: any[], profile: FixedColumnProfileMap): any {
    const columnIndex = profile.columnIndex;
    if (columnIndex >= row.length) {
      throw new Error("profile,columnIndex: " + columnIndex + " is invalid.");
    }
    let value = row[columnIndex];
    if (profile.extractPattern !== undefined) {
      value = this.tryMatch(value, profile.extractPattern);
    }
    if (profile.castType) {
      value = this.tryCastType(value, profile.type);
    }
    return value;
  }

  private getSequentialValues(row: any[], profile: SequentialProfileMap): {}[] {
    const resultArray: {}[] = [];
    const startIndex = profile.columnIndexStart ? profile.columnIndexStart : 0;
    const endIndex = profile.columnIndexEnd ? profile.columnIndexEnd + 1 : row.length;
    for (let i = startIndex; i < endIndex; i++) {
      const columnValue = row[i];
      const headerValue = this.table.headerRow[i];
      const resultItem = {};
      for (const propertyName in profile.listType) {
        if (profile.listType.hasOwnProperty(propertyName)) {
          let value = null;
          const currentProfileMap: ListTypeProfileMap = profile.listType[propertyName];
          switch (currentProfileMap.extractMethod) {
            case AllowedExtractMethodsEnum.HeaderRow:
              value = headerValue;
              break;
            case AllowedExtractMethodsEnum.CurrentColumn:
              value = columnValue;
              break;
            default:
              throw new Error(
                "Extract method: " +
                  currentProfileMap.extractMethod +
                  " is not valid when used inside sequential mapping"
              );
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
  }

  private getConditionalValue(row: any[], localScope: {}, profile: ConditionalProfileMap): any {
    const conditional = profile.conditional;
    conditional.use.forEach(property => {
      if (!localScope.hasOwnProperty(property)) {
        throw new Error("Property: " + property + " not found. ");
      }
    });
    let value = null;
    let columnIndex = -1;
    let defaultValue = null;
    const expressions = conditional.if;
    for (let i = 0; i < expressions.length; i++) {
      const expression = expressions[i];
      if (expression.condition == null) {
        defaultValue = expression.defaultValue;
        break;
      }
      // confition is not null after this.
      if (expression.defaultValue != null) {
        throw new Error("defaultValue should only be defined with a null condition");
      }
      // prepare conditions
      let condition = expression.condition;
      conditional.use.forEach(property => {
        if (localScope.hasOwnProperty(property)) {
          condition = expression.condition.split(property).join("localScope." + property);
        }
      });

      // tslint:disable-next-line:no-eval
      const evalExpression = eval(condition);
      if (typeof evalExpression !== "boolean") {
        throw new Error("Invalid expression for conditional profile");
      }
      if (evalExpression) {
        columnIndex = expression.columnIndex;
        break;
      }
    }

    if (columnIndex > -1) {
      if (columnIndex >= row.length) {
        throw new Error("columnIndex: " + columnIndex + " is out of bound");
      }
      value = row[columnIndex];
    } else {
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
  }

  private tryCastType(value: any, type: string) {
    if (value === undefined) {
      return;
    }
    if (type === AllowedTypes.Numeric) {
      const parsedValue = parseInt(value, 10);
      if (isNaN(parsedValue)) {
        throw new Error(value + " is not a number");
      }
      return parsedValue;
    }
    if (type === AllowedTypes.Float) {
      const parsedValue = parseFloat(value);
      if (isNaN(parsedValue)) {
        throw new Error(value + " is not a float");
      }
      return parsedValue;
    }
    return value;
  }
  private tryMatch(value: any, rgx: IRegularExpression) {
    let regex = new RegExp(rgx.pattern, rgx.flag);
    let match = value.match(regex);
    if (match != null) {
      // todo: better way
      return match[0];
    } else {
      return null;
    }
  }
}
