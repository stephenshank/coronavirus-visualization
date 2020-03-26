import fastaParser from "alignment.js/helpers/fasta";
import _ from "underscore";

const threeToOne = {
  'CYS': 'C', 'ASP': 'D', 'SER': 'S', 'GLN': 'Q', 'LYS': 'K',
  'ILE': 'I', 'PRO': 'P', 'THR': 'T', 'PHE': 'F', 'ASN': 'N', 
  'GLY': 'G', 'HIS': 'H', 'LEU': 'L', 'ARG': 'R', 'TRP': 'W', 
  'ALA': 'A', 'VAL': 'V', 'GLU': 'E', 'TYR': 'Y', 'MET': 'M',
  'NAG': '*', 'FUL': '*'
};

function hex2rgb(hex) {
  const split = hex.split(','),
    r = +split[0].split('(')[1] / 256,
    g = +split[1] / 256,
    b = +split[2].split(')')[0] / 256;
    return [r, g, b];
}


function mapper(base_alignment, full_alignment) {
  base_alignment.sort((a,b) => a.header < b.header ? -1 : 1 );
  const base_hash = _.object(
      base_alignment.map(record => record.header),
      Array(base_alignment.number_of_sequences).fill(true)
    ),
    full_hash = _.object(
      full_alignment.map(record => record.header),
      full_alignment
    ),
    additional_records = full_alignment.filter(
      record => !base_hash[record.header]
    ),
    additional_indices = Array(additional_records.length).fill(0),
    index_map = [];
  var original_index = 0,
    full_index, row;
  for (full_index=0; full_index<full_alignment.number_of_sites; full_index++) {
    row = {};
    additional_records.forEach((record, i) => {
      const isnt_gap = record.seq[full_index] != '-';
      if(isnt_gap) {
        row[record.header + '_index'] = additional_indices[i]
        additional_indices[i] += 1;
      } else {
        row[record.header + '_index'] = '-'
      }
    });
    const agreement = base_alignment.map(record => {
      const full_record = full_hash[record.header];
      return record.seq[original_index] == full_record.seq[original_index];
    }).reduce((a,b) => a && b, true);
    if(agreement) {
      row.full_index = full_index;
      row.original_index = original_index;
      index_map.push(row);
      original_index += 1;
    }
  }
  return index_map;
}

export { 
  threeToOne,
  hex2rgb,
  mapper
};
