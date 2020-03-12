import csv

import numpy as np
from Bio import SeqIO


def indicial_mapping(original, added, indicial_map):
  original_records = list(sorted(
    SeqIO.parse(original, 'fasta'),
    key=lambda record: record.name
  ))
  added_hash = SeqIO.to_dict(SeqIO.parse(added, 'fasta'))
  original_np = np.array([
    list(str(record.seq)) for record in original_records
  ], dtype='<U1')
  added_np = np.array([
    list(str(added_hash[record.name].seq)) for record in original_records
  ], dtype='<U1')

  csv_file = open(indicial_map, 'w')
  writer = csv.writer(csv_file)
  writer.writerow(['current_index', 'original_index'])

  original_index = 0
  for added_index in range(added_np.shape[1]):
    if np.all(original_np[:, original_index] == added_np[:, added_index]):
      writer.writerow([added_index, original_index])
      original_index += 1
  csv_file.close()

def translate(input_file, output_file):
  f = list(SeqIO.parse(input_file, 'fasta'))
  for record in f:
      record.seq = record.seq.translate(gap='-')
  SeqIO.write(f, output_file, 'fasta')

rule fubar:
  input:
    'public/input/{dataset}.fna'
  output:
    'public/output/{dataset}.fna.FUBAR.json'
  params:
    default='public/input/{dataset}.fna.FUBAR.json',
    cache='public/input/{dataset}.fna.FUBAR.cache',
  shell:
    '''
      hyphy fubar --alignment {input}
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

rule full_alignment:
  input:
    msa=rules.amino_acid_fasta.output[0],
    pdb='public/input/6vxx_entry.fasta'
  output:
    'public/output/{dataset}-full.fasta'
  shell:
    "mafft --add {input.pdb} {input.msa} > {output}"

rule indicial_map:
  input:
    original=rules.amino_acid_fasta.output[0],
    added=rules.full_alignment.output[0]
  output:
    'public/output/{dataset}-map.csv'
  run:
    indicial_mapping(input.original, input.added, output[0])

rule full_dataset:
  input:
    rules.full_alignment.output[0],
    rules.fubar.output[0],
    rules.indicial_map.output[0]
  output:
    "public/output/{dataset}.txt"
  run:
    with open(output[0], 'w') as f:
      f.write('Ready')
