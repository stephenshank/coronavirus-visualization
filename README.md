# coronavirus-visualization

## Installation

### Library

```
npm install coronavirus-visualization
```

### Development

```
git clone https://github.com/stephenshank/coronavirus-visualization
cd coronavirus-visualization
yarn
conda env create -f environment.yml
```

## Usage

### NPM Library

In an environment with SASS support:

```
import { render_fubar } from "coronavirus-visualization";
import "coronavirus-visualization/styles.scss";

render_fubar(
	"/path/to/fubar/json",
	"/path/to/full/fasta",
	"/path/to/pdb/file",
	"/path/to/index/map",
	"dom_element_id"
)
```

See `fubar-library-consumer` for a minimal working example.

### Pipeline

Place a concatenated codon alignment and tree at `public/input/$DATASET.fna` and a PDB file at `public/input/$DATASET.pdb` (and make a pull request!).

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