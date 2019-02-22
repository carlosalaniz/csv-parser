// tslint:disable: typedef
function EnumToList(myEnum): string[] {
    const result = [];
    for (const enumMember in myEnum) {
        if (myEnum.hasOwnProperty(enumMember)) {
            result.push(enumMember);
        }
    }
    return result;
}
