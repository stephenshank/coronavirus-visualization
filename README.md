# coronavirus-visualization

## Installation

```
git clone https://github.com/stephenshank/coronavirus-visualization
cd coronavirus-visualization
yarn
conda env create -f environment.yml
```

## Usage

### Pipeline

Place a concatenated codon alignment and tree at `public/input/$DATASET.fna` (and make a pull request!).

Run:
```
snakemake public/output/$DATASET.txt
```

This is a dummy endpoint that will ensure all necessary file are created, running the following pipeline:

<img src="./pipeline.svg">

### Development

Run

```
yarn develop
```

and visit `localhost:$PORT/$DATASET`.

## Deployment

Set environment variable `$PORT` and run

```
npx webpack
node server.js
```