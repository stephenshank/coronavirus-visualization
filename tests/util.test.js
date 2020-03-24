import { mapper } from "../src/util";
import fastaParser, { fnaParser } from "alignment.js/helpers/fasta";
import * as d3 from "d3";
import _ from "underscore";
const fs = require('fs');

test("indicial mapping is correct", () => {
  const map_path = './fubar-library-consumer/public/S-map.csv',
    raw_map = fs.readFileSync(map_path).toString(),
    correct_csv = d3.csvParse(raw_map),
    base_path = './public/input/S.fna',
    fna = fs.readFileSync(base_path).toString(),
    base = fnaParser(fna).sequence_data,
    full_path = './public/input/S-full.fasta',
    fasta = fs.readFileSync(full_path).toString(),
    full = fastaParser(fasta),
    mapped_csv = mapper(base, full),
    agreement = _.isEqual(correct_csv, mapped_csv);
  expect(agreement).toBe(true);
});
