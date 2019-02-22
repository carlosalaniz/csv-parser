// tslint:disable: typedef
// tslint:disable: no-string-literal

function MapCsv(csvContents, mapDef) {
    let tableData = new Table();
    let trimmedContents = csvContents.trim();
    trimmedContents.split("\n").forEach(row => {
        tableData.data.push(row.split(","));
    });
    tableData.pad();
    let mapper = new Mapper(tableData, mapDef);
    return mapper.map();
}

if (!window["MapCsv"]) {
    window["MapCsv"] = MapCsv;
}
