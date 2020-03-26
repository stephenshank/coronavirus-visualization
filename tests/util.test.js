import { mapper } from "../src/util";
import fastaParser from "alignment.js/helpers/fasta";
import * as d3 from "d3";
import _ from "underscore";
const fs = require('fs');

test("indicial mapping is correct", () => {
  const map_path = './fubar-library-consumer/public/S-map.csv',
    raw_map = fs.readFileSync(map_path).toString(),
    correct_csv = d3.csvParse(raw_map),
    base_path = './public/input/S-AA.fasta',
    base_fasta = fs.readFileSync(base_path).toString(),
    base = fastaParser(base_fasta),
    full_path = './public/input/S-full.fasta',
    full_fasta = fs.readFileSync(full_path).toString(),
    full = fastaParser(full_fasta),
    m = mapper,
    mapped_csv = mapper(base, full),
    converted = mapped_csv
      .map(row => _.mapObject(row, v => String(v))),
    agreement = _.isEqual(converted, correct_csv);
  expect(agreement).toBe(true);
});
