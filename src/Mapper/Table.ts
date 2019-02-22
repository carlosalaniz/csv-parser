// tslint:disable: typedef
class Table {
  data: string[][] = [];
  get headerRow() {
    if (this.data.length > 0) {
      return this.data[0];
    }
    return [];
  }
  get tableBody() {
    if (this.data.length > 0) {
      return this.data.slice(1);
    }
    return [];
  }
  pad() {
    let max = -1;
    this.data.forEach(row => {
      const length = row.length;
      if (length > max) {
        max = length;
      }
    });
    this.data.forEach(row => {
      const length = row.length;
      if (length < max) {
        row.length = max;
      }
    });
  }
}
