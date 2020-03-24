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
  return [];
}

export { 
  threeToOne,
  hex2rgb,
  mapper
};
