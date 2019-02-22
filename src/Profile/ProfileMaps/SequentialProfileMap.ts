class SequentialProfileMap extends ProfileMap {
    listType: {
        [key: string]: ListTypeProfileMap;
    };
    columnIndexStart?: number;
    columnIndexEnd?: number;
}
