import { render_fubar } from "coronavirus-visualization";
import "coronavirus-visualization/styles.scss";

const div = document.createElement('div');
div.setAttribute('id', 'viz');
document.body.appendChild(div);

render_fubar(
  '/S.fna.FUBAR.json',
  '/S-full.fasta',
  '/S.pdb',
  '/S-map.csv',
  'viz'
);
