import { render_meme } from "coronavirus-visualization";
import "coronavirus-visualization/styles.scss";

const div = document.createElement('div');
div.setAttribute('id', 'viz');
document.body.appendChild(div);

render_meme(
  '/S-032420.fna.MEME.json',
  '/S-032420-full.fasta',
  '/S-032420-AA.fasta',
  '/S.pdb',
  'viz'
);
