class ConditionalProfileMap extends ProfileMap {
    constructor() {
        super();
        this.conditional = new Conditional();
    }
    conditional: Conditional;
    extractPattern?: IRegularExpression;
    castType?: boolean;
}
