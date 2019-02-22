class Expression {
    constructor(expression?: string, columnIndex?: number) {
        if (expression != null && columnIndex != null) {
            this.condition = expression;
            this.columnIndex = columnIndex;
        }
    }
    condition?: string;
    columnIndex?: number;
    defaultValue?: any;
}
