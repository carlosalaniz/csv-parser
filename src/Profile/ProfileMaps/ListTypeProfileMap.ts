class ListTypeProfileMap extends ProfileMap {
    extractMethod: string;
    extractPattern?: IRegularExpression;
    castType?: boolean;
    constructor() {
        super();
        this.extractMethod = "";
    }
}
