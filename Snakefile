from Bio import SeqIO

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
