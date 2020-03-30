import csv

import numpy as np
from Bio import SeqIO
from Bio.PDB import PDBParser
from Bio.PDB.Polypeptide import three_to_one


def indicial_mapping(original, added, indicial_map):
  original_records = list(sorted(
    SeqIO.parse(original, 'fasta'),
    key=lambda record: record.name
  ))
  original_hash = { record.name: True for record in original_records }
  full_hash = SeqIO.to_dict(SeqIO.parse(added, 'fasta'))
  original_np = np.array([
    list(str(record.seq)) for record in original_records
  ], dtype='<U1')
  full_np = np.array([
    list(str(full_hash[record.name].seq)) for record in original_records
  ], dtype='<U1')
  additional_names = [
    record.name
    for name, record in full_hash.items()
    if not name in original_hash
  ]
  additional_headers = [name+'_index' for name in additional_names]

  csv_file = open(indicial_map, 'w')
  writer = csv.writer(csv_file)
  writer.writerow(['full_index', 'original_index'] + additional_headers)

  original_index = 0
  additional_indices = [0 for _ in additional_headers]
  for full_index in range(full_np.shape[1]):
    current_additional_indices = []
    for i, additional_index in enumerate(additional_indices):
      name = additional_names[i]
      record = full_hash[name]
      isnt_gap = record.seq[full_index] != '-'
      print(isnt_gap, additional_indices)
      if isnt_gap:
        current_additional_indices.append(additional_index)
        additional_indices[i] += 1
      else:
        current_additional_indices.append('-')
    if np.all(original_np[:, original_index] == full_np[:, full_index]):
      writer.writerow([full_index, original_index] + current_additional_indices)
      original_index += 1
  csv_file.close()


def translate(input_file, output_file):
  f = list(SeqIO.parse(input_file, 'fasta'))
  for record in f:
      record.seq = record.seq.translate(gap='-')
  SeqIO.write(f, output_file, 'fasta')


def extract_pdb_fasta(input_pdb, output_fasta):
  parser = PDBParser()
  structure = parser.get_structure('struct', input_pdb)[0]
  chain = structure['A']

  sequence = ''.join([
      three_to_one(pdb_residue.get_resname())
      for pdb_residue in chain.get_residues()
      if pdb_residue.get_resname() != 'NAG'
  ])
  with open(output_fasta, 'w') as f:
    f.write('>PDBStructure\n' + sequence)

rule meme:
  input:
    'public/input/{dataset}.fna'
  output:
    'public/output/{dataset}.fna.FUBAR.json'
  params:
    default='public/input/{dataset}.fna.FUBAR.json',
    cache='public/input/{dataset}.fna.FUBAR.cache',
  shell:
    '''
      hyphy meme --alignment {input}
      rm {params.cache}
      mv {params.default} {output}
    '''

rule codon_fasta:
  input:
    'public/input/{dataset}.fna'
  output:
    'public/output/{dataset}.fasta'
  shell:
    "sed '$d' {input} > {output}"

rule amino_acid_fasta:
  input:
    rules.codon_fasta.output[0]
  output:
    'public/output/{dataset}-AA.fasta'
  run:
    translate(input[0], output[0])

rule pdb_fasta:
  input:
    'public/input/{dataset}.pdb'
  output:
    'public/output/{dataset}-structure.fasta'
  run:
    extract_pdb_fasta(input[0], output[0])

rule full_alignment:
  input:
    msa=rules.amino_acid_fasta.output[0],
    pdb=rules.pdb_fasta.output[0]
  output:
    'public/output/{dataset}-full.fasta'
  shell:
    "mafft --add {input.pdb} {input.msa} > {output}"

rule full_dataset:
  input:
    rules.full_alignment.output[0],
    rules.meme.output[0],
  output:
    "public/output/{dataset}.txt"
  run:
    with open(output[0], 'w') as f:
      f.write('Ready')
